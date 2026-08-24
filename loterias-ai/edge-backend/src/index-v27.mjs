import { EdgeSentinel as V26EdgeSentinel } from './index-v26.mjs';
import { PINATA_POINTS_CURRENT,pinataLevelTable,screenPinataPoints,screenPinataSlotStack } from './pinata-points-screen-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v27-pinata-points-cash-stack-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V26EdgeSentinel{
  pinataPointsResearch(){
    const levels=pinataLevelTable();
    return {
      version:'edge-pinata-points-lab-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      terms:PINATA_POINTS_CURRENT,
      levels,
      roundingExamples:{
        points499:screenPinataPoints({weeklyTurnoverEUR:998,level:1,category:'SLOTS'}),
        points500Tie:screenPinataPoints({weeklyTurnoverEUR:1000,level:1,category:'SLOTS'}),
        points501:screenPinataPoints({weeklyTurnoverEUR:1002,level:1,category:'SLOTS'}),
        level2Points501:screenPinataPoints({weeklyTurnoverEUR:501,level:2,category:'SLOTS'})
      },
      stackTemplate:screenPinataSlotStack(),
      decision:{
        cashLoyaltyMechanicResolved:true,
        level1To8MultipliersResolved:true,
        weeklyNearestEuroRoundingResolvedExceptHalfTie:true,
        currentAccountLevelResolved:false,
        exactCurrentGameRtpResolved:false,
        positiveEvStackProven:false,
        realMoneyAllowed:false,
        nextScientificTarget:'FIND_HIGHEST_RTP_PINATA_SLOT_WITH_EXACT_CURRENT_RULES_AND_CAPTURE_ACCOUNT_LEVEL_WEEKLY_POINTS_STATE'
      },
      guards:{
        level9DisplayTypoQuarantined:true,
        halfEuroTieCannotBeAssumedUpward:true,
        smallTurnoverCannotUseContinuousLoyaltyRate:true,
        accountLevelCannotBeInferredFromHistoricalVolume:true,
        realMoneyAllowed:false
      }
    };
  }

  fastProfitResearch(){
    const base=super.fastProfitResearch();
    const pinata=this.pinataPointsResearch();
    return {
      ...base,
      version:'edge-fast-profit-lab-v4-fixed-reward-and-cash-loyalty',generatedAt:new Date().toISOString(),
      verifiedReturnComponents:{
        ...(base.verifiedReturnComponents||{}),
        pinataPoints:{
          source:PINATA_POINTS_CURRENT.sourceUrl,
          payout:'1 EUR per 1000 weekly points rounded to nearest EUR',
          slotGameMultiplier:1,
          level1To8ContinuousCashReturnPct:pinata.levels.filter(x=>x.multiplierVerified).map(x=>({level:x.level,pct:x.continuousSlotCashReturnPct})),
          weeklyRoundingMustBeModelled:true,
          currentAccountLevelRequired:true,
          executable:false
        }
      },
      decision:{
        ...base.decision,
        exactCashLoyaltyComponentAvailable:true,
        pinataStackPositiveEvProven:false,
        nextPinataTarget:'EXACT_HIGH_RTP_SLOT_PLUS_ACCOUNT_LEVEL_AND_WEEKLY_POINTS_STATE',
        realMoneyAllowed:false
      },
      guards:{...base.guards,pinataLoyaltyCannotBeAddedLinearlyAcrossRoundingBoundaries:true,pinataLevel9MultiplierNotVerified:true,realMoneyAllowed:false}
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/pinata-points'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{pinataPointsLabV27:true,cashLoyaltyRoundingModel:true,levelReturnTable:true,pafGroupPromoLabV26Preserved:true,executionContractFailClosed:true},research:this.pinataPointsResearch()});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/jokerbet-promos','/science/paf-group-promos','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),pinataPointsLabV27:true,cashLoyaltyRoundingModel:true,levelReturnTable:true,pafGroupPromoLabV26Preserved:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
