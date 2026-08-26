const finite=(v)=>Number.isFinite(Number(v))?Number(v):null;
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=(v)=>text(v)?.toUpperCase()??null;

function sameBinding(a,b){
  if(!a||!b)return false;
  const fields=['code','requestCasino','instanceCode'];
  for(const f of fields){
    const av=text(a[f]),bv=text(b[f]);
    if(av!==bv)return false;
  }
  return a.local===b.local&&upper(a.currency)===upper(b.currency);
}

export function evaluateSportingLegendsOverdueFirstBet({
  before,
  after,
  nowEpochSeconds=Math.floor(Date.now()/1000),
  exactBetfairSpainTickerImsBindingVerified=false,
  betfairFirstBetFollowingDayRuleVerified=false,
  followingDayStartEpochSeconds=null,
  followingDayBoundaryVerified=false,
  conservativeBaseRtpPct=93.03,
  stakeEUR=null,
  firstBetProbabilityLowerBound=null,
  raceModelProspectivelyValidated=false,
  maxFeedAgeSeconds=360,
}={}){
  const guards={
    researchOnly:true,
    noAutomaticWagering:true,
    noWagerProbe:true,
    exactBetfairSpainBindingRequired:true,
    publishedRuleMeansFollowingDayNotImmediatelyAfterDeadline:true,
    followingDayBoundaryMustBeVerified:true,
    feedMustBridgeDeadlineAndFollowingDayWithSameBinding:true,
    winCountMustRemainUnchanged:true,
    jackpotMustNotReset:true,
    raceProbabilityMustBeProspectivelyValidated:true,
    realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-overdue-first-bet-v1.1-following-day',decision:'NO_PLAY',valid:false,reason,guards,...extra});
  if(!before||!after)return fail('MISSING_BRIDGING_SNAPSHOTS');
  if(before.code!=='sljp-1'||after.code!=='sljp-1')return fail('NOT_SPORTING_DAILY');
  if(upper(before.currency)!=='EUR'||upper(after.currency)!=='EUR'||before.local!==0||after.local!==0)return fail('NOT_GLOBAL_EUR_DAILY');
  if(!sameBinding(before,after))return fail('BINDING_CHANGED');
  if(!exactBetfairSpainTickerImsBindingVerified)return fail('BETFAIR_SPAIN_TICKER_IMS_NOT_VERIFIED');
  if(!betfairFirstBetFollowingDayRuleVerified)return fail('BETFAIR_FOLLOWING_DAY_FIRST_BET_RULE_NOT_VERIFIED');
  if(!followingDayBoundaryVerified)return fail('FOLLOWING_DAY_BOUNDARY_NOT_VERIFIED');

  const deadline=finite(after.guaranteedHitTime),beforeDeadline=finite(before.guaranteedHitTime);
  const dayStart=finite(followingDayStartEpochSeconds);
  const beforeTs=finite(before.gameTimestamp),afterTs=finite(after.gameTimestamp),now=finite(nowEpochSeconds);
  const beforeWin=finite(before.winCount),afterWin=finite(after.winCount);
  const beforeAmount=finite(before.amount),afterAmount=finite(after.amount);
  if([deadline,beforeDeadline,dayStart,beforeTs,afterTs,now,beforeWin,afterWin,beforeAmount,afterAmount].some(v=>v===null))return fail('INCOMPLETE_PROTOCOL_FIELDS');
  if(deadline!==beforeDeadline)return fail('DEADLINE_CHANGED_OR_RESET');
  if(!(dayStart>deadline))return fail('FOLLOWING_DAY_BOUNDARY_NOT_AFTER_DEADLINE');
  if(!(beforeTs<=deadline&&afterTs>dayStart))return fail('SNAPSHOTS_DO_NOT_BRIDGE_DEADLINE_AND_FOLLOWING_DAY');
  if(afterWin!==beforeWin)return fail('JACKPOT_WIN_COUNT_CHANGED');
  if(afterAmount<beforeAmount)return fail('JACKPOT_RESET_OR_AWARD_DETECTED');

  const feedAgeSeconds=now-afterTs;
  if(feedAgeSeconds<0)return fail('FUTURE_FEED_TIMESTAMP');
  if(feedAgeSeconds>maxFeedAgeSeconds)return fail('FEED_TOO_STALE',{feedAgeSeconds,maxFeedAgeSeconds});

  const secondsIntoFollowingDay=afterTs-dayStart;
  const followingDayUnawardedVerified=true;
  const nextEligibleNetworkBetGuaranteedJackpot=true;
  const rtp=finite(conservativeBaseRtpPct);
  const stake=finite(stakeEUR);
  const jackpot=afterAmount;
  let breakEvenFirstBetProbability=null;
  if(rtp!==null&&stake!==null&&stake>0&&jackpot>0&&rtp>=0&&rtp<=100){
    breakEvenFirstBetProbability=((100-rtp)/100*stake)/jackpot;
  }
  const pLower=finite(firstBetProbabilityLowerBound);
  const probabilityGate=breakEvenFirstBetProbability!==null&&pLower!==null&&pLower>=0&&pLower<=1&&raceModelProspectivelyValidated===true&&pLower>breakEvenFirstBetProbability;
  return {
    version:'sporting-legends-overdue-first-bet-v1.1-following-day',
    decision:'NO_PLAY',
    valid:true,
    reason:probabilityGate?'CONDITIONAL_RACE_EV_SCREEN_PASSED_EXECUTION_STILL_GUARDED':'FOLLOWING_DAY_UNAWARDED_VERIFIED_RACE_GATE_OPEN',
    followingDayUnawardedVerified,
    nextEligibleNetworkBetGuaranteedJackpot,
    exactBetfairSpainTickerImsBindingVerified:true,
    followingDayBoundaryVerified:true,
    deadlineEpochSeconds:deadline,
    followingDayStartEpochSeconds:dayStart,
    secondsIntoFollowingDay,
    feedAgeSeconds,maxFeedAgeSeconds,
    beforeGameTimestamp:beforeTs,afterGameTimestamp:afterTs,
    winCount:afterWin,
    currentDailyJackpotEUR:jackpot,
    conservativeBaseRtpPct:rtp,
    stakeEUR:stake,
    breakEvenFirstBetProbability,
    firstBetProbabilityLowerBound:pLower,
    raceModelProspectivelyValidated:raceModelProspectivelyValidated===true,
    conditionalPositiveEvScreenPassed:probabilityGate,
    guards,
  };
}
