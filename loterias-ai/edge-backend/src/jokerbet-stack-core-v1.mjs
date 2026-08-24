const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const clamp01=v=>Math.max(0,Math.min(1,Number(v)));

export function screenJokerbetCandidate(candidate,terms={}){
  const declaredGameReturn=finite(candidate.declaredRtpIncludingProviderContribution)?Number(candidate.declaredRtpIncludingProviderContribution):Number(candidate.pageRtp||0);
  const gap=Math.max(0,1-declaredGameReturn);
  const clubNominal=Number(terms?.club?.bestNominalFaceValuePerEURWagered||0);
  const clubUsable=terms?.club?.cashEquivalentVerified===true&&terms?.club?.rewardSpecificRolloverVerified===true;
  const verifiedStackReturn=declaredGameReturn;
  const hypotheticalWithClub=clamp01(declaredGameReturn+clubNominal);
  const gapIfClubFaceWereCashEquivalent=Math.max(0,1-hypotheticalWithClub);
  const stake=Number(candidate.minStakeEUR||0);
  const requiredExtraEURPerMinStake=stake>0?gap*stake:null;
  const awardScenarios=[35,300,15000].map(avgAwardEUR=>({
    assumedAverageOperatorAwardEUR:avgAwardEUR,
    requiredHitProbabilityPerMinStakeSpin:requiredExtraEURPerMinStake!==null?requiredExtraEURPerMinStake/avgAwardEUR:null,
    requiredMeanSpinsPerHit:requiredExtraEURPerMinStake&&avgAwardEUR>0?avgAwardEUR/requiredExtraEURPerMinStake:null
  }));
  return {
    id:candidate.id,game:candidate.game,provider:candidate.provider,minStakeEUR:candidate.minStakeEUR,maxStakeEUR:candidate.maxStakeEUR,
    pageRtp:candidate.pageRtp,
    providerProgressiveContribution:candidate.providerProgressiveContribution,
    declaredGameReturnForScreen:declaredGameReturn,
    operatorJackpotTemperature:candidate.operatorJackpotTemperature,
    operatorJackpotEligibilityVerified:candidate.operatorJackpotEligibilityVerified===true,
    verifiedStackReturn,
    verifiedGapToOne:gap,
    requiredUnknownExtraReturnFraction:gap,
    requiredUnknownExtraReturnPct:100*gap,
    requiredExtraEURPerMinStake,
    clubNominalFaceValuePerEURWagered:clubNominal,
    clubIncludedInVerifiedReturn:clubUsable,
    hypotheticalGapIfClubFaceWereCashEquivalent,
    operatorJackpotAwardScenarios:awardScenarios,
    positiveEvProven:false,
    executable:false,
    blockers:[
      ...(candidate.operatorJackpotEligibilityVerified===true?[]:['OPERATOR_JACKPOT_ELIGIBILITY_OR_TEMPERATURE_UNRESOLVED']),
      'OPERATOR_JACKPOT_EXPECTED_RETURN_UNKNOWN',
      'OPERATOR_JACKPOT_PROBABILITY_BY_TEMPERATURE_UNKNOWN',
      ...(clubUsable?[]:['CLUB_REWARD_CASH_EQUIVALENT_UNVERIFIED']),
      'CASHBACK_IS_LOSS_CONTINGENT_NOT_FIXED_RTP',
      'PROSPECTIVE_STACK_VALIDATION_MISSING'
    ]
  };
}

export function buildJokerbetStackResearch(candidates=[],terms={}){
  const rows=candidates.map(c=>screenJokerbetCandidate(c,terms));
  const byGap=[...rows].sort((a,b)=>a.verifiedGapToOne-b.verifiedGapToOne||a.minStakeEUR-b.minStakeEUR);
  const operatorReady=[...rows].filter(x=>x.operatorJackpotEligibilityVerified&&x.operatorJackpotTemperature==='SUPER_HOT').sort((a,b)=>a.verifiedGapToOne-b.verifiedGapToOne);
  return {
    version:'edge-jokerbet-stack-lab-v1',
    rows,
    leaderBySmallestDeclaredGap:byGap[0]||null,
    leaderWithVerifiedSuperHotOperatorJackpot:operatorReady[0]||null,
    terms,
    interpretation:{
      declaredGameReturn:'Published game/provider RTP used only as a stack screen. It is not a guarantee for a finite session.',
      verifiedGapToOne:'Additional expected return that would have to be demonstrated before the stack reaches 100% under the published game RTP.',
      clubNominal:'Face-value reward ratio only. It is excluded from verified return until reward-specific conversion terms are known.',
      cashbackOne:'A rebate on realized weekly net losses, not a constant RTP increment.',
      awardScenario:'Required hit rates are algebraic targets under assumed average award values, not estimates of actual JOKERBET probabilities.'
    },
    guards:{
      realizedRtpNeverUsedAsForwardExpectation:true,
      operatorJackpotReturnMustBeMeasured:true,
      temperatureOrderingDoesNotRevealAbsoluteProbability:true,
      clubFaceValueCannotBeAddedWithoutConversionTerms:true,
      cashbackCannotBeAddedAsTenPercentagePoints:true,
      doubleCountProviderProgressiveForbidden:true,
      realMoneyAllowed:false
    }
  };
}
