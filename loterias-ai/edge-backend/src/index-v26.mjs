import { EdgeSentinel as V25EdgeSentinel } from './index-v25.mjs';
import { GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT,screenFixedRealMoneyReward } from './paf-group-fixed-reward-screen-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v26-paf-group-fixed-rewards-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V25EdgeSentinel{
  pafGroupPromoResearch(){
    const exact=screenFixedRealMoneyReward();
    const illustrative95=screenFixedRealMoneyReward({qualifyingGameRtp:0.95,qualifyingGameRtpResolved:true});
    return {
      version:'edge-paf-group-promos-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      currentFixedRealMoneyOffer:GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT,
      exactScreen:exact,illustrativeOnlyRtp95Screen:illustrative95,
      mathematicalEnvelope:{
        qualifyingTurnoverEUR:50,fixedWithdrawableRewardEUR:5,breakEvenQualifyingRtp:0.90,
        interpretation:'If the exact account offer is the published 50 EUR turnover for an unencumbered 5 EUR real-money reward, any verified qualifying-game RTP above 90% gives positive expected promotional value before other frictions. This statement does not identify the hidden qualifying game.'
      },
      nextEvidenceNeeded:['CAPTURE_EXACT_ACCOUNT_OFFER','RESOLVE_QUALIFYING_GAME_IDENTITY','READ_IN_GAME_RTP_AND_RULES','VERIFY_PROMOTION_WINDOW_AND_ELIGIBILITY','RESOLVE_REPEATABILITY','PROSPECTIVE_VALIDATION'],
      decision:{shortestEvidencePath:'GOLDEN_BULL_5_EUR_REAL_MONEY_EXACT_GAME_CAPTURE',conditionalBreakEvenSolved:true,positiveEvProven:false,reproduciblePositiveEvProven:false,realMoneyAllowed:false},
      guards:{hiddenGameCannotBeGuessed:true,rewardSemanticsVerifiedDoesNotResolveOfferIdentity:true,crossBrandPromotionStackingNotAssumed:true,responsibleGamingEligibilityCannotBeBypassed:true,executionContractRemainsSoleGreenAuthority:true,realMoneyAllowed:false}
    };
  }

  fastProfitResearch(){
    const base=super.fastProfitResearch();
    const golden=this.pafGroupPromoResearch();
    const shifted=(base.lanes||[]).map((x,i)=>({...x,priority:i+2}));
    return {
      ...base,version:'edge-fast-profit-lab-v3-zero-capital-and-fixed-reward',generatedAt:new Date().toISOString(),
      lanes:[{
        id:'goldenbull-play-50-get-5-real-money',operator:'GoldenBull.es',priority:1,status:'EXACT_GAME_AND_ACCOUNT_TERMS_REQUIRED',
        publicOffer:GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT,exactScreen:golden.exactScreen,illustrativeOnlyRtp95Screen:golden.illustrativeOnlyRtp95Screen,breakEvenQualifyingRtp:0.90,
        reason:'Current operator page publishes 5 EUR Real Money after playing 50 EUR; official support defines Real Money as withdrawable with no release requirement. Exact qualifying title/RTP and account offer window still gate execution.'
      },...shifted],
      decision:{...base.decision,shortestEvidencePath:'GOLDEN_BULL_5_EUR_REAL_MONEY_EXACT_GAME_CAPTURE',positiveEvProven:false,executableLane:null,realMoneyAllowed:false},
      guards:{...base.guards,fixedCashBreakEvenCanBeSolvedBeforeGameIdentityButCannotPromote:true,crossBrandPromoIndependenceNotAssumed:true,zeroCapitalLanesPreserved:true,realMoneyAllowed:false}
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/paf-group-promos'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{pafGroupPromoLabV26:true,goldenBullFixedRealMoneyScreen:true,fixedRewardBreakEven:true,zeroCapitalPromoLabV25Preserved:true,executionContractFailClosed:true},research:this.pafGroupPromoResearch()});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/jokerbet-promos','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),pafGroupPromoLabV26:true,goldenBullFixedRealMoneyScreen:true,fixedRewardBreakEven:true,zeroCapitalPromoLabV25Preserved:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
