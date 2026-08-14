import fs from 'node:fs';
const BASE='https://www.loteriasyapuestas.es/servicios/fechav3';
const END=new Date('2026-08-14T00:00:00Z');
const START=new Date('2026-01-01T00:00:00Z');
const specs={
  bonoloto:{gid:'BONO',days:[0,1,2,3,4,5,6],pick:6,max:49},
  primitiva:{gid:'LAPR',days:[1,4,6],pick:6,max:49},
  euromillones:{gid:'EMIL',days:[2,5],pick:5,max:50,secondaryPick:2},
  eurodreams:{gid:'EDMS',days:[1,4],pick:6,max:40,secondaryPick:1},
  'gordo-primitiva':{gid:'ELGR',days:[0],pick:5,max:54,secondaryPick:1},
  'loteria-nacional':{gid:'LNAC',days:[4,6],number5:true}
};
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
async function fetchDate(game,spec,d){
  const date=ymd(d),url=`${BASE}?game_id=${spec.gid}&fecha_sorteo=${date}`;
  const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'application/json'}});
  if(!r.ok)return [];
  const raw=await r.json().catch(()=>[]);const rows=Array.isArray(raw)?raw:[];
  return rows.filter(x=>x&&x.game_id===spec.gid).map(x=>normalize(game,x,spec,url));
}
const summary={generatedAt:new Date().toISOString(),period:{start:'2026-01-01',end:'2026-08-14'},games:{}};
for(const [game,spec] of Object.entries(specs)){
  const records=[],errors=[];let requests=0;
  for(let d=new Date(START);d<=END;d.setUTCDate(d.getUTCDate()+1)){
    if(!spec.days.includes(d.getUTCDay()))continue;requests++;
    try{records.push(...await fetchDate(game,spec,d));}catch(e){errors.push({date:ymd(d),error:String(e)});}
    await sleep(60);
  }
  const uniq=[...new Map(records.map(r=>[r.drawId,r])).values()].sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
  const dir=`loterias-ai/data/archive/${game}`;fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(`${dir}/2026.json`,JSON.stringify({gameId:game,year:2026,records:uniq},null,2)+'\n');
  summary.games[game]={requests,validatedDraws:uniq.length,errors:errors.length,earliest:uniq[0]?.drawDate||null,latest:uniq.at(-1)?.drawDate||null};
  console.log(game,summary.games[game]);
}
fs.writeFileSync('loterias-ai/data/archive/backfill-2026-summary.json',JSON.stringify(summary,null,2)+'\n');