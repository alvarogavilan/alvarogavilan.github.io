import { EdgeSentinel as V23EdgeSentinel } from './index-v23.mjs';
import { buildJokerbetZeroCapitalPromoResearch } from './jokerbet-zero-capital-promos-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v24-jokerbet-zero-capital-promos-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V23EdgeSentinel{
  jokerbetPromoResearch(){
    return {
      generatedAt:new Date().toISOString(),
      ...buildJokerbetZeroCapitalPromoResearch()
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/jokerbet-promos'){
      await this.ensureAlarm();
      return responseJson({
        ok:true,
        service:'loterias-edge-sentinel',
        deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        deploymentCapabilities:{jokerbetZeroCapitalPromoLab:true,noDepositTermsFingerprint:true,clubWelcomeValueGuard:true,executionContractFailClosed:true},
        research:this.jokerbetPromoResearch()
      });
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),jokerbetZeroCapitalPromoLab:true,jokerbetStackTermsRefreshV24:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
