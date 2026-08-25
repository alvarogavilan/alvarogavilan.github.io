import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v30-non-promo-only-20260825a';

// EDGE must never research or surface promotional/loyalty mechanisms -
// welcome bonuses, cashback, free spins, reload offers, loyalty points -
// regardless of how fail-closed their own gates are. Every route retired
// below always reported positiveEvProven:false / executable:false /
// realMoneyAllowed:false already, but the research DIRECTION itself - "how
// do we capture this promotion" - is exactly what EDGE must not do. This is
// a NON_PROMO_ONLY rejection at the deployed entry point: every
// promotional-research path is intercepted here, before any delegation to
// the v9-v29 chain, and always returns the same fixed fail-closed
// rejection. v29 itself is left untouched as an immutable historical
// snapshot - see edge-playuzu-current-account-evidence-v29.test.mjs, which
// still verifies v29's own file content, not what is actually deployed.
const NON_PROMO_REJECTED_PATHS=new Set([
  '/science/playuzu-welcome','/science/playuzu-current-account',
  '/science/jokerbet-stack','/science/jokerbet-promos',
  '/science/paf-group-promos','/science/pinata-points','/science/cgm-zero-deposit',
]);
function nonPromoRejection(path){
  return {
    ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
    rejectedPath:path,
    reason:'NON_PROMO_ONLY: EDGE never researches or recommends promotional/loyalty mechanisms (welcome bonuses, cashback, free spins, reload offers, loyalty points), regardless of how fail-closed their own gates are. This route is permanently retired.',
    research:null,positiveEvProven:false,executable:false,realMoneyAllowed:false,
  };
}
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V29EdgeSentinel{
  fastProfitResearch(){
    const base=super.fastProfitResearch();
    // Drop any promotional lane entirely rather than fill it with promo
    // content - a "closed, no data" lane is not the same claim as "here is
    // research on this promotion."
    const lanes=(base.lanes||[]).filter(lane=>lane.id!=='playuzu-welcome-50fs');
    return {
      ...base,
      version:'edge-fast-profit-lab-v7-non-promo-only',
      generatedAt:new Date().toISOString(),
      lanes,
      decision:{...base.decision,positiveEvProven:false,executableLane:null,realMoneyAllowed:false},
      guards:{...base.guards,nonPromoOnly:true,realMoneyAllowed:false},
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(NON_PROMO_REJECTED_PATHS.has(path))return responseJson(nonPromoRejection(path));
    const response=await super.fetch(request);
    const inherited=['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'];
    if(!inherited.includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),nonPromoOnly:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
