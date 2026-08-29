export function evaluateForcedAwardWindow(input={}) {
  const {
    deadlineEpochMs,
    observedEpochMs,
    preDeadlineWinCount,
    postDeadlineWinCount,
    feedTimestampEpochMs,
    feedFreshnessMaxMs=15_000,
    nextContributionConfirmedUnclaimed=false,
    minStakeEUR=null,
    jackpotEUR=null,
    sourceOperatorBound=false,
  } = input;

  const requiredNumbers=[deadlineEpochMs,observedEpochMs,preDeadlineWinCount,postDeadlineWinCount,feedTimestampEpochMs];
  const missingCore=requiredNumbers.some(v=>!Number.isFinite(v));
  if(missingCore) return {decision:'NO_PLAY',reason:'MISSING_CORE_FEED_FIELDS',realStakeEUR:0};

  const deadlinePassed=observedEpochMs>=deadlineEpochMs;
  const noWinCountChange=postDeadlineWinCount===preDeadlineWinCount;
  const feedPostDeadline=feedTimestampEpochMs>=deadlineEpochMs;
  const feedAgeMs=Math.max(0,observedEpochMs-feedTimestampEpochMs);
  const feedFresh=feedAgeMs<=feedFreshnessMaxMs;
  const stakeKnown=Number.isFinite(minStakeEUR)&&minStakeEUR>0;
  const jackpotKnown=Number.isFinite(jackpotEUR)&&jackpotEUR>0;
  const exactWindow=deadlinePassed&&noWinCountChange&&feedPostDeadline&&feedFresh&&nextContributionConfirmedUnclaimed&&sourceOperatorBound&&stakeKnown&&jackpotKnown;

  return {
    decision:exactWindow?'FORCED_AWARD_WINDOW_VERIFIED':'NO_PLAY',
    deadlinePassed,noWinCountChange,feedPostDeadline,feedFresh,feedAgeMs,
    nextContributionConfirmedUnclaimed:Boolean(nextContributionConfirmedUnclaimed),
    sourceOperatorBound:Boolean(sourceOperatorBound),stakeKnown,jackpotKnown,
    minStakeEUR:stakeKnown?minStakeEUR:null,
    jackpotEUR:jackpotKnown?jackpotEUR:null,
    grossJackpotToStakeRatio:stakeKnown&&jackpotKnown?jackpotEUR/minStakeEUR:null,
    realStakeEUR:0,
    guard:'This detector never places a bet. It only recognizes the exact forced-award prerequisite. A stale public tracker or unchanged amount is insufficient.'
  };
}

export function requiredFeedContract(){
  return {
    required:[
      'operator/network-bound win counter or equivalent jackpot-hit sequence',
      'server/feed timestamp',
      'exact Daily/Weekly deadline',
      'current jackpot amount',
      'minimum eligible stake',
      'proof that no eligible contribution has consumed the post-deadline forced award'
    ],
    rejected:['stale scraped amount alone','average hit time','historical jackpot value','assumed inactivity','manual guess'],
  };
}
