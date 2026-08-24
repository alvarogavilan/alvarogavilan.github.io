import fs from 'node:fs';

const IN='loterias-ai/data/research/meta-pleno-v228-pool9-cover.json';
const OUT='loterias-ai/data/research/meta-pleno-v229-v228-matched-null.json';
const v228=JSON.parse(fs.readFileSync(IN,'utf8'));
if(v228.version!=='v228')throw new Error('v228 input required');
const frozen=v228.frozen.map(id=>({id,family:id.split('-L')[0],lambda:Number(id.split('-L')[1].replace('p','.'))}));
const families=[...new Set(frozen.map(x=>x.family))];
const obsMid=v228.signals.validation5PlusDates.length,obsLate=v228.signals.postFreeze5PlusDates.length;
const nMid=v228.validation.models[0]?.pool9.draws||0,nLate=v228.postFreeze.models[0]?.pool9.draws||0;
const comb=(arr,k,start=0,p=[],out=[])=>{if(p.length===k){out.push([...p]);return out;}for(let i=start;i<=arr.length-(k-p.length);i++){p.push(arr[i]);comb(arr,k,i+1,p,out);p.pop();}return out;};
const hit=(a,set)=>a.reduce((s,n)=>s+(set.has(n)?1:0),0);
let seed=0x229c0de;function rng(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}
function permutation(){const a=Array.from({length:49},(_,i)=>i+1);for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function select30(rank9,lambda){const pool=rank9.slice(0,9),quality=new Map(pool.map((n,i)=>[n,(9-i)/9])),cands=comb([...pool].sort((a,b)=>a-b),6).map(line=>({line,q:line.reduce((s,n)=>s+quality.get(n),0)})),usage=new Map(pool.map(n=>[n,0])),out=[];while(out.length<30){let best=null;for(let i=0;i<cands.length;i++){const c=cands[i];if(c.used)continue;const conc=c.line.reduce((s,n)=>s+(usage.get(n)||0),0),nov=c.line.reduce((s,n)=>s+(usage.get(n)===0?1:0),0),score=c.q-lambda*conc+lambda*.35*nov,key=c.line.join('-');if(!best||score>best.score||(score===best.score&&key<best.key))best={i,score,key};}const c=cands[best.i];c.used=true;out.push(c.line);for(const n of c.line)usage.set(n,(usage.get(n)||0)+1);}return out;}
const truth=new Set([1,2,3,4,5,6]);
const DRAWS=120000;let event5=0,event6=0;
for(let s=0;s<DRAWS;s++){
  const ranks=Object.fromEntries(families.map(f=>[f,permutation()]));let best=0;
  for(const cfg of frozen){const lines=select30(ranks[cfg.family],cfg.lambda);for(const line of lines){const h=hit(line,truth);if(h>best)best=h;if(best===6)break;}if(best===6)break;}
  if(best>=5)event5++;if(best===6)event6++;
}
const q5=event5/DRAWS,q6=event6/DRAWS;
const pAtLeast=(n,k,q)=>{let p=0;for(let j=0;j<k;j++){let c=1;for(let x=1;x<=j;x++)c=c*(n-x+1)/x;p+=c*q**j*(1-q)**(n-j);}return Math.max(0,1-p)};
const pMid=pAtLeast(nMid,obsMid,q5),pLate=pAtLeast(nLate,obsLate,q5),pRepeat=pMid*pLate;
const pAnyFull=1-(1-q6)**(nMid+nLate);
const candidateCount=v228.candidatePool.nominalConfigurations||20;
const corrected=Math.min(1,pRepeat*candidateCount);
const out={generatedAt:new Date().toISOString(),version:'v229',gameId:'bonoloto',family:'MATCHED_COST_RANDOM_NULL_POOL9',audits:'v228',nullDesign:{drawSimulations:DRAWS,truthSymmetry:'fixed canonical six numbers; random rankings over 1..49 are exchangeable',portfolioStructure:'same frozen family grouping, same 9-number pool, same 30-line selector and lambda values as v228',costPerPortfolioEUR:15,frozenModels:frozen.length,independentFamilies:families.length},observed:{validationDraws:nMid,validationUnique5Plus:obsMid,postFreezeDraws:nLate,postFreezeUnique5Plus:obsLate,repeat5PlusAcrossEras:v228.signals.repeat5PlusAcrossEras,fullsAcrossEras:0},nullRates:{perDrawAny5Plus:q5,perDrawAnyFull:q6,simulated5PlusEvents:event5,simulatedFullEvents:event6},pValues:{validationAtLeastObserved5Plus:pMid,postFreezeAtLeastObserved5Plus:pLate,repeatAcrossBothEras:pRepeat,anyFullAcrossBothEras:pAnyFull,bonferroniCandidatePool20:corrected},decision:corrected<0.05?'SURVIVES_INITIAL_MATCHED_NULL':'NOT_SIGNIFICANT_AFTER_MATCHED_NULL',nextGate:corrected<0.05?'Require stronger correlated circular-shift null + prospective freeze before any promotion.':'Do not promote v228; retain as negative/near-miss evidence.',realMoneyPass:false,realStakeEUR:0};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({decision:out.decision,nullRates:out.nullRates,pValues:out.pValues},null,2));