import { EdgeSentinel as V31EdgeSentinel } from './index-v31.mjs';
import { runBetfairSportingLiveTickerProbe } from './betfair-sporting-live-ticker-probe-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v32-betfair-sporting-live-ticker-probe-20260826a';

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'access-control-allow-origin':'*',
    },
  });
}

export class EdgeSentinel extends V31EdgeSentinel{
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/betfair-sporting-live-ticker'){
      if(request.method!=='GET')return responseJson({ok:false,error:'METHOD_NOT_ALLOWED',realMoneyAllowed:false},405);
      const probe=await runBetfairSportingLiveTickerProbe();
      return responseJson({
        ok:true,
        service:'loterias-edge-sentinel',
        deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        deploymentCapabilities:{betfairSportingPublicConfigProbe:true,betfairSportingPassiveLiveTickerProbe:true,nonPromoOnly:true},
        probe,
        realMoneyAllowed:false,
      });
    }

    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/betfair-sporting-config'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={
        ...(body.deploymentCapabilities||{}),
        betfairSportingPublicConfigProbe:true,
        betfairSportingPassiveLiveTickerProbe:true,
        nonPromoOnly:true,
      };
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
