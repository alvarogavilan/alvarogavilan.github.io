import { EdgeSentinel as V7EdgeSentinel } from './index-v7.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v8-jpk-reset-distributions-20260824a';
const JPK_KEYS=[
  'blueprint:JACKPOTKING',
  'blueprint:JACKPOTKING_REGAL',
  'blueprint:JACKPOTKING_ROYAL'
];

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function median(values){
  const a=values.filter(finite).map(Number).sort((x,y)=>x-y);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function numericSummary(values){
  const a=values.filter(finite).map(Number).sort((x,y)=>x-y);
  if(!a.length)return {n:0,min:null,median:null,max:null,mean:null};
  return {n:a.length,min:a[0],median:median(a),max:a[a.length-1],mean:a.reduce((s,x)=>s+x,0)/a.length};
}

export class EdgeSentinel extends V7EdgeSentinel{
  aggregateResetCandidates(meterKey){
    const rows=[...this.sql.exec(
      `SELECT COUNT(*) AS n,
              MIN(before_eur) AS before_min, AVG(before_eur) AS before_mean, MAX(before_eur) AS before_max,
              MIN(after_eur) AS after_min, AVG(after_eur) AS after_mean, MAX(after_eur) AS after_max,
              MIN(-delta_eur) AS drop_min, AVG(-delta_eur) AS drop_mean, MAX(-delta_eur) AS drop_max
       FROM science_events
       WHERE type='RESET_OR_AWARD_CANDIDATE' AND meter_key=?`,
      meterKey
    )];
    const r=rows[0]||{};
    return {
      candidateCount:Number(r.n||0),
      beforeEUR:{min:finite(r.before_min)?Number(r.before_min):null,mean:finite(r.before_mean)?Number(r.before_mean):null,max:finite(r.before_max)?Number(r.before_max):null},
      afterEUR:{min:finite(r.after_min)?Number(r.after_min):null,mean:finite(r.after_mean)?Number(r.after_mean):null,max:finite(r.after_max)?Number(r.after_max):null},
      dropEUR:{min:finite(r.drop_min)?Number(r.drop_min):null,mean:finite(r.drop_mean)?Number(r.drop_mean):null,max:finite(r.drop_max)?Number(r.drop_max):null}
    };
  }

  recentResetCandidates(meterKey,limit=100){
    const n=Math.max(1,Math.min(500,Number(limit)||100));
    return [...this.sql.exec(
      `SELECT observed_at_ms, observed_at, meter_key, before_eur, after_eur, delta_eur, metadata_json
       FROM science_events
       WHERE type='RESET_OR_AWARD_CANDIDATE' AND meter_key=?
       ORDER BY observed_at_ms DESC LIMIT ?`,
      meterKey,n
    )].map(r=>({...r,metadata:r.metadata_json?JSON.parse(r.metadata_json):null}));
  }

  async jpkResearch(limit=100){
    const state=(await this.ctx.storage.get('state'))||{};
    const telemetry=(await this.ctx.storage.get('scienceTelemetryV1'))||{};
    const tiers={};
    for(const key of JPK_KEYS){
      const rows=this.recentResetCandidates(key,limit);
      tiers[key]={
        currentEUR:finite(state?.meters?.[key])?Number(state.meters[key]):null,
        meterStats:telemetry?.meterStats?.[key]||null,
        aggregateCandidates:this.aggregateResetCandidates(key),
        recentWindow:{
          n:rows.length,
          beforeEUR:numericSummary(rows.map(r=>r.before_eur)),
          afterEUR:numericSummary(rows.map(r=>r.after_eur)),
          dropEUR:numericSummary(rows.map(r=>finite(r.delta_eur)?-Number(r.delta_eur):null))
        },
        recentCandidates:rows.slice(0,20)
      };
    }
    return {
      version:'edge-jpk-reset-research-v1',
      observedAt:state?.observedAt||null,
      observedAtMs:state?.observedAtMs||null,
      candidateClassifier:'DROP_AT_LEAST_1_EUR_AND_20_PERCENT_FROM_PRIOR_SAMPLE',
      tiers,
      guards:{
        resetCandidateIsNotAwardProof:true,
        candidateEndpointIsNotMustBeWonByEndpoint:true,
        capProximityIsNotPositiveEV:true,
        noHazardInferredFromDropDistribution:true,
        noThresholdInferredFromDropDistribution:true,
        telemetryCannotEnableRealMoney:true,
        executionContractRemainsSoleGreenAuthority:true
      }
    };
  }

  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==='/science/jpk'){
      await this.ensureAlarm();
      try{await this.updateScienceTelemetry();}catch{}
      const research=await this.jpkResearch(Number(new URL(request.url).searchParams.get('limit')||100));
      return responseJson({
        ok:true,
        service:'loterias-edge-sentinel',
        deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        deploymentCapabilities:{scienceStatus:true,scienceEvents:true,jpkResetDistributions:true,persistentSnapshots:true,telegramDeliveryProof:true,executionContractFailClosed:true},
        research
      });
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),jpkResetDistributions:true};
      return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
