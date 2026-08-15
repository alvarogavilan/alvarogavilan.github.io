import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/data';
const POLICY=JSON.parse(fs.readFileSync(`${ROOT}/treasury/global-budget-policy.json`,'utf8'));
const OUT=`${ROOT}/research/meta-pleno-v166-global-budget-engine.json`;
const SOURCES=[`${ROOT}/shadow`,`${ROOT}/prospective`];

function files(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?files(p):(e.isFile()&&e.name.endsWith('.json')?[p]:[]);
  });
}
function deepFind(o,keys){
  if(!o||typeof o!=='object') return undefined;
  for(const k of keys) if(Object.prototype.hasOwnProperty.call(o,k)&&typeof o[k]==='number'&&Number.isFinite(o[k])) return o[k];
  for(const v of Object.values(o)){
    const x=deepFind(v,keys); if(x!==undefined) return x;
  }
}
function findDate(o,filename){
  const candidates=['targetDrawDate','targetDraw','drawDate','date','targetDate'];
  const walk=x=>{
    if(!x||typeof x!=='object') return undefined;
    for(const k of candidates){const v=x[k]; if(typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)) return v;}
    for(const v of Object.values(x)){const r=walk(v);if(r)return r;}
  };
  const d=walk(o); if(d) return d;
  return filename.match(/20\d\d-\d\d-\d\d/)?.[0]||null;
}
function gameFrom(file,o){
  if(typeof o?.gameId==='string') return o.gameId.toLowerCase();
  const n=path.basename(file).toLowerCase();
  return ['bonoloto','primitiva','euromillones','eurodreams','el-gordo','gordo','quiniela','quinigol','loteria-nacional'].find(x=>n.includes(x))||'unknown';
}
function evidenceTier(o,file){
  const s=JSON.stringify(o).toUpperCase();
  if(s.includes('FROZEN_BEFORE_TARGET_RESULT')||s.includes('PROSPECTIVE')) return 'PROSPECTIVE';
  if(s.includes('POST_FREEZE')) return 'POST_FREEZE';
  if(file.includes('/shadow/')) return 'SHADOW';
  return 'RESEARCH';
}
const stakeKeys=['theoreticalStakeEUR','costEUR','stakeEUR','totalCostEUR','budgetEUR','theoreticalCostEUR'];
const inventory=[];
for(const file of SOURCES.flatMap(files)){
  let o;try{o=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
  const stake=deepFind(o,stakeKeys);
  const targetDate=findDate(o,file);
  const game=gameFrom(file,o);
  inventory.push({file,game,targetDate,theoreticalStakeEUR:stake??null,evidenceTier:evidenceTier(o,file),realMoneyPass:o?.realMoneyPass===true});
}

const groups=new Map();
for(const x of inventory){
  const key=`${x.game}|${x.targetDate||'NO_DATE'}`;
  if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(x);
}
const drawSlots=[...groups.entries()].map(([key,items])=>{
  const stakes=items.map(x=>x.theoreticalStakeEUR).filter(Number.isFinite);
  const tiers=[...new Set(items.map(x=>x.evidenceTier))];
  return {key,game:items[0].game,targetDate:items[0].targetDate,alternatives:items.length,evidenceTiers:tiers,minTheoreticalStakeEUR:stakes.length?Math.min(...stakes):null,maxTheoreticalStakeEUR:stakes.length?Math.max(...stakes):null,anyRealMoneyPass:items.some(x=>x.realMoneyPass),files:items.map(x=>x.file)};
}).sort((a,b)=>(a.targetDate||'9999').localeCompare(b.targetDate||'9999')||a.game.localeCompare(b.game));

const scenarios=POLICY.researchBudgetScenariosEUR.map(monthly=>{
  const preferred=POLICY.limits.preferredPerSelectedGameDrawEUR;
  const hard=POLICY.limits.hardMaxPerGameDrawEUR;
  return {
    monthlyBudgetEUR:monthly,
    maxSelectedDrawsAtPreferredStake:Math.floor(monthly/preferred),
    maxSelectedDrawsAtHardCeiling:Math.floor(monthly/hard),
    averageWeeklyBudgetEUR:+(monthly/4.345).toFixed(2),
    averageDailyBudgetEUR:+(monthly/30.4375).toFixed(2)
  };
});

const out={
  generatedAt:new Date().toISOString(),version:'v166',family:'GLOBAL_PORTFOLIO_CAPITAL_EFFICIENCY',
  methodology:'Inventory all SHADOW/PROSPECTIVE artifacts, deduplicate by game+target draw, and treat multiple strategies for one draw as alternatives rather than additive stakes. No real-money allocation is activated; monthly scenarios are capacity simulations only.',
  policy:POLICY,
  inventorySummary:{artifacts:inventory.length,deduplicatedGameDrawSlots:drawSlots.length,duplicateAlternatives:inventory.length-drawSlots.length,realMoneyApprovedArtifacts:inventory.filter(x=>x.realMoneyPass).length},
  drawSlots,scenarios,
  operationalDecision:'NO_REAL_MONEY_UNTIL_EXPLICIT_GLOBAL_MONTHLY_CAP_AND_EVIDENCE_GATE',
  realMoneyPass:false,realStakeEUR:0
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.inventorySummary));
