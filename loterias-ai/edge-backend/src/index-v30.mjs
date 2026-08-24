import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs';
import { CGM_CURRENT_PROMOS_V2,screenCgmZeroDepositV2,screenCgmBirthday } from './cgm-promos-screen-v2.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v30-cgm-birthday-positive-sign-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V29EdgeSentinel{
  cgmZeroDepositResearch(){
    const exact=screenCgmZeroDepositV2();
    return {
      version:'edge-cgm-zero-deposit-v2-corrected-eligibility',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      terms:CGM_CURRENT_PROMOS_V2,
      exactScreen:exact,
      correction:{
        previousJacksOrBetterCandidateRevoked:true,
        previousBookOf99CandidateRevoked:true,
        reason:'The current Gran Madrid slots-bonus page publishes a no-bonus exclusion list; Jacks or Better - RedRake and Book of 99 are excluded candidates. Older general terms independently reduce video-poker contribution and invalidate Jacks or Better. EDGE now uses Full Of Luck only as a public-rules candidate pending target-account bonus acceptance.'
      },
      mathematicalEnvelope:{
        ownCapitalRequiredEUR:0,
        trancheBonusEUR:30,
        turnoverEUR:exact.rawTurnoverEUR,
        publishedCandidate:'Full Of Luck',
        publishedCandidateRtp:CGM_CURRENT_PROMOS_V2.fullOfLuckCandidate.publishedRtp,
        publishedMinimumStakeEUR:CGM_CURRENT_PROMOS_V2.fullOfLuckCandidate.publishedMinimumStakeEUR,
        publishedMaxPrizeAtMinimumStakeEUR:exact.publishedMaxPrizeAtMinimumStakeEUR,
        publicFinitePositiveCashoutPathExists:exact.publicFinitePositiveCashoutPathExists,
        conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules:exact.conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules,
        interpretation:'With zero required deposit, own-capital monetary downside is zero. Under the currently published rules, Full Of Luck is not found by exact title in the current no-bonus list, valid slot wagers default to 100% contribution, the published minimum stake fits inside the 30 EUR bonus, and positive prizes up to 1000x exist. Therefore a finite positive-cashout outcome path exists and the conditional own-capital monetary EV sign is strictly positive if the target account is eligible and those published rules apply. The probability and EV magnitude remain unquantified.'
      },
      decision:{
        shortestEvidencePath:'CAPTURE_CGM_TARGET_ACCOUNT_ZERO_DEPOSIT_PLUS_FULL_OF_LUCK_BONUS_ACCEPTANCE_AND_RULES',
        publicRulesConditionalPositiveSignEstablished:exact.conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules,
        targetAccountPositiveEvProven:false,
        positiveEvMagnitudeQuantified:false,
        executable:false,realMoneyAllowed:false
      },
      guards:{publicExistenceProofCannotPromoteExecution:true,absenceFromExclusionListRequiresAccountCapture:true,ruinDistributionStillNeededForMagnitude:true,realMoneyAllowed:false}
    };
  }

  cgmBirthdayResearch(){
    const screen=screenCgmBirthday();
    return {
      version:'edge-cgm-birthday-v1-20260824',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      offer:CGM_CURRENT_PROMOS_V2.birthday,
      candidate:CGM_CURRENT_PROMOS_V2.fullOfLuckCandidate,
      screen,
      birthdayEnvelope:{
        minimumDepositEUR:screen.depositEUR,
        minimumDepositBonusEUR:screen.bonusEUR,
        requiredTurnoverEUR:screen.requiredTurnoverEUR,
        breakEvenRtpBeforeFreeSpins:screen.meanBreakEvenRtpBeforeFreeSpins,
        fullOfLuckPublishedRtp:screen.qualifyingGamePublishedRtp,
        meanPromoUpliftBeforeFreeSpinsEUR:screen.meanPromoUpliftBeforeFreeSpinsEUR,
        freeSpinsExcludedFromUpliftUntilResolved:true
      },
      decision:{
        todaySpecificLane:true,
        conditionalMeanEnvelopePositive:screen.conditionalMeanEnvelopePositive,
        actualPositiveEvProven:false,
        accountEligible:false,
        executable:false,realMoneyAllowed:false,
        shortestEvidencePath:'CAPTURE_BIRTHDAY_PROMO_IN_TARGET_ACCOUNT_PLUS_FULL_OF_LUCK_BONUS_ACCEPTANCE_THEN_MODEL_RUIN_AND_PIROTS_VALUE'
      },
      guards:{birthdayDoesNotOverrideAccountEligibility:true,meanEnvelopeCannotBeCalledProfit:true,depositIsOwnCapitalExposure:true,freeSpinFaceValueExcluded:true,realMoneyAllowed:false}
    };
  }

  fastProfitResearch(){
    const base=super.fastProfitResearch();
    const zero=this.cgmZeroDepositResearch(),birthday=this.cgmBirthdayResearch();
    const inherited=(base.lanes||[]).filter(x=>x.id!=='cgm-zero-deposit-60').map((x,i)=>({...x,priority:i+3}));
    return {
      ...base,
      version:'edge-fast-profit-lab-v7-cgm-birthday-positive-sign',generatedAt:new Date().toISOString(),
      lanes:[
        {
          id:'cgm-birthday-150pct-10fs',operator:'Gran Madrid | Casino Online',priority:1,status:'TODAY_ONLY_ACCOUNT_AND_RUIN_MODEL_REQUIRED',
          minimumDepositEUR:birthday.screen.depositEUR,bonusEUR:birthday.screen.bonusEUR,turnoverEUR:birthday.screen.requiredTurnoverEUR,
          candidateGame:'Full Of Luck',candidatePublishedRtp:birthday.screen.qualifyingGamePublishedRtp,
          conditionalMeanEnvelopeEUR:birthday.screen.meanPromoUpliftBeforeFreeSpinsEUR,
          actualPositiveEvProven:false,exactScreen:birthday.screen,
          reason:'Current birthday promotion grants 150% extra on the first birthday deposit from 10 EUR plus 10 Pirots spins. At the 10 EUR minimum, the pre-free-spin mean-loss break-even is 95%; Full Of Luck is published by the same operator at 95.72%, producing a +2.16 EUR mean envelope before ruin/cap/free-spin effects. Account eligibility and full cashout modelling still gate execution.'
        },
        {
          id:'cgm-zero-deposit-60',operator:'Gran Madrid | Casino Online',priority:2,status:'CONDITIONAL_POSITIVE_SIGN_TARGET_ACCOUNT_CAPTURE_REQUIRED',
          ownCapitalRequiredEUR:0,nominalBonusEUR:60,turnoverMultiple:40,maximumGainPerTrancheEUR:30,
          candidateGame:'Full Of Luck',candidatePublishedRtp:CGM_CURRENT_PROMOS_V2.fullOfLuckCandidate.publishedRtp,
          conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules:zero.exactScreen.conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules,
          targetAccountPositiveEvProven:false,exactScreen:zero.exactScreen,
          reason:'The no-deposit lane has zero own-capital downside. Current public rules plus the operator-published Full Of Luck minimum stake/positive-prize structure establish a finite positive-cashout path, so the own-capital monetary EV sign is conditionally positive if the target account is eligible and the published bonus rules apply. Magnitude and target-account validity remain unresolved.'
        },
        ...inherited
      ],
      decision:{
        ...base.decision,
        shortestEvidencePath:'CGM_TARGET_ACCOUNT_CAPTURE_ZERO_DEPOSIT_OR_BIRTHDAY_PROMO',
        cgmPublicRulesConditionalPositiveSignEstablished:zero.exactScreen.conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules,
        cgmBirthdayConditionalMeanEnvelopePositive:birthday.screen.conditionalMeanEnvelopePositive,
        positiveEvProven:false,executableLane:null,realMoneyAllowed:false
      },
      guards:{...base.guards,cgmConditionalSignCannotPromoteWithoutTargetAccount:true,cgmBirthdayMeanEnvelopeCannotPromote:true,realMoneyAllowed:false}
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/cgm-zero-deposit'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{cgmZeroDepositV30:true,correctedNoBonusEligibility:true,conditionalPositiveSignProof:true,cgmBirthdayLabV30:true,playuzuV29Preserved:true,executionContractFailClosed:true},research:this.cgmZeroDepositResearch()});
    }
    if(path==='/science/cgm-birthday'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{cgmBirthdayLabV30:true,birthdayMeanEnvelope:true,fullOfLuckCandidateScreen:true,playuzuV29Preserved:true,executionContractFailClosed:true},research:this.cgmBirthdayResearch()});
    }
    const response=await super.fetch(request);
    const inherited=['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/science/jokerbet-promos','/science/paf-group-promos','/science/pinata-points','/science/playuzu-welcome','/science/playuzu-current-account','/science/fast-profit','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'];
    if(!inherited.includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),cgmZeroDepositV30:true,cgmBirthdayLabV30:true,correctedNoBonusEligibility:true,conditionalPositiveSignProof:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
