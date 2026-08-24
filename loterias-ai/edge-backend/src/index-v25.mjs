import { EdgeSentinel as V24EdgeSentinel } from './index-v24.mjs';
import { buildJokerbetZeroCapitalPromoResearch } from './jokerbet-zero-capital-promos-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v25-zero-capital-promos-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V24EdgeSentinel{
  jokerbetPromoResearch(){
    return {generatedAt:new Date().toISOString(),...buildJokerbetZeroCapitalPromoResearch()};
  }

  fastProfitResearch(){
    const base=super.fastProfitResearch();
    const promos=this.jokerbetPromoResearch();
    return {
      ...base,
      version:'edge-fast-profit-lab-v2-zero-capital',
      zeroCapitalLanes:[
        {
          id:'jokerbet-no-deposit-registration-30',operator:'JOKERBET.es',status:'ELIGIBILITY_AND_CASHOUT_MODEL_REQUIRED',
          ownCapitalRequiredToClaimEUR:promos.noDepositRegistration.ownCapitalRequiredToClaimEUR,
          nominalComboEUR:promos.noDepositRegistration.nominalComboEUR,
          publishedBonusTurnoverEUR:promos.derived.noDepositPublishedBonusTurnoverEUR,
          maxPublishedConversionEUR:promos.derived.noDepositMaximumPublishedConversionEUR,
          repeatablePerUser:promos.noDepositRegistration.repeatablePerUser,
          cashProfitProven:false,
          reason:'Current official terms expose a 30 EUR no-deposit registration combo with zero required deposit, but casino/slots require x80 rollover and exact cashout EV is not yet modelled.'
        },
        {
          id:'jokerbet-club-welcome-700-jkb',operator:'JOKERBET.es',status:'REWARD_CONVERSION_TERMS_REQUIRED',
          ownCapitalRequiredToReceiveJoinCoinsEUR:promos.clubWelcome.ownCapitalRequiredToReceiveJoinCoinsEUR,
          welcomeJokercoins:promos.clubWelcome.joinJokercoins,
          cheapestObservedReward:promos.clubWelcome.cheapestObservedSlotsReward,
          nominalRewardImmediatelyRedeemable:promos.derived.clubCanNominallyRedeemWelcomeReward,
          cashProfitProven:false,
          reason:'Joining the current CLUB awards 700 JOKERCOINS and the visible shop lists a 5 EUR slots bonus for 650, but reward-specific rollover/max-conversion terms are not published on the CLUB page.'
        }
      ],
      decision:{
        ...base.decision,
        lowestOwnCapitalDiscoveryLane:'jokerbet-no-deposit-registration-30',
        zeroCapitalCashoutEvProven:false,
        zeroCapitalRealMoneyWagerAllowed:false,
        nextZeroCapitalTarget:'RESOLVE_CLUB_REWARD_TERMS_AND_BONUS_ELIGIBLE_GAME_DISTRIBUTION'
      },
      guards:{
        ...base.guards,
        zeroCapitalLaneCannotPromoteWithoutCashoutModel:true,
        singleUsePromotionCannotMasqueradeAsRepeatableProfit:true,
        ownRealBalanceForbiddenInZeroCapitalLane:true,
        realMoneyAllowed:false
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/jokerbet-promos'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{zeroCapitalPromoLabV25:true,jokerbetNoDepositTermsFingerprint:true,jokerbetClubWelcomeEvidence:true,executionContractFailClosed:true},research:this.jokerbetPromoResearch()});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),zeroCapitalPromoLabV25:true,jokerbetNoDepositTermsFingerprint:true,jokerbetClubWelcomeEvidence:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
