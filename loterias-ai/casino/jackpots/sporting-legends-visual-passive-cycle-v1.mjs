const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const upper=(v)=>text(v)?.toUpperCase()??null;
const SHA256=/^[a-f0-9]{64}$/i;
const SOURCE='BETFAIR_ES_OFFICIAL_GAME_CLIENT_SCREENSHOT';
const GAME_ID='ap-mccoy-sporting-legends-cptn';

function normalizeObservation(x){
  if(!x||typeof x!=='object')return null;
  const out={
    evidenceId:text(x.evidenceId),evidenceSha256:text(x.evidenceSha256),sourceClass:text(x.sourceClass),
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

function sameVisualBinding(rows){
  const a=rows[0];
  return !!a&&rows.every(x=>x.sourceClass===a.sourceClass&&x.market===a.market&&x.operator===a.operator&&x.gameId===a.gameId&&x.gameTitle===a.gameTitle&&x.tier===a.tier&&x.stakeEUR===a.stakeEUR);
}

export function validateSportingLegendsVisualPassiveCycle({
  cycleId,protocolId,protocolFrozenAtEpochSeconds,recordedAtEpochSeconds,
  beforeBoundary,detection,confirmation,actionLatencySeconds,
  maxBoundaryTimingErrorSeconds=3,maxConfirmationLagSeconds=30,
}={}){
  const guards={
    passiveDryRunOnly:true,noWagerRequired:true,noAutomaticWagering:true,
    directOfficialClientVisualEvidenceRequired:true,screenshotHashRequired:true,humanReviewRequired:true,
    visualCycleCannotSubstituteForFinalLiveRecheck:true,headlinePageCannotSubstituteForInGameDailyCounter:true,
    currentCycleCannotAuthorizeItsOwnRealMoneyAction:true,realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-visual-passive-cycle-v1',valid:false,usableForRaceEvidence:false,usableForExecution:false,reason,guards,...extra});
  const id=text(cycleId),pid=text(protocolId),freeze=finite(protocolFrozenAtEpochSeconds),recorded=finite(recordedAtEpochSeconds),latency=finite(actionLatencySeconds),timingError=finite(maxBoundaryTimingErrorSeconds),maxConfirm=finite(maxConfirmationLagSeconds);
  if(!id)return fail('MISSING_CYCLE_ID');if(!pid)return fail('MISSING_PROTOCOL_ID');
  if([freeze,recorded,latency,timingError,maxConfirm].some(v=>v===null))return fail('INCOMPLETE_PROTOCOL_FIELDS');
  if(!(latency>0&&timingError>=0&&maxConfirm>=latency))return fail('INVALID_TIMING_POLICY');
  const rows=[beforeBoundary,detection,confirmation].map(normalizeObservation);
  if(rows.some(x=>!x))return fail('INVALID_VISUAL_OBSERVATION');
  const [before,detect,confirm]=rows;
  if(!sameVisualBinding(rows))return fail('VISUAL_BINDING_OR_STAKE_CHANGED');
  if(rows.some(x=>x.sourceClass!==SOURCE||x.market!=='ES'||x.operator!=='Betfair Spain'||x.gameId!==GAME_ID||x.tier!=='DAILY'))return fail('NOT_EXACT_BETFAIR_ES_APMCCOY_DAILY_CLIENT');
  if(rows.some(x=>!x.imageEvidencePresent||!x.humanReviewVerified||!x.exactGameIdentityVisible||!x.exactDailyLabelVisible||!x.exactDisplayedValuesVerified||!x.officialClientIdentityVerified))return fail('UNVERIFIED_VISUAL_EVIDENCE');
  if(new Set(rows.map(x=>x.evidenceId)).size!==3||new Set(rows.map(x=>x.evidenceSha256.toLowerCase())).size!==3)return fail('DUPLICATE_SCREENSHOT_EVIDENCE');
  if(rows.some(x=>!(x.amountEUR>0)||!(x.stakeEUR>0)||x.countdownSeconds<0))return fail('INVALID_DISPLAYED_VALUES');
  if(!(freeze<=before.capturedAtEpochSeconds&&before.capturedAtEpochSeconds<detect.capturedAtEpochSeconds&&detect.capturedAtEpochSeconds<confirm.capturedAtEpochSeconds))return fail('INVALID_CAPTURE_ORDER');
  if(recorded<confirm.capturedAtEpochSeconds)return fail('RECORDED_BEFORE_CONFIRMATION');
  if(!(before.countdownSeconds>0&&detect.countdownSeconds===0&&confirm.countdownSeconds===0))return fail('DAILY_BOUNDARY_NOT_VISUALLY_BRACKETED');
  const estimatedBoundary=before.capturedAtEpochSeconds+before.countdownSeconds;
  const detectionBoundaryError=Math.abs(detect.capturedAtEpochSeconds-estimatedBoundary);
  if(detectionBoundaryError>timingError)return fail('VISUAL_BOUNDARY_TIMING_MISMATCH',{estimatedBoundary,detectionBoundaryError,maxBoundaryTimingErrorSeconds:timingError});
  if(detect.amountEUR<before.amountEUR)return fail('RESET_OR_AWARD_AT_DETECTION');
  if(confirm.capturedAtEpochSeconds-detect.capturedAtEpochSeconds<latency)return fail('CONFIRMATION_BEFORE_HYPOTHETICAL_ACTION_COMPLETION');
  if(confirm.capturedAtEpochSeconds-detect.capturedAtEpochSeconds>maxConfirm)return fail('CONFIRMATION_TOO_LATE_FOR_COMPARABLE_RACE_WINDOW');
  const survived=confirm.amountEUR>=detect.amountEUR;
  return {
    version:'sporting-legends-visual-passive-cycle-v1',validatorVersion:'sporting-legends-visual-passive-cycle-v1',
    valid:true,usableForRaceEvidence:true,usableForExecution:false,
    cycleId:id,protocolId:pid,prospectivelyObserved:true,comparableCycleDefinitionVerified:true,passiveDryRun:true,
    evidenceMode:'DIRECT_OFFICIAL_GAME_CLIENT_VISUAL',actionLatencySeconds:latency,outcome:survived?'SUCCESS':'FAILURE',
    stakeEUR:detect.stakeEUR,dailyAmountAtDetectionEUR:detect.amountEUR,estimatedBoundaryEpochSeconds:estimatedBoundary,
    detectionTimestamp:detect.capturedAtEpochSeconds,confirmationTimestamp:confirm.capturedAtEpochSeconds,
    zeroArrivalWindowAtDetectionSeconds:Math.max(0,detect.capturedAtEpochSeconds-estimatedBoundary),
    survivedHypotheticalActionWindow:survived,evidenceIds:rows.map(x=>x.evidenceId),evidenceSha256:rows.map(x=>x.evidenceSha256.toLowerCase()),guards,
  };
}
