import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const SOURCES=[
  {dir:`${ROOT}/data/prospective`,kind:'PROSPECTIVE'},
  {dir:`${ROOT}/data/shadow`,kind:'SHADOW'}
];
const OUT=`${ROOT}/data/ui/today-manifest.json`;

function madridDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=t=>parts.find(p=>p.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function inferGame(file,d){
  if(d?.gameId) return String(d.gameId).toLowerCase();
  const f=file.toLowerCase();
  if(f.includes('bonoloto')) return 'bonoloto';
  if(f.includes('euromillones')) return 'euromillones';
  if(f.includes('eurodream')) return 'eurodreams';
  if(f.includes('primitiva')) return 'primitiva';
  if(f.includes('quinigol')) return 'quinigol';
  if(f.includes('quiniela')) return 'quiniela';
  if(f.includes('gordo')) return 'gordo';
  if(f.includes('loteria-nacional')) return 'loteria-nacional';
  return null;
}
function targetDate(d,file){
  const vals=[d?.targetDrawDate,d?.targetDate,d?.config?.target,d?.dataBoundary?.targetDraw,d?.target?.drawDate,d?.drawDate,d?.date];
  for(const v of vals) if(typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)) return v;
  const m=file.match(/20\d\d-\d\d-\d\d/); return m?.[0]||null;
}
function money(...xs){for(const x of xs){const n=Number(x);if(Number.isFinite(n)&&n>=0)return n}return 0}
function numberLine(numbers,stars,i,meta=null){
  const nums=numbers.map(Number), ss=Array.isArray(stars)?stars.map(Number):[];
  const starText=ss.length?` | Estrellas ${ss.join(' ')}`:'';
  const starDisplay=ss.length?` · ⭐ ${ss.join(' · ')}`:'';
  return {label:`Apuesta ${i+1}`,copy:`${nums.join(' ')}${starText}`,display:`${nums.join(' · ')}${starDisplay}`,meta:ss.length?['5 números + 2 estrellas',meta].filter(Boolean).join(' · '):meta};
}
function ticketLines(d){
  const raw=d?.prediction?.tickets||d?.portfolio||d?.tickets||d?.equivalents||null;
  if(Array.isArray(raw)) return raw.map((x,i)=>{
    if(Array.isArray(x)) return {label:`Apuesta ${i+1}`,copy:x.join(' '),display:x.join(' · ')};
    if(Array.isArray(x?.numbers)) return numberLine(x.numbers,x.stars,i,x.historicalNearCount!=null?`${x.historicalNearCount}× 5/6 históricos`:null);
    if(Array.isArray(x?.signs)) return {label:`Columna ${i+1}`,copy:`${x.signs.join(' ')}${x.pleno15?` | P15 ${x.pleno15}`:''}`,display:x.signs.join(' · '),meta:x.pleno15?`P15 ${x.pleno15}`:null};
    return null;
  }).filter(Boolean);
  if(Array.isArray(d?.numbers)) return [numberLine(d.numbers,d.stars,0,d.key!=null?`Clave ${d.key}`:null)];
  if(Array.isArray(d?.prediction?.numbers)) return [numberLine(d.prediction.numbers,d.prediction.stars,0)];
  return [];
}
function poolOf(d){const p=d?.prediction?.pool||d?.pool||d?.sources?.v175?.pool;return Array.isArray(p)?p:null}
function titleOf(game,d,file){
  const v=d?.version||file.match(/v\d+[a-z]?/i)?.[0]||'';
  const labels={bonoloto:'Bonoloto',primitiva:'Primitiva',euromillones:'Euromillones',eurodreams:'EuroDreams',gordo:'El Gordo',quiniela:'Quiniela',quinigol:'Quinigol','loteria-nacional':'Lotería Nacional'};
  return `${labels[game]||game}${v?` · MetaPleno ${v}`:''}`;
}
function usableFile(name){return name.endsWith('.json')&&!/(evaluation|settlement|status|specs?|timing|validation|audit|scorecard|official)/i.test(name)}
function normalize(filePath,kind,today){
  let d; try{d=JSON.parse(fs.readFileSync(filePath,'utf8'))}catch{return null}
  const file=path.basename(filePath),game=inferGame(file,d),date=targetDate(d,file);
  if(!game||date!==today) return null;
  if(d?.dataBoundary?.targetResultObserved===true||d?.targetResultObserved===true) return null;
  const lines=ticketLines(d),pool=poolOf(d);
  if(!lines.length&&!pool&&game!=='quiniela') return null;
  let theoreticalCostEUR=money(d?.theoreticalCostEUR,d?.theoreticalStakeEUR,d?.config?.theoreticalStakeEUR,d?.stakeEUR);
  let unitCostEUR=money(d?.unitCostEUR,d?.config?.unitStakeEUR,d?.pricePerColumnEUR, lines.length?theoreticalCostEUR/lines.length:0);
  if(game==='bonoloto'&&Array.isArray(pool)&&pool.length===8&&theoreticalCostEUR===0){theoreticalCostEUR=14;if(unitCostEUR===0)unitCostEUR=.5}
  const laboratoryCostEUR=theoreticalCostEUR;
  const realMoneyPass=d?.realMoneyPass===true;
  const realStakeEUR=money(d?.realStakeEUR);
  const authorizedCostEUR=realMoneyPass?realStakeEUR:0;
  const purpose=String(d?.purpose||'');
  const alternativeNotAdditive=Boolean(d?.config?.alternativeNotAdditive||/never additive|not additive|alternative/i.test(purpose));
  const prospectScore=(kind==='PROSPECTIVE'?1000:0)+(d?.evidence?.prospectiveReplication?100:0)+(d?.status?.includes?.('FROZEN')?20:0)-(laboratoryCostEUR*2)+(d?.evidence?.confirmatory===false?-5:0);
  return {gameId:game,targetDate:date,title:titleOf(game,d,file),version:d?.version||null,status:d?.status||kind,kind,source:`../${filePath.replace(`${ROOT}/`,'')}`,generatedAt:d?.generatedAt||d?.frozenAt||null,theoreticalCostEUR:authorizedCostEUR,laboratoryCostEUR,authorizedCostEUR,unitCostEUR,lines,pool,alternativeNotAdditive,realMoneyPass,realStakeEUR,purpose:purpose||null,prospectScore};
}

function splitCopy(line){
  const [base,...rest]=String(line?.copy||'').split('|');
  return {base:base.trim().replace(/\s+/g,' '),extra:rest.join('|').trim().replace(/\s+/g,' ')};
}
function sameBaseLines(a,b){
  if(!Array.isArray(a?.lines)||!Array.isArray(b?.lines)||a.lines.length!==b.lines.length||!a.lines.length)return false;
  return a.lines.every((line,i)=>splitCopy(line).base===splitCopy(b.lines[i]).base);
}
function primaryCompletesSecondary(primary,secondary){
  if(!sameBaseLines(primary,secondary))return false;
  let gainedInformation=false;
  for(let i=0;i<primary.lines.length;i++){
    const p=splitCopy(primary.lines[i]),s=splitCopy(secondary.lines[i]);
    if(s.extra&&p.extra!==s.extra)return false;
    if(!s.extra&&p.extra)gainedInformation=true;
  }
  return gainedInformation;
}

const today=process.env.TODAY_OVERRIDE||madridDate();
const items=[];
for(const s of SOURCES){if(!fs.existsSync(s.dir))continue;for(const name of fs.readdirSync(s.dir).filter(usableFile)){const x=normalize(`${s.dir}/${name}`,s.kind,today);if(x)items.push(x)}}
const groups={};
for(const x of items)(groups[x.gameId]??=[]).push(x);
let supersededTotal=0;
let hiddenSecondaryTotal=0;
const games=Object.entries(groups).map(([gameId,arr])=>{
  arr.sort((a,b)=>b.prospectScore-a.prospectScore||String(b.generatedAt||'').localeCompare(String(a.generatedAt||''))||a.source.localeCompare(b.source));
  const primary=arr[0];
  const secondary=arr.slice(1);
  const superseded=secondary.filter(x=>primaryCompletesSecondary(primary,x));
  supersededTotal+=superseded.length;
  const secondaryResearch=secondary.filter(x=>!primaryCompletesSecondary(primary,x));
  hiddenSecondaryTotal+=secondaryResearch.length;
  return {gameId,targetDate:today,primary,alternatives:[],alternativeCount:0,hiddenSecondaryResearchCount:secondaryResearch.length,supersededCount:superseded.length,costRule:'ONE_VISIBLE_DECISION_ONLY',displayCostEUR:primary.authorizedCostEUR};
}).sort((a,b)=>a.gameId.localeCompare(b.gameId));
const manifest={generatedAt:new Date().toISOString(),timeZone:'Europe/Madrid',today,strictToday:true,staleFallbackAllowed:false,dedupeKey:'gameId+targetDate',games,totalGames:games.length,supersededTotal,hiddenSecondaryTotal,policy:{oneVisibleCardPerGame:true,secondaryResearchHiddenFromToday:true,alternativesNotAdditive:true,supersededCompletionsHidden:true,showYesterdayInToday:false,realMoneyPass:false,costDisplay:'AUTHORIZED_ONLY',laboratoryCostSeparate:true}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({today,totalGames:games.length,supersededTotal,hiddenSecondaryTotal,games:games.map(g=>({gameId:g.gameId,primary:g.primary.version,authorizedCost:g.displayCostEUR,laboratoryCost:g.primary.laboratoryCostEUR,hiddenSecondary:g.hiddenSecondaryResearchCount,superseded:g.supersededCount}))}));
