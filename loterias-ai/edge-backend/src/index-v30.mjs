import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs';
import { INTRINSIC_EDGE_CURRENT,screenGoldenWheelsState,intrinsicEdgeRanking } from './intrinsic-edge-screen-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v30-intrinsic-awp-state-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V29EdgeSentinel{
  intrinsicEdgeResearch(){
    const golden=screenGoldenWheelsState();
    return {
      version:'edge-intrinsic-edge-lab-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      scope:{promotionsExcluded:true,marketingBonusesExcluded:true,intrinsicGameStateOnly:true},
      evidence:INTRINSIC_EDGE_CURRENT,
      ranking:intrinsicEdgeRanking(),
      goldenWheelsScreen:golden,
      decision:{
        shortestEvidencePath:'VERIFY_GOLDEN_WHEELS_BONUS_PERSISTENCE_THEN_QUANTIFY_CONDITIONAL_UPPER_GAME_EV',
        visibleConsumableStateVerified:true,
        bonusPersistenceAcrossPlayerChangeVerified:false,
        exactStateEvResolved:false,
        positiveEvProven:false,
        executableLane:null,
        realMoneyAllowed:false
      },
      guards:{
        promotionsCannotEnterRanking:true,
        observedBonusCountAloneCannotPromote:true,
        noPersistenceInferenceFromSeparateMeters:true,
        noCompensationTransferAcrossArchitectures:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/intrinsic-edge'||path==='/science/awp-persistent-state'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{intrinsicEdgeLabV30:true,goldenWheelsPersistentStateLab:true,promotionsExcludedFromIntrinsicRanking:true,jpkV23PlusPreserved:true,executionContractFailClosed:true},research:this.intrinsicEdgeResearch()});
    }
    const response=await super.fetch(request);
    const inherited=['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/jokerbet-promos','/science/paf-group-promos','/science/pinata-points','/science/cgm-zero-deposit','/science/playuzu-welcome','/science/playuzu-current-account','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'];
    if(!inherited.includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),intrinsicEdgeLabV30:true,goldenWheelsPersistentStateLab:true,promotionsExcludedFromIntrinsicRanking:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
