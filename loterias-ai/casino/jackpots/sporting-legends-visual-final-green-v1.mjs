const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=(v)=>text(v)?.toUpperCase()??null;
const SHA256=/^[a-f0-9]{64}$/i;
const SOURCE='BETFAIR_ES_OFFICIAL_GAME_CLIENT_SCREENSHOT';
const GAME_ID='ap-mccoy-sporting-legends-cptn';
const RACE_SOURCE='VALIDATED_PASSIVE_CYCLE_LEDGER';
const LEDGER_SUBTYPE='VISUAL_OFFICIAL_CLIENT';

function normalizeObservation(x){
  if(!x||typeof x!=='object')return null;
  const out={
    evidenceId:text(x.evidenceId),evidenceSha256:text(x.evidenceSha256)?.toLowerCase(),sourceClass:text(x.sourceClass),
    market:upper(x.market),operator:text(x.operator),gameId:text(x.gameId),gameTitle:text(x.gameTitle),tier:upper(x.tier),
    capturedAtEpochSeconds:finite(x.capturedAtEpochSeconds),amountEUR:finite(x.amountEUR),countdownSeconds:finite(x.countdownSeconds),stakeEUR:finite(x.stakeEUR),
    imageEvidencePresent:x.imageEvidencePresent===true,humanReviewVerified:x.humanReviewVerified===true,
    exactGameIdentityVisible:x.exactGameIdentityVisible===true,exactDailyLabelVisible:x.exactDailyLabelVisible===true,
    exactDisplayedValuesVerified:x.exactDisplayedValuesVerified===true,officialClientIdentityVerified:x.officialClientIdentityVerified===true,
  };
  if(!out.evidenceId||!out.evidenceSha256||!SHA256.test(out.evidenceSha256)||!out.sourceClass||!out.operator||!out.gameId||!out.gameTitle||!out.tier)return null;
  if([out.capturedAtEpochSeconds,out.amountEUR,out.countdownSeconds,out.stakeEUR].some(v=>v===null))return null;
  return out;
}

function exactOfficialDaily(x){
  return !!x&&x.sourceClass===SOURCE&&x.market==='ES'&&x.operator==='Betfair Spain'&&x.gameId===GAME_ID&&x.tier==='DAILY'&&
    x.imageEvidencePresent&&x.humanReviewVerified&&x.exactGameIdentityVisible&&x.exactDailyLabelVisible&&x.exactDisplayedValuesVerified&&x.officialClientIdentityVerified;
}

export function evaluateSportingLegendsVisualFinalGreen({
  priorRaceEvidence,currentCycleId,protocolId,protocolFrozenAtEpochSeconds,
  beforeBoundary,detection,nowEpochSeconds=Math.floor(Date.now()/1000),
  actionLatencySeconds,conservativeBaseRtpPct=93.03,confidenceFloor=0.95,
  maxBoundaryTimingErrorSeconds=3,maxDetectionAgeSeconds=2,
}={}){
  const guards={
    priorProspectiveVisualRaceLedgerRequired:true,currentCycleExcludedFromPriorLedger:true,
    exactOfficialBetfairDailyVisualRequired:true,twoDistinctCurrentScreenshotsRequired:true,
    currentRecheckMustBracketDisplayedBoundary:true,currentDetectionMustBeFresh:true,
    noTickerRequiredForVisualFinalRoute:true,headlinePageCannotSubstituteForInGameDailyCounter:true,
    noAutomaticWagering:true,manualActionOnly:true,maxOneSpin:true,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-visual-final-green-v1',decision:'NO_PLAY',valid:false,reason,realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,guards,...extra});
  const race=priorRaceEvidence;
  if(!race||race.valid!==true||race.usableForExecution!==true||race.source!==RACE_SOURCE||race.ledgerSubtype!==LEDGER_SUBTYPE)return fail('PRIOR_VISUAL_RACE_LEDGER_NOT_VALIDATED');
  const pLower=finite(race.firstBetRaceProbabilityLowerBound),conf=finite(race.confidence),latency=finite(actionLatencySeconds),raceLatency=finite(race.actionLatencySeconds);
  if(pLower===null||pLower<0||pLower>1)return fail('INVALID_RACE_PROBABILITY_LOWER_BOUND');
  if(conf===null||conf<confidenceFloor)return fail('RACE_CONFIDENCE_BELOW_FLOOR',{confidence:conf,confidenceFloor});
  if(!(latency>0)||raceLatency!==latency)return fail('ACTION_LATENCY_MISMATCH');
  const pid=text(protocolId),racePid=text(race.protocolId),cycleId=text(currentCycleId),freeze=finite(protocolFrozenAtEpochSeconds),now=finite(nowEpochSeconds);
  if(!pid||pid!==racePid)return fail('PROTOCOL_ID_MISMATCH');
  if(!cycleId||!freeze||now===null)return fail('INCOMPLETE_CURRENT_PROTOCOL_FIELDS');
  if(Array.isArray(race.cycleIds)&&race.cycleIds.includes(cycleId))return fail('CURRENT_CYCLE_ALREADY_IN_PRIOR_LEDGER');

  const before=normalizeObservation(beforeBoundary),detect=normalizeObservation(detection);
  if(!exactOfficialDaily(before)||!exactOfficialDaily(detect))return fail('UNVERIFIED_CURRENT_OFFICIAL_DAILY_VISUAL');
  if(before.evidenceId===detect.evidenceId||before.evidenceSha256===detect.evidenceSha256)return fail('DUPLICATE_CURRENT_SCREENSHOT_EVIDENCE');
  const priorIds=new Set(Array.isArray(race.evidenceIds)?race.evidenceIds.map(text).filter(Boolean):[]);
  const priorHashes=new Set(Array.isArray(race.evidenceSha256)?race.evidenceSha256.map(x=>text(x)?.toLowerCase()).filter(Boolean):[]);
  if(priorIds.has(before.evidenceId)||priorIds.has(detect.evidenceId)||priorHashes.has(before.evidenceSha256)||priorHashes.has(detect.evidenceSha256))return fail('CURRENT_EVIDENCE_REUSED_FROM_PRIOR_LEDGER');
  if(before.gameTitle!==detect.gameTitle||before.stakeEUR!==detect.stakeEUR)return fail('CURRENT_VISUAL_BINDING_OR_STAKE_CHANGED');
  if(!(before.stakeEUR>0&&before.amountEUR>0&&detect.amountEUR>0))return fail('INVALID_CURRENT_STAKE_OR_AMOUNT');
  if(!(freeze<=before.capturedAtEpochSeconds&&before.capturedAtEpochSeconds<detect.capturedAtEpochSeconds&&detect.capturedAtEpochSeconds<=now))return fail('INVALID_CURRENT_CAPTURE_ORDER');
  if(!(before.countdownSeconds>0&&detect.countdownSeconds===0))return fail('CURRENT_DAILY_BOUNDARY_NOT_BRACKETED');
  const estimatedBoundary=before.capturedAtEpochSeconds+before.countdownSeconds;
  const boundaryError=Math.abs(detect.capturedAtEpochSeconds-estimatedBoundary);
  if(boundaryError>maxBoundaryTimingErrorSeconds)return fail('CURRENT_BOUNDARY_TIMING_MISMATCH',{estimatedBoundaryEpochSeconds:estimatedBoundary,boundaryErrorSeconds:boundaryError});
  if(detect.amountEUR<before.amountEUR)return fail('CURRENT_DAILY_RESET_OR_AWARD_DETECTED');
  const detectionAgeSeconds=now-detect.capturedAtEpochSeconds;
  if(detectionAgeSeconds<0||detectionAgeSeconds>maxDetectionAgeSeconds)return fail('CURRENT_DETECTION_TOO_STALE',{detectionAgeSeconds,maxDetectionAgeSeconds});

  const rtp=finite(conservativeBaseRtpPct),stake=detect.stakeEUR,jackpot=detect.amountEUR;
  if(rtp===null||!(rtp>0&&rtp<100))return fail('INVALID_CONSERVATIVE_RTP');
  const breakEvenFirstBetProbability=((100-rtp)/100*stake)/jackpot;
  const conservativeExpectedReturnPct=rtp+(pLower*jackpot/stake*100);
  const green=pLower>breakEvenFirstBetProbability&&conservativeExpectedReturnPct>100;
  return {
    version:'sporting-legends-visual-final-green-v1',valid:true,
    decision:green?'GREEN':'NO_PLAY',
    reason:green?'GREEN_VISUAL_OVERDUE_FIRST_BET_PRIOR_LEDGER_AND_FRESH_RECHECK':'VISUAL_RACE_BOUND_BELOW_BREAK_EVEN',
    source:'DIRECT_OFFICIAL_GAME_CLIENT_VISUAL_FINAL_RECHECK',protocolId:pid,currentCycleId:cycleId,
    currentDailyAmountEUR:jackpot,stakeEUR:stake,conservativeBaseRtpPct:rtp,
    firstBetRaceProbabilityLowerBound:pLower,confidence:conf,breakEvenFirstBetProbability,conservativeExpectedReturnPct,
    estimatedBoundaryEpochSeconds:estimatedBoundary,detectionTimestamp:detect.capturedAtEpochSeconds,detectionAgeSeconds,
    actionLatencySeconds:latency,
    realMoneyAllowed:green,realStakeEUR:green?stake:0,maxSpins:green?1:0,maxTotalStakeEUR:green?stake:0,
    manualActionRequired:green,guards,
  };
}
