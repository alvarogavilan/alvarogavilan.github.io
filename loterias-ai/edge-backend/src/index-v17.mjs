import { EdgeSentinel as V16EdgeSentinel } from './index-v16.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v17-jackpot-timing-lab-20260824a';
const MADRID='Europe/Madrid';
const WEEKDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const dtf=new Intl.DateTimeFormat('en-GB',{timeZone:MADRID,weekday:'short',hour:'2-digit',hourCycle:'h23'});

function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function quantile(values,q){
  const a=values.filter(finite).map(Number).sort((x,y)=>x-y);if(!a.length)return null;if(a.length===1)return a[0];
  const pos=(a.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);
}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;}
function stdev(a){if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1));}
function localParts(ms){
  const parts=dtf.formatToParts(new Date(ms));const out={hour:null,weekday:null};
  for(const p of parts){if(p.type==='hour')out.hour=Number(p.value);if(p.type==='weekday')out.weekday=p.value;}
  return out;
}
function timingClass(n){if(n===0)return 'NO_FULL_OBSERVED_CYCLES';if(n<10)return 'INSUFFICIENT_LT10';if(n<30)return 'EXPLORATORY_10_TO_29';return 'DESCRIPTIVE_30_PLUS';}

export class EdgeSentinel extends V16EdgeSentinel{
  timingRows(){
    const meterKeys=[...this.sql.exec(`SELECT meter_key FROM meter_ath ORDER BY meter_key ASC`)].map(r=>r.meter_key);
    const stateRows=[...this.sql.exec(`SELECT meter_key,last_observed_at_ms,last_observed_at,last_eur FROM meter_active_cycles`)];
    const activeMap=new Map(stateRows.map(r=>[r.meter_key,r]));
    const out=[];
    for(const meterKey of meterKeys){
      const cycles=[...this.sql.exec(`SELECT * FROM meter_cycles WHERE meter_key=? ORDER BY cycle_ended_at_ms ASC`,meterKey)];
      const full=cycles.filter(r=>Number(r.start_boundary_exact)===1);
      const durations=full.map(r=>Number(r.duration_ms)).filter(x=>Number.isFinite(x)&&x>=0);
      const m=mean(durations),sd=stdev(durations),cv=m&&sd!==null?sd/m:null;
      const hourCounts=Array.from({length:24},()=>0),weekdayCounts=Object.fromEntries(WEEKDAYS.map(d=>[d,0]));
      for(const r of cycles){const p=localParts(Number(r.cycle_ended_at_ms));if(Number.isInteger(p.hour)&&p.hour>=0&&p.hour<24)hourCounts[p.hour]++;if(p.weekday in weekdayCounts)weekdayCounts[p.weekday]++;}
      const last=cycles.length?cycles[cycles.length-1]:null,active=activeMap.get(meterKey)||null;
      const nowMs=active?Number(active.last_observed_at_ms):Date.now();
      const lastMs=last?Number(last.cycle_ended_at_ms):null;
      const elapsed=lastMs!==null&&Number.isFinite(nowMs)?Math.max(0,nowMs-lastMs):null;
      const agePct=elapsed!==null&&durations.length?durations.filter(x=>x<=elapsed).length/durations.length:null;
      const maxHourCount=Math.max(0,...hourCounts),maxWeekdayCount=Math.max(0,...Object.values(weekdayCounts));
      const n=durations.length;
      out.push({
        meterKey,
        scope:'EDGE_DIRECT_OBSERVATIONS_ONLY',
        candidateBoundaryCount:cycles.length,
        fullObservedCycleCount:n,
        verifiedAwardCount:cycles.filter(r=>Number(r.award_verified)===1).length,
        firstCandidateAt:cycles[0]?.cycle_ended_at||null,
        lastCandidateAt:last?.cycle_ended_at||null,
        currentObservedAt:active?.last_observed_at||null,
        currentEUR:active?Number(active.last_eur):null,
        elapsedSinceLastCandidateMs:elapsed,
        elapsedPercentileAmongObservedFullCycles:agePct,
        intervalStats:{
          n,meanMs:m,stdevMs:sd,coefficientOfVariation:cv,
          minMs:durations.length?Math.min(...durations):null,
          p10Ms:quantile(durations,.10),p25Ms:quantile(durations,.25),medianMs:quantile(durations,.50),p75Ms:quantile(durations,.75),p90Ms:quantile(durations,.90),
          maxMs:durations.length?Math.max(...durations):null
        },
        calendarDistribution:{timeZone:MADRID,hourCounts,weekdayCounts,maxHourShare:cycles.length?maxHourCount/cycles.length:null,maxWeekdayShare:cycles.length?maxWeekdayCount/cycles.length:null,exposureCorrected:false},
        evidenceClass:timingClass(n),
        lowDispersionScreen:n>=10&&cv!==null&&cv<0.35,
        timingMechanismVerified:false,
        nextEventPrediction:null,
        timingEdgeProven:false
      });
    }
    return out;
  }

  timingResearch(meterKey=null){
    const rows=this.timingRows();const selected=meterKey?rows.filter(r=>r.meterKey===meterKey):rows;
    return {
      version:'edge-jackpot-timing-lab-v1',
      generatedAt:new Date().toISOString(),
      timeZone:MADRID,
      rows:selected,
      summary:{metersTracked:rows.length,metersWithFullCycles:rows.filter(r=>r.fullObservedCycleCount>0).length,metersWithAtLeast10FullCycles:rows.filter(r=>r.fullObservedCycleCount>=10).length,verifiedAwardEvents:rows.reduce((s,r)=>s+r.verifiedAwardCount,0),timingEdgesProven:0},
      interpretation:{
        lowDispersionScreen:'Exploratory flag only; low interval dispersion can motivate testing but does not prove a timer.',
        elapsedPercentile:'Descriptive rank of current elapsed time among observed full candidate cycles; it is not a probability that the jackpot is due.',
        calendarDistribution:'Raw event clock distribution only. Without exposure/turnover by hour it cannot estimate hourly jackpot hazard.'
      },
      guards:{
        candidateBoundaryIsNotVerifiedAward:true,
        elapsedPercentileIsNotDueProbability:true,
        clockClusteringWithoutExposureIsNotHazard:true,
        rngHistoryDoesNotPredictNextIndependentOutcome:true,
        explicitTimedMechanismRequiresRuleVerification:true,
        prospectiveValidationRequiredBeforeTimingClaim:true,
        timingResearchCannotEnableRealMoney:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/timing'){
      await this.ensureAlarm();
      try{await this.updateCycleLedger();}catch{}
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{jackpotTimingLab:true,madridClockHistograms:true,intervalQuantiles:true,elapsedCycleAge:true,executionContractFailClosed:true},research:this.timingResearch(url.searchParams.get('meter')||null)});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),jackpotTimingLab:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
