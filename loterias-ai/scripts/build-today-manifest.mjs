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
function ticketLines(d){
  const raw=d?.prediction?.tickets||d?.portfolio||d?.tickets||d?.equivalents||null;
  if(Array.isArray(raw)) return raw.map((x,i)=>{
    if(Array.isArray(x)) return {label:`Apuesta ${i+1}`,copy:x.join(' '),display:x.join(' · ')};
    if(Array.isArray(x?.numbers)) return {label:`Apuesta ${i+1}`,copy:x.numbers.join(' '),display:x.numbers.join(' · '),meta:x.historicalNearCount!=null?`${x.historicalNearCount}× 5/6 históricos`:null};
    if(Array.isArray(x?.signs)) return {label:`Columna ${i+1}`,copy:`${x.signs.join(' ')}${x.pleno15?` | P15 ${x.pleno15}`:''}`,display:x.signs.join(' · '),meta:x.pleno15?`P15 ${x.pleno15}`:null};
    return null;
  }).filter(Boolean);
  if(Array.isArray(d?.numbers)) return [{label:'Apuesta 1',copy:d.numbers.join(' ')+(d.key!=null?` | clave ${d.key}`:''),display:d.numbers.join(' · '),meta:d.key!=null?`Clave ${d.key}`:null}];
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
  const theoreticalCostEUR=money(d?.theoreticalCostEUR,d?.theoreticalStakeEUR,d?.config?.theoreticalStakeEUR,d?.stakeEUR);
  const unitCostEUR=money(d?.unitCostEUR,d?.config?.unitStakeEUR,d?.pricePerColumnEUR, lines.length?theoreticalCostEUR/lines.length:0);
  const purpose=String(d?.purpose||'');
  const alternativeNotAdditive=Boolean(d?.config?.alternativeNotAdditive||/never additive|not additive|alternative/i.test(purpose));
  const prospectScore=(kind==='PROSPECTIVE'?1000:0)+(d?.evidence?.prospectiveReplication?100:0)+(d?.status?.includes?.('FROZEN')?20:0)-(theoreticalCostEUR*2)+(d?.evidence?.confirmatory===false?-5:0);
  return {gameId:game,targetDate:date,title:titleOf(game,d,file),version:d?.version||null,status:d?.status||kind,kind,source:`../${filePath.replace(`${ROOT}/`,'')}`,generatedAt:d?.generatedAt||d?.frozenAt||null,theoreticalCostEUR,unitCostEUR,lines,pool,alternativeNotAdditive,realMoneyPass:d?.realMoneyPass===true,realStakeEUR:money(d?.realStakeEUR),purpose:purpose||null,prospectScore};
}

const today=process.env.TODAY_OVERRIDE||madridDate();
const items=[];
for(const s of SOURCES){if(!fs.existsSync(s.dir))continue;for(const name of fs.readdirSync(s.dir).filter(usableFile)){const x=normalize(`${s.dir}/${name}`,s.kind,today);if(x)items.push(x)}}
const groups={};
for(const x of items)(groups[x.gameId]??=[]).push(x);
const games=Object.entries(groups).map(([gameId,arr])=>{
  arr.sort((a,b)=>b.prospectScore-a.prospectScore||String(b.generatedAt||'').localeCompare(String(a.generatedAt||''))||a.source.localeCompare(b.source));
  const primary=arr[0];
  const alternatives=arr.slice(1).map(x=>({...x,alternativeNotAdditive:true}));
  return {gameId,targetDate:today,primary,alternatives,alternativeCount:alternatives.length,costRule:'ALTERNATIVES_NOT_ADDITIVE',displayCostEUR:primary.theoreticalCostEUR};
}).sort((a,b)=>a.gameId.localeCompare(b.gameId));
const manifest={generatedAt:new Date().toISOString(),timeZone:'Europe/Madrid',today,strictToday:true,staleFallbackAllowed:false,dedupeKey:'gameId+targetDate',games,totalGames:games.length,policy:{oneVisibleCardPerGame:true,alternativesNotAdditive:true,showYesterdayInToday:false,realMoneyPass:false}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({today,totalGames:games.length,games:games.map(g=>({gameId:g.gameId,primary:g.primary.version,cost:g.displayCostEUR,alternatives:g.alternativeCount}))}));