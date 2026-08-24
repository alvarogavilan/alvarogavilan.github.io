import { EdgeSentinel as V20EdgeSentinel } from './index-v20.mjs';
import { JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS } from './jokerbet-stack-candidates-v1.mjs';
import { buildJokerbetStackResearch } from './jokerbet-stack-core-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v21-jokerbet-stack-lab-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V20EdgeSentinel{
  jokerbetStackResearch(){
    const r=buildJokerbetStackResearch(JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS);
    return {
      ...r,
      generatedAt:new Date().toISOString(),
      jurisdiction:'ES',operator:'JOKERBET.es',
      currentOperatorJackpotMonitor:{
        exactOroEUR:null,exactPlataEUR:null,exactBronceEUR:null,
        publicUnauthenticatedMachineReadableFeedResolved:false,
        awardLedgerResolved:false,
        status:'BLOCKED_PUBLIC_POT_FEED_AND_AWARD_HISTORY_NOT_RESOLVED'
      },
      decision:{
        closestPublishedGameReturn:r.leaderBySmallestDeclaredGap?.game||null,
        strongestVerifiedSuperHot:r.leaderWithVerifiedSuperHotOperatorJackpot?.game||null,
        stackPositiveEvProven:false,
        exactOperatorJackpotReturnKnown:false,
        realMoneyAllowed:false,
        nextScientificTarget:'MEASURE_OPERATOR_JACKPOT_EXPECTED_RETURN_BY_TEMPERATURE_AND_TIER'
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/jokerbet-stack'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{jokerbetStackLab:true,stackGapMath:true,promotionDoubleCountGuards:true,executionContractFailClosed:true},research:this.jokerbetStackResearch()});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),jokerbetStackLab:true,stackGapMath:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
