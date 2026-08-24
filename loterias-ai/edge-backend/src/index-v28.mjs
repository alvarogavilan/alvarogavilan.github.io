import { EdgeSentinel as V27EdgeSentinel } from './index-v27.mjs';
import { PLAYUZU_WELCOME_CURRENT,screenPlayuzuWelcome,playuzuExternalScenarioScreens } from './playuzu-welcome-screen-v1.mjs';
import { CGM_ZERO_DEPOSIT_CURRENT,screenCgmZeroDeposit,cgmExternalVideoPokerScenario } from './cgm-zero-deposit-screen-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v28-playuzu-cgm-fast-profit-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V27EdgeSentinel{
  playuzuWelcomeResearch(){
    const exact=screenPlayuzuWelcome();
    return {
      version:'edge-playuzu-welcome-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      offer:PLAYUZU_WELCOME_CURRENT,exactScreen:exact,externalSameTitleScenarios:playuzuExternalScenarioScreens(),
      mathematicalEnvelope:{
        ownWagerCandidate:'Big Bass Splash',ownWagerMinimumStakeEUR:0.10,ownWagerPublishedRtp:0.9671,
        ownWagerExpectedLossEUR:0.00329,freeSpinNominalTurnoverEUR:5,
        breakEvenFreeSpinRtpUsingPublishedOwnWagerRtp:0.000658,
        worstCaseOwnWagerLossEUR:0.10,worstCaseBreakEvenFreeSpinRtp:0.02,
        interpretation:'If one normal 0.10 EUR Big Bass Splash spin is accepted as the required other-game own-money wager, the exact PlayUZU Queen RTP only has to exceed 0.0658% using the published Big Bass RTP, or 2% even if the own-money spin is conservatively treated as a total loss. Exact PlayUZU Queen configuration remains unresolved, so this envelope cannot promote execution.'
      },
      decision:{
        shortestEvidencePath:'READ_PLAYUZU_IN_GAME_QUEEN_RTP_AND_CAPTURE_ACCOUNT_PROMO_ELIGIBILITY',
        signNearlyClosed:true,positiveEvProven:false,executable:false,realMoneyAllowed:false
      },
      guards:{welcomeVsGeneral30DayPolicyConflictVisible:true,externalRtpCannotPromote:true,oneSpinPlainLanguageDoesNotEqualAccountVerification:true,realMoneyAllowed:false}
    };
  }

  cgmZeroDepositResearch(){
    const exact=screenCgmZeroDeposit();
    return {
      version:'edge-cgm-zero-deposit-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      offer:CGM_ZERO_DEPOSIT_CURRENT,exactScreen:exact,externalVideoPokerScenario:cgmExternalVideoPokerScenario(),
      mathematicalEnvelope:{
        ownCapitalRequiredEUR:0,trancheBonusEUR:30,turnoverPerTrancheEUR:1200,
        defaultContributionMeanSurvivalBreakEvenRtp:0.975,
        interpretation:'No-deposit makes own-capital monetary downside zero. Strict positive monetary EV follows once a non-zero probability of completing the rollover with positive withdrawable cash is demonstrated. Mean RTP alone is insufficient to quantify survival/cashout EV because ruin and the 30 EUR conversion cap matter.'
      },
      decision:{
        shortestEvidencePath:'CAPTURE_CGM_ACCOUNT_BONUS_AND_EXACT_100_PERCENT_CONTRIBUTION_GAME_PAYTABLE_THEN_SIMULATE_SURVIVAL',
        ownCapitalDownsideEUR:0,positiveEvSignConditionalOnPositiveCashoutProbability:true,
        cashoutProbabilityQuantified:false,positiveEvMagnitudeQuantified:false,executable:false,realMoneyAllowed:false
      },
      guards:{zeroDepositNotGuaranteedWithdrawal:true,ruinSimulationRequired:true,forbiddenLowRiskPatternsExcluded:true,externalVideoPokerRtpCannotPromote:true,realMoneyAllowed:false}
    };
  }

  fastProfitResearch(){
    const base=super.fastProfitResearch();
    const cgm=this.cgmZeroDepositResearch(),uzu=this.playuzuWelcomeResearch();
    const shifted=(base.lanes||[]).map((x,i)=>({...x,priority:i+3}));
    return {
      ...base,version:'edge-fast-profit-lab-v5-playuzu-cgm-and-pinata',generatedAt:new Date().toISOString(),
      lanes:[
        {id:'cgm-zero-deposit-60',operator:'Gran Madrid | Casino Online',priority:1,status:'SURVIVAL_MODEL_AND_ACCOUNT_ELIGIBILITY_REQUIRED',ownCapitalRequiredEUR:0,nominalBonusEUR:60,turnoverMultiple:40,maximumGainPerTrancheEUR:30,exactScreen:cgm.exactScreen,reason:'Current official offer requires no deposit. Monetary downside from claiming is zero, but the probability and magnitude of cash conversion must be quantified under an exact eligible game/paytable and account terms.'},
        {id:'playuzu-welcome-50fs',operator:'PlayUZU.es',priority:2,status:'EXACT_FREE_SPIN_RTP_AND_ACCOUNT_POLICY_REQUIRED',minimumDepositEUR:10,freeSpins:50,freeSpinStakeEUR:0.10,ownWagerCandidate:'Big Bass Splash 0.10 EUR @ 96.71% published RTP',exactScreen:uzu.exactScreen,reason:'Current welcome page pays free-spin winnings as real money with no rollover and requires at least one wager in another game. Exact PlayUZU Queen RTP and the welcome-vs-30-day policy conflict still gate execution.'},
        ...shifted
      ],
      decision:{...base.decision,shortestEvidencePath:'CGM_ZERO_DEPOSIT_ACCOUNT_CAPTURE_OR_PLAYUZU_QUEEN_RTP_CAPTURE',positiveEvProven:false,executableLane:null,realMoneyAllowed:false},
      guards:{...base.guards,zeroCapitalClaimCannotBeCalledGuaranteedProfit:true,positiveEvSignNeedsPositiveCashoutProbability:true,playuzuExternalRtpCannotPromote:true,pinataPointsV27Preserved:true,realMoneyAllowed:false}
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/playuzu-welcome'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{playuzuWelcomeScreenV28:true,oneSpinBreakEvenEnvelope:true,accountPolicyConflictGuard:true,pinataPointsLabV27Preserved:true,executionContractFailClosed:true},research:this.playuzuWelcomeResearch()});
    }
    if(path==='/science/cgm-zero-deposit'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{cgmZeroDepositScreenV28:true,zeroCapitalDownsideModel:true,bonusSurvivalGate:true,pinataPointsLabV27Preserved:true,executionContractFailClosed:true},research:this.cgmZeroDepositResearch()});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/jokerbet-promos','/science/paf-group-promos','/science/pinata-points','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),playuzuWelcomeScreenV28:true,cgmZeroDepositScreenV28:true,zeroCapitalDownsideModel:true,oneSpinBreakEvenEnvelope:true,pinataPointsLabV27Preserved:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
