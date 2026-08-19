import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/data/archive';
const OUT='loterias-ai/data/research/elige8-minimum-stake-holdout-audit-v1.json';

const rdate=r=>String(r.drawDate||'');
function load(dir){
  const rows=[];
  for(const f of fs.readdirSync(path.join(ROOT,dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const z=JSON.parse(fs.readFileSync(path.join(ROOT,dir,f),'utf8'));
    rows.push(...(z.records||[]));
  }
  const seen=new Set();
  return rows.filter(r=>{const k=r.drawId||`${r.drawDate}|${JSON.stringify(r.result||{})}`;if(!r.drawDate||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>rdate(a).localeCompare(rdate(b)));
}
const quin=load('quiniela'),eli=load('elige8');
const SIGNS=['1','X','2'];
const norm=a=>{const s=a.reduce((x,y)=>x+y,0);return a.map(x=>x/s)};
function state(rows,end){
  const team=new Map(),global={h:[1,1,1],a:[1,1,1]};
  for(let i=0;i<end;i++)for(const m of rows[i].result?.matches||[]){
    const si=SIGNS.indexOf(m.sign);if(si<0)continue;
    if(!team.has(m.home))team.set(m.home,{home:[1,1,1],away:[1,1,1]});
    if(!team.has(m.away))team.set(m.away,{home:[1,1,1],away:[1,1,1]});
    team.get(m.home).home[si]++;team.get(m.away).away[si]++;global.h[si]++;global.a[si]++;
  }
  return{team,global};
}
function sp(st,m){
  const h=st.team.get(m.home)?.home||st.global.h,a=st.team.get(m.away)?.away||st.global.a,ph=norm(h),pa=norm(a),p=ph.map((x,j)=>(x+pa[j])/2);
  let k=0;for(let j=1;j<3;j++)if(p[j]>p[k])k=j;
  return{sign:SIGNS[k],conf:p[k],probs:Object.fromEntries(SIGNS.map((s,j)=>[s,p[j]]))};
}
function predict(r){
  const prior=quin.filter(q=>q.drawDate<r.drawDate),st=state(prior,prior.length),ms=r.result?.selectableMatches||[];
  const scored=ms.map((m,j)=>({...sp(st,m),j,home:m.home,away:m.away})).sort((a,b)=>b.conf-a.conf||a.j-b.j).slice(0,8);
  return scored.map(x=>({position:x.j+1,home:x.home,away:x.away,sign:x.sign,confidence:x.conf,probabilities:x.probs}));
}
function payout(r,h){return h===8?Number((r.economics?.categories||[]).find(x=>Number(x.category)===1)?.prize||0):0}
const eligible=eli.map((r,i)=>[r,i]).filter(([r,i])=>i>=Math.min(200,Math.max(30,Math.floor(eli.length*0.1)))&&r.economics&&Number(r.economics.ticketCost)>0).map(x=>x[1]);
const n=eligible.length,a=Math.floor(n*0.5),b=Math.floor(n*0.75);
const phases={discovery:eligible.slice(0,a),validation:eligible.slice(a,b),holdout:eligible.slice(b)};
function phaseEval(indices){
  let stake=0,ret=0,top=0,sum=0;const topEvents=[];
  for(const i of indices){
    const r=eli[i],p=predict(r),truth=r.result?.selectableMatches||[],hits=p.filter(x=>truth[x.position-1]?.sign===x.sign).length,cost=Number(r.economics.ticketCost),pr=payout(r,hits);
    stake+=cost;ret+=pr;sum+=hits;if(hits===8){top++;topEvents.push({date:r.drawDate,jornada:r.jornada??null,drawId:r.drawId,stakeEUR:cost,prizeEUR:pr,picks:p,truth:p.map(x=>({position:x.position,sign:truth[x.position-1]?.sign,home:x.home,away:x.away})),allEightExact:true})}
  }
  return{draws:indices.length,stakeEUR:stake,returnEUR:ret,plEUR:ret-stake,roi:stake?ret/stake-1:null,top8of8:top,meanHits:indices.length?sum/indices.length:null,topEvents};
}
function binomialTail(n,k,p){
  let s=0;
  for(let x=k;x<=n;x++){
    let c=1;for(let j=1;j<=x;j++)c=c*(n-x+j)/j;
    s+=c*Math.pow(p,x)*Math.pow(1-p,n-x);
  }
  return Math.min(1,s);
}
const res={};for(const [k,v] of Object.entries(phases))res[k]=phaseEval(v);
const pOne=Math.pow(1/3,8);
const postN=res.validation.draws+res.holdout.draws,postK=res.validation.top8of8+res.holdout.top8of8;
const holdP=binomialTail(res.holdout.draws,res.holdout.top8of8,pOne),postP=binomialTail(postN,postK,pOne);
const out={
  version:'elige8-minimum-stake-holdout-audit-v1',
  generatedAt:new Date().toISOString(),
  model:'CAUSAL_TEAM_HOME_AWAY_SIGN_FREQUENCY_WITH_LAPLACE_SMOOTHING_SELECT_TOP8_CONFIDENCE',
  scope:{records:eli.length,quinielaHistoryRecords:quin.length,minimumUnitStakeEUR:0.5,split:{discovery:res.discovery.draws,validation:res.validation.draws,holdout:res.holdout.draws}},
  phases:res,
  matchedRandomExactNull:{
    perDrawExact8Probability:pOne,
    holdout:{draws:res.holdout.draws,observedExact8:res.holdout.top8of8,oneSidedBinomialP:holdP,bonferroni11Games:Math.min(1,holdP*11)},
    validationPlusHoldout:{draws:postN,observedExact8:postK,oneSidedBinomialP:postP,bonferroni11Games:Math.min(1,postP*11)},
    nullDefinition:'Select any 8 of 14 fixtures and guess each selected 1/X/2 sign uniformly; exact 8/8 probability is (1/3)^8 per draw.'
  },
  guards:{
    eachPredictionUsesOnlyQuinielaRowsWithDateStrictlyBeforeTarget:true,
    targetSignsNeverUsedForPrediction:true,
    targetScoresNeverUsedForPrediction:true,
    oneMinimumUnitTicketPerDraw:true,
    noRetuningAcrossValidationOrHoldout:true,
    realMoney:false
  },
  interpretation:{
    historicalSignal:res.holdout.top8of8>=2&&holdP<0.01?'STRONG_RETROSPECTIVE_CAUSAL_SIGNAL_REQUIRES_LIVE_PROSPECTIVE_FREEZE':'NO_STRONG_SIGNAL',
    realMoneyPass:false,
    reason:'Algorithm was audited retrospectively on archived history; a new untouched live prospective sequence is required before economic promotion.'
  }
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({holdout:out.phases.holdout,null:out.matchedRandomExactNull,interpretation:out.interpretation},null,2));
