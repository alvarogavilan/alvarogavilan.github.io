import {EdgeSentinel as V32EdgeSentinel} from './index-v32.mjs';
import {analyzeBotemaniaJpkDropRows} from './botemania-jpk-reset-analysis-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v33-botemania-jpk-reset-analysis-20260903a';
const JPK_KEYS=['blueprint:JACKPOTKING_ROYAL','blueprint:JACKPOTKING_REGAL','blueprint:JACKPOTKING'];

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}

export class EdgeSentinel extends V32EdgeSentinel{
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/botemania-jpk-resets'){
      if(request.method!=='GET')return responseJson({ok:false,error:'METHOD_NOT_ALLOWED',realMoneyAllowed:false},405);
      const limit=Math.max(1,Math.min(10000,Number(url.searchParams.get('limit')||5000)));
      const rows=[...this.sql.exec(
        `SELECT observed_at_ms,observed_at,type,meter_key,before_eur,after_eur,delta_eur,metadata_json
         FROM events
         WHERE type='DROP_CANDIDATE' AND meter_key IN (?, ?, ?)
         ORDER BY observed_at_ms DESC LIMIT ?`,
        ...JPK_KEYS,
        limit,
      )];
      const analysis=analyzeBotemaniaJpkDropRows(rows);
      const state=(await this.ctx.storage.get('state'))||{};
      const currentMeters={};
      for(const key of JPK_KEYS)if(Number.isFinite(Number(state?.meters?.[key])))currentMeters[key]=Number(state.meters[key]);
      return responseJson({
        ok:true,
        service:'loterias-edge-sentinel',
        deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        source:'BOTEMANIA_PUBLIC_GRAPHQL_DIRECT_DURABLE_OBJECT_EVENT_LEDGER',
        queriedDropRows:rows.length,
        currentObservedAt:state?.observedAt||null,
        currentMeters,
        analysis,
        scientificUse:'RESET_CLASSIFICATION_AND_INTERVAL_CENSORING_RESEARCH_ONLY',
        execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0},
      });
    }

    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),botemaniaJpkResetAnalysis:true,nonPromoOnly:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
