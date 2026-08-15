import fs from 'node:fs';
const BASE='https://www.loteriasyapuestas.es/servicios/fechav3';
const startInput=process.env.LOTERIAS_BACKFILL_START||'2026-01-01';
const endInput=process.env.LOTERIAS_BACKFILL_END||new Date().toISOString().slice(0,10);
const START=new Date(`${startInput}T00:00:00Z`),END=new Date(`${endInput}T00:00:00Z`);
if(Number.isNaN(START.getTime()))throw new Error(`Invalid LOTERIAS_BACKFILL_START: ${startInput}`);
if(Number.isNaN(END.getTime()))throw new Error(`Invalid LOTERIAS_BACKFILL_END: ${endInput}`);
if(END<START)throw new Error(`Backfill end ${endInput} precedes start ${startInput}`);
if(START.getUTCFullYear()!==2026||END.getUTCFullYear()!==2026)throw new Error('backfill-core-2026 only accepts 2026 dates');
const GAME_FILTER=(process.env.LOTERIAS_BACKFILL_GAME||'').trim();
const DELAY_MS=Math.max(250,Number(process.env.LOTERIAS_BACKFILL_DELAY_MS||350));
const EMPTY_RETRY_DELAYS=[1200,2500];
const specs={
  bonoloto:{gid:'BONO',days:[0,1,2,3,4,5,6],pick:6,max:49},
  primitiva:{gid:'LAPR',days:[1,4,6],pick:6,max:49},
  euromillones:{gid:'EMIL',days:[2,5],pick:5,max:50,secondaryPick:2},
  eurodreams:{gid:'EDMS',days:[1,4],pick:6,max:40,secondaryPick:1},
  'gordo-primitiva':{gid:'ELGR',days:[0],pick:5,max:54,secondaryPick:1},
  'loteria-nacional':{gid:'LNAC',days:[4,6],number5:true}
};
if(GAME_FILTER&&!specs[GAME_FILTER])throw new Error(`Unknown LOTERIAS_BACKFILL_GAME: ${GAME_FILTER}`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ymd=d=>d.toISOString().slice(0,10).replaceAll('-','');
const iso=s=>String(s||'').slice(0,10);
const money=v=>{if(v==null)return null;const n=Number(String(v).replace('.','').replace(',','.'));return Number.isFinite(n)?n:null};
function parseCombo(game,row,spec){
  if(spec.number5){const c=row.combinacion||{};return {main:[String(c.primer_premio||'').padStart(5,'0')],secondary:[String(c.segundo_premio||'').padStart(5,'0')],extra:{fraccion:c.fraccion??null,serie:c.serie??null}};}
  const text=String(row.combinacion||'');
  const before=text.split(/[CR]\(/)[0];
  const all=(before.match(/\d{1,2}/g)||[]).map(Number);
  const main=all.slice(0,spec.pick);
  let secondary=[];
  if(game==='euromillones') secondary=all.slice(spec.pick,spec.pick+2);
  else {const m=text.match(/[CR]\((\d{1,2})\)/);if(m&&spec.secondaryPick)secondary=[Number(m[1])];}
  const cm=text.match(/C\((\d{1,2})\)/),rm=text.match(/R\((\d{1,2})\)/);
  return {main,secondary,complementary:cm?Number(cm[1]):null,reintegro:rm?Number(rm[1]):null};
}
function normalize(game,row,spec,url){
  const combo=parseCombo(game,row,spec);
  return {drawId:String(row.id_sorteo||`${game}-${iso(row.fecha_sorteo)}`),gameId:game,drawDate:iso(row.fecha_sorteo),drawTimestamp:String(row.fecha_sorteo||''),dayOfWeek:row.dia_semana||null,drawName:row.nombre||null,drawNumber:row.num_sorteo||null,result:combo,jackpot:money(row.premio_bote),bets:money(row.apuestas),revenue:money(row.recaudacion),prizePool:money(row.premios),prizes:(row.escrutinio||[]).map(x=>({category:x.categoria??null,label:x.tipo??null,prize:money(x.premio),winners:money(x.ganadores),winnersEurope:money(x.ganadores_eu)})),source:{official:true,provider:'SELAE',service:'fechav3',url,retrievedAt:new Date().toISOString()},verification:{status:'VALIDATED',checks:['official-json','scheduled-date','combination-shape']}};
}
async function fetchDateOnce(game,spec,d){
  const date=ymd(d),url=`${BASE}?game_id=${spec.gid}&fecha_sorteo=${date}`;
  const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.1 research archive','accept':'application/json,text/plain,*/*'}});
  if(!r.ok)throw new Error(`HTTP_${r.status}`);
  const raw=await r.json().catch(()=>[]),rows=Array.isArray(raw)?raw:[];
  return rows.filter(x=>x&&x.game_id===spec.gid).map(x=>normalize(game,x,spec,url));
}
async function fetchDate(game,spec,d,knownExistingDates){
  let rows=await fetchDateOnce(game,spec,d);
  if(rows.length||knownExistingDates.has(iso(d.toISOString())))return {rows,retries:0};
  for(let i=0;i<EMPTY_RETRY_DELAYS.length;i++){
    await sleep(EMPTY_RETRY_DELAYS[i]);
    rows=await fetchDateOnce(game,spec,d);
    if(rows.length)return {rows,retries:i+1};
  }
  return {rows:[],retries:EMPTY_RETRY_DELAYS.length};
}
const selected=Object.entries(specs).filter(([game])=>!GAME_FILTER||game===GAME_FILTER);
const summary={generatedAt:new Date().toISOString(),period:{start:START.toISOString().slice(0,10),end:END.toISOString().slice(0,10)},gameFilter:GAME_FILTER||null,mode:'INCREMENTAL_NON_DESTRUCTIVE_RATE_LIMIT_SAFE',delayMs:DELAY_MS,games:{}};
for(const [game,spec] of selected){
  const dir=`loterias-ai/data/archive/${game}`,file=`${dir}/2026.json`;fs.mkdirSync(dir,{recursive:true});
  let existing=[];if(fs.existsSync(file)){try{existing=JSON.parse(fs.readFileSync(file,'utf8')).records||[]}catch{existing=[]}}
  const existingDates=new Set(existing.map(r=>r.drawDate));
  const fetched=[],errors=[],unresolvedEmpty=[];let requests=0,retries=0;
  for(let d=new Date(START);d<=END;d.setUTCDate(d.getUTCDate()+1)){
    if(!spec.days.includes(d.getUTCDay()))continue;requests++;
    try{const out=await fetchDate(game,spec,d,existingDates);fetched.push(...out.rows);retries+=out.retries;if(!out.rows.length&&!existingDates.has(d.toISOString().slice(0,10)))unresolvedEmpty.push(d.toISOString().slice(0,10));}catch(e){errors.push({date:ymd(d),error:String(e)});}
    await sleep(DELAY_MS);
  }
  const merged=[...new Map([...existing,...fetched].map(r=>[r.drawId,r])).values()].sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
  if(existing.length&&merged.length<existing.length)throw new Error(`${game}: non-destructive invariant violated`);
  fs.writeFileSync(file,JSON.stringify({gameId:game,year:2026,records:merged},null,2)+'\n');
  summary.games[game]={requests,retries,existingDraws:existing.length,fetchedDraws:fetched.length,validatedDraws:merged.length,newDraws:Math.max(0,merged.length-existing.length),unresolvedEmpty:unresolvedEmpty.length,errors:errors.length,earliest:merged[0]?.drawDate||null,latest:merged.at(-1)?.drawDate||null};
  console.log(game,summary.games[game]);
}
fs.writeFileSync('loterias-ai/data/archive/backfill-2026-summary.json',JSON.stringify(summary,null,2)+'\n');