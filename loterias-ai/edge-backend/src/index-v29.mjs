import { EdgeSentinel as V28EdgeSentinel } from './index-v28.mjs';
import { PLAYUZU_WELCOME_CURRENT_V2,screenPlayuzuWelcomeV2,playuzuCurrentAccountObservedScenario } from './playuzu-welcome-screen-v2.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v29-playuzu-current-account-evidence-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V28EdgeSentinel{
  playuzuWelcomeResearch(){
    const exact=screenPlayuzuWelcomeV2();
    const observed=playuzuCurrentAccountObservedScenario();
    return {
      version:'edge-playuzu-welcome-v2-current-operator-evidence',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      offer:PLAYUZU_WELCOME_CURRENT_V2,
      exactScreen:exact,
      currentSameOperatorObservedScenario:observed,
      mathematicalEnvelope:{
        ownWagerCandidate:'Big Bass Splash',ownWagerMinimumStakeEUR:0.10,ownWagerPublishedRtp:0.9671,
        ownWagerExpectedLossEUR:0.00329,freeSpinNominalTurnoverEUR:5,
        breakEvenFreeSpinRtpUsingPublishedOwnWagerRtp:0.000658,
        worstCaseOwnWagerLossEUR:0.10,worstCaseBreakEvenFreeSpinRtp:0.02,
        sameOperatorObservedRtp:observed.reportedRtp,
        sameOperatorObservedIllustrativeExpectedPromoNetEUR:observed.illustrativeExpectedPromoNetEUR,
        sameOperatorObservedRtpVsWorstCaseBreakEvenMultiple:observed.reportedRtpVsWorstCaseBreakEvenMultiple,
        interpretation:'Current official welcome terms reduce the withdrawal condition to at least one wager in another game and individual promotion terms override conflicting general reward terms. A current third-party real-money PlayUZU account test reports Queen RTP 95.72%, 3.42 EUR credited from the 50 welcome spins and a later real-money withdrawal. This strongly corroborates the economics and cash-conversion path, but the target account still needs its own promotion capture and in-game rules/RTP fingerprint before execution can be promoted.'
      },
      evidenceUpgrade:{
        welcomeThirtyDayConflictResolvedBySpecificTerms:true,
        sameOperatorCurrentAccountFlowObserved:true,
        sameOperatorReportedRtpAvailable:true,
        realBalanceCreditObserved:true,
        realWithdrawalObserved:true,
        exactTargetAccountFingerprintStillMissing:true
      },
      decision:{
        shortestEvidencePath:'CAPTURE_TARGET_ACCOUNT_WELCOME_ELIGIBILITY_AND_IN_GAME_QUEEN_RULES_RTP',
        previousThirtyDayBlockerRemoved:true,
        signStronglyCorroboratedNotYetTargetAccountProven:true,
        positiveEvProven:false,
        executable:false,
        realMoneyAllowed:false
      },
      guards:{
        sameOperatorEditorialObservationCannotBecomeOfficialFingerprint:true,
        observedProfitCannotGuaranteeFutureProfit:true,
        targetAccountEligibilityRequired:true,
        exactTargetAccountGameConfigurationRequired:true,
        oneNormalOtherGameWagerMustBeAccountAccepted:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  fastProfitResearch(){
    const base=super.fastProfitResearch();
    const lanes=(base.lanes||[]).map(lane=>lane.id==='playuzu-welcome-50fs'?{
      ...lane,
      status:'TARGET_ACCOUNT_CAPTURE_AND_EXACT_GAME_FINGERPRINT_REQUIRED',
      exactScreen:this.playuzuWelcomeResearch().exactScreen,
      currentSameOperatorObservedScenario:this.playuzuWelcomeResearch().currentSameOperatorObservedScenario,
      reason:'Official current welcome terms state the only indispensable withdrawal condition is at least one wager in another game, and specific promotion terms override conflicting general reward terms. A current real-money PlayUZU editorial account test reports Queen RTP 95.72%, 3.42 EUR credited from the 50 spins and a successful real withdrawal. Target-account eligibility and exact in-game fingerprint remain mandatory before GREEN.'
    }:lane);
    return {
      ...base,
      version:'edge-fast-profit-lab-v6-playuzu-evidence-escalation',
      generatedAt:new Date().toISOString(),
      lanes,
      decision:{
        ...base.decision,
        shortestEvidencePath:'PLAYUZU_TARGET_ACCOUNT_PROMO_PLUS_IN_GAME_QUEEN_RTP_CAPTURE',
        playuzuThirtyDayConflictResolved:true,
        playuzuSameOperatorCashConversionObserved:true,
        positiveEvProven:false,
        executableLane:null,
        realMoneyAllowed:false
      },
      guards:{...base.guards,playuzuEditorialRtpCannotPromoteExecution:true,targetAccountCaptureRequired:true,realMoneyAllowed:false}
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/playuzu-welcome'||path==='/science/playuzu-current-account'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{playuzuWelcomeEvidenceV29:true,promotionSpecificTermsPrecedenceResolved:true,sameOperatorCurrentAccountObservation:true,realWithdrawalObservation:true,pinataPointsV27Preserved:true,cgmV28Preserved:true,executionContractFailClosed:true},research:this.playuzuWelcomeResearch()});
    }
    const response=await super.fetch(request);
    const inherited=['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/jokerbet-promos','/science/paf-group-promos','/science/pinata-points','/science/cgm-zero-deposit','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'];
    if(!inherited.includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),playuzuWelcomeEvidenceV29:true,promotionSpecificTermsPrecedenceResolved:true,sameOperatorCurrentAccountObservation:true,realWithdrawalObservation:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
