import fs from 'node:fs';

const ROOT='loterias-ai';
const candidateFile=`${ROOT}/data/shadow/meta-pleno-repeatability-candidates.json`;
const frozen=JSON.parse(fs.readFileSync(candidateFile,'utf8'));

const cfgs={
  bonoloto:{dir:'bonoloto',max:49,k:6,testFrom:'2023-01-01',threshold:6},
  euromillones:{dir:'euromillones',max:50,k:5,testFrom:'2023-01-01',threshold:4},
  eurodreams:{dir:'eurodreams',max:40,k:6,testFrom:'2026-01-01',threshold:5},
};
const FINALISTS_OPENED_PER_GAME=240;

function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r}
function hypergeomHitProb(N,K,h){return choose(K,h)*choose(N-K,K-h)/choose(N,K)}
function pHitAtLeast(c,t){let p=0;for(let h=t;h<=c.k;h++)p+=hypergeomHitProb(c.max,c.k,h);return p}
function binomTail(n,p,k){
  if(k<=0)return 1;
  if(k>n||p<=0)return 0;
  if(p>=1)return 1;
  if(k===1)return -Math.expm1(n*Math.log1p(-p));
  let term=Math.exp(n*Math.log1p(-p)),cdf=term;
  for(let x=0;x<k-1;x++){
    term*=((n-x)/(x+1))*(p/(1-p));
    cdf+=term;
  }
  return Math.max(0,Math.min(1,1-cdf));
}
function mod(x,m){return((x-1)%m+m)%m+1}
function addUnique(o,v,step,max){let e=((step%max)+max)%max;if(e===0)e=1;let g=0;while(o.includes(v)&&g++<max)v=mod(v+e,max);g=0;while(o.includes(v)&&g++<max)v=mod(v+1,max);if(o.includes(v))throw new Error('cannot unique');o.push(v)}
function loadRows(c){let rows=[];for(const f of fs.readdirSync(`${ROOT}/data/archive/${c.dir}`).filter(x=>/^\d{4}\.json$/.test(x)).sort()){rows.push(...(JSON.parse(fs.readFileSync(`${ROOT}/data/archive/${c.dir}/${f}`,'utf8')).records||[]))}return rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===c.k&&new Set(r.result.main).size===c.k).sort((a,b)=>a.drawDate.localeCompare(b.drawDate))}
function predict(rows,i,s,c){const A=rows[i-s.lag1]?.result?.main||[],B=rows[i-s.lag2]?.result?.main||[],dt=new Date(`${rows[i].drawDate}T12:00:00Z`),day=dt.getUTCDate(),mon=dt.getUTCMonth()+1,dow=dt.getUTCDay(),o=[];for(let q=0;q<c.k;q++){const x=A[(s.p1+q+s.rot)%c.k]||q+1,y=B[(s.p2+(s.mirror?c.k-1-q:q))%c.k]||q+1;let z;if(s.mode===0)z=s.a*x+s.b*y+s.d*day+s.e*mon+s.f+s.step*q;else if(s.mode===1)z=s.a*(x-y)+s.b*(x+y)+s.d*dow+s.e*q+s.f;else if(s.mode===2)z=s.a*x+s.b*y+s.d*(x%10)+s.e*(y%10)+s.f+s.step*(day+q);else if(s.mode===3)z=s.a*(x+q)+s.b*(y-q)+s.d*(day+mon)+s.e*dow+s.f;else if(s.mode===4)z=s.a*(x*y%c.max)+s.b*(x-y)+s.d*day+s.e*(mon+q)+s.f;else z=s.a*(x+day)+s.b*(y+mon)+s.d*(q+1)*(dow+1)+s.e*(x%7-y%7)+s.f;addUnique(o,mod(z,c.max),s.step,c.max)}return o.sort((a,b)=>a-b)}
function hits(p,t){let h=0;for(const x of p)if(t.includes(x))h++;return h}

const out={
  generatedAt:new Date().toISOString(),
  engine:'MetaPleno-v25-selection-aware-null-audit',
  purpose:'Audit frozen MetaPleno v5 candidates only on their later test windows against an exact uniform-lottery null, with conservative correction for the 240 finalists opened per game. Historical validation/discovery hits are not counted as independent confirmation.',
  assumptions:{
    null:'Each official main-number draw is uniform over valid combinations; deterministic candidate tickets are fixed conditional on information available before that draw.',
    finalistCorrection:'Bonferroni over 240 v5 finalists evaluated on the opened test period per game. Dependence among finalists makes this conservative but transparent.',
    caveat:'This is not a proof of predictability. Repeated discovery/validation signals used for selection are excluded from independent replication claims. Prospective sealed tests remain decisive.'
  },
  finalistsOpenedPerGame:FINALISTS_OPENED_PER_GAME,
  candidates:[],
  realMoneyPass:false
};

for(const cand of frozen.candidates||[]){
  const game=cand.game,c=cfgs[game];if(!c)continue;
  const rows=loadRows(c),start=rows.findIndex(r=>r.drawDate>=c.testFrom);if(start<0)continue;
  const yearly={};let thresholdEvents=0,full=0,best=0,totalHits=0;const events=[];
  for(let i=start;i<rows.length;i++){
    const p=predict(rows,i,cand.spec,c),h=hits(p,rows[i].result.main),y=rows[i].drawDate.slice(0,4);best=Math.max(best,h);totalHits+=h;
    if(!yearly[y])yearly[y]={draws:0,bestHits:0,thresholdEvents:0,full:0};yearly[y].draws++;yearly[y].bestHits=Math.max(yearly[y].bestHits,h);
    if(h>=c.threshold){thresholdEvents++;yearly[y].thresholdEvents++;if(events.length<25)events.push({date:rows[i].drawDate,hits:h,prediction:p,truth:rows[i].result.main})}
    if(h===c.k){full++;yearly[y].full++}
  }
  const D=rows.length-start,p0=pHitAtLeast(c,c.threshold),rawP=binomTail(D,p0,thresholdEvents),adj=Math.min(1,rawP*FINALISTS_OPENED_PER_GAME);
  const pFull=pHitAtLeast(c,c.k),rawFull=binomTail(D,pFull,full),adjFull=Math.min(1,rawFull*FINALISTS_OPENED_PER_GAME);
  const activeYears=Object.entries(yearly).filter(([,z])=>z.thresholdEvents>0).map(([y])=>y);
  out.candidates.push({game,id:cand.id,specId:cand.spec.id,testFrom:c.testFrom,draws:D,threshold:`${c.threshold}/${c.k}+`,observed:{thresholdEvents,full,bestHits:best,meanHits:totalHits/Math.max(1,D),activeYears,yearly,events},null:{perDrawThresholdProbability:p0,expectedThresholdEvents:D*p0,rawTailProbability:rawP,bonferroni240:adj,perDrawFullProbability:pFull,expectedFullEvents:D*pFull,rawFullTailProbability:rawFull,bonferroni240Full:adjFull},interpretation:activeYears.length>=2?'INDEPENDENT_TEST_REPEAT_SIGNAL_REQUIRES_PROSPECTIVE_CONFIRMATION':thresholdEvents>0?'SINGLE_TEST_PERIOD_SIGNAL_NO_CROSS_YEAR_REPLICATION':'NO_LATER_TEST_SIGNAL',realMoneyPass:false});
}

out.summary={
  strongestByAdjustedThreshold:[...out.candidates].sort((a,b)=>a.null.bonferroni240-b.null.bonferroni240).map(x=>({game:x.game,id:x.id,events:x.observed.thresholdEvents,activeYears:x.observed.activeYears,adjustedP:x.null.bonferroni240,interpretation:x.interpretation})),
  conclusion:'Do not promote any candidate to real money. A statistically unusual historical test result remains vulnerable to model-search dependence and cannot substitute for sealed prospective replication.'
};
fs.mkdirSync(`${ROOT}/data/research`,{recursive:true});
fs.writeFileSync(`${ROOT}/data/research/meta-pleno-v25-selection-aware-null-audit.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.summary,null,2));
