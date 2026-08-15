import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const TARGET='2026-08-16';
const REQUIRED_LATEST='2026-08-15';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
const POLICY='loterias-ai/config/prospective-freeze-policy.json';
const OUT='loterias-ai/data/prospective/bonoloto-v175-v172-compressed-2eur-2026-08-16.json';
if(!fs.existsSync(SRC)) throw new Error('v157 dependency required');
if(!fs.existsSync(POLICY)) throw new Error('prospective freeze timing policy required');

const policy=JSON.parse(fs.readFileSync(POLICY,'utf8'));
const gamePolicy=policy.games?.bonoloto;
if(!gamePolicy) throw new Error('Bonoloto freeze policy missing');
const now=new Date();
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:policy.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const localDate=`${parts.year}-${parts.month}-${parts.day}`;
const localMinute=Number(parts.hour)*60+Number(parts.minute);
const [lh,lm]=gamePolicy.latestValidFreezeLocal.split(':').map(Number);
const latestMinute=lh*60+lm;
if(localDate>TARGET || (localDate===TARGET && localMinute>latestMinute)) throw new Error(`Freeze refused: ${localDate} ${parts.hour}:${parts.minute} Europe/Madrid is after ${gamePolicy.latestValidFreezeLocal}`);

let s=fs.readFileSync(SRC,'utf8');
s=`import {createHash as v175CreateHash} from 'node:crypto';\n`+s;
s=s.replace("loterias-ai/data/research/meta-pleno-v157-pre2023-hybrid-selector.json","/tmp/meta-pleno-v175-internal.json")
 .replace("version:'v157'","version:'v175-internal'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'V175_NEXT_DRAW_INTERNAL'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("const useFrontier=day.graphAdv>=s.threshold","const useFrontier=day.graphAdv<=s.threshold");
const marker="const thresholds=[-999,0,4,8,12,16,20,24,28,32,36,40,999],stats=";
if(!s.includes(marker)) throw new Error('v175 injection marker missing');
const inject=`
const V175_TARGET='${TARGET}',V175_REQUIRED_LATEST='${REQUIRED_LATEST}',V175_THRESHOLD=40,V175_OUT='${OUT}';
if(ds.at(-1)?.date!==V175_REQUIRED_LATEST)throw new Error('WAITING_OFFICIAL_PREVIOUS_DRAW: expected '+V175_REQUIRED_LATEST+' got '+ds.at(-1)?.date);
if(ds.some(x=>x.date>=V175_TARGET))throw new Error('Freeze refused: target draw result already present');
function v175F(vr,vgr,n){const x=vr.find(q=>q.n===n),rr=vr.findIndex(q=>q.n===n)+1;return[1-rr/49,x?.score||0,1-(vgr.get(n)||49)/49,...K.map(k=>x?.f?.[k]||0)]}
const V175_TR=[];for(const day of days.filter(x=>x.date>='2021-01-01'&&x.date<='2022-12-31')){const vp=day.graphAdv<=V175_THRESHOLD?day.frontierPool:day.structPool,vw=new Set(day.winning);for(const n of vp)V175_TR.push({f:v175F(day.r,day.gr,n),bad:!vw.has(n)})}
const V175_P=V175_TR.filter(x=>x.bad).map(x=>x.f),V175_N=V175_TR.filter(x=>!x.bad).map(x=>x.f),V175_COEF=[],V175_MN=[],V175_SC=[];for(let j=0;j<V175_P[0].length;j++){const mp=mean(V175_P.map(x=>x[j]));V175_MN[j]=mean(V175_N.map(x=>x[j]));V175_SC[j]=sd([...V175_P.map(x=>x[j]),...V175_N.map(x=>x[j])]);V175_COEF[j]=(mp-V175_MN[j])/V175_SC[j]}const v175Drop=(vr,vgr,n)=>v175F(vr,vgr,n).reduce((z,v,j)=>z+V175_COEF[j]*(v-V175_MN[j])/V175_SC[j],0);
const V175_I=ds.length,V175_R=rank(V175_I),V175_G=graph(V175_I),V175_GR=new Map(V175_G.map((x,k)=>[x.n,k+1])),V175_BASE=V175_R.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),V175_BASEDROP=V175_R.slice(0,8).map((x,k)=>({x,rr:k+1,s:v175Drop(V175_R,V175_GR,x.n)})).sort((a,b)=>b.s-a.s||a.rr-b.rr)[0],V175_ADD9=V175_R[8],V175_ADV=V175_GR.get(V175_BASEDROP.x.n)-V175_GR.get(V175_ADD9.n),V175_FRONTIER=V175_BASE.filter(n=>n!==V175_BASEDROP.x.n).concat(V175_ADD9.n).sort((a,b)=>a-b),V175_SR=structuralRoute(V175_R),V175_POOL=V175_ADV<=V175_THRESHOLD?V175_FRONTIER:V175_SR.pool,V175_ROUTE=V175_ADV<=V175_THRESHOLD?'FRONTIER_RANK9':'STRUCTURAL_V132';
const V175_PAIRS=comb(V175_POOL,2).map(p=>{const kept=V175_POOL.filter(n=>!p.includes(n)),d1=v175Drop(V175_R,V175_GR,p[0]),d2=v175Drop(V175_R,V175_GR,p[1]),div=Math.abs((V175_R.find(x=>x.n===p[0])?.score||0)-(V175_R.find(x=>x.n===p[1])?.score||0));return{omit:p,ticket:kept,score:.25*(d1+d2)-2*div}}).sort((a,b)=>b.score-a.score||a.omit.join(',').localeCompare(b.omit.join(','))),V175_SELECTED=V175_PAIRS.slice(0,4),V175_TICKETS=V175_SELECTED.map(x=>x.ticket.slice().sort((a,b)=>a-b));
const V175_CONFIG={sourcePoolEngine:'v162-threshold40-reconstructed',compressionEngine:'v172-d0.25-div2',training:'2021-2022 only',target:V175_TARGET,cutoff:V175_REQUIRED_LATEST,poolSize:8,selectedTickets:4,unitStakeEUR:.5,theoreticalStakeEUR:2,alternativeNotAdditive:true};const V175_FP=v175CreateHash('sha256').update(JSON.stringify({config:V175_CONFIG,pool:V175_POOL,tickets:V175_TICKETS})).digest('hex'),V175_FREEZE={generatedAt:new Date().toISOString(),version:'v175',gameId:'bonoloto',status:'FROZEN_BEFORE_TARGET_RESULT',purpose:'True prospective 2 EUR compression freeze after official previous-draw ingestion. Research-only and never additive.',config:V175_CONFIG,prediction:{route:V175_ROUTE,graphAdvantage:V175_ADV,pool:V175_POOL,tickets:V175_TICKETS,omittedPairs:V175_SELECTED.map(x=>({omit:x.omit,score:x.score})),fingerprintSha256:V175_FP},dataBoundary:{lastTrainingDraw:V175_REQUIRED_LATEST,targetDraw:V175_TARGET,targetResultObserved:false},evidence:{historicalExploratoryRetention:'v172 clean import retained both discovered v162 full-hit events at low compressed budgets',architecturePosthoc:true,prospectiveReplication:true},realMoneyPass:false,realStakeEUR:0};fs.mkdirSync('loterias-ai/data/prospective',{recursive:true});fs.writeFileSync(V175_OUT,JSON.stringify(V175_FREEZE,null,2)+'\\n');console.log(JSON.stringify({status:V175_FREEZE.status,target:V175_TARGET,route:V175_ROUTE,pool:V175_POOL,tickets:V175_TICKETS,fingerprint:V175_FP},null,2));
`;
s=s.replace(marker,inject+'\n'+marker);
const tmp='/tmp/meta-pleno-v175.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
