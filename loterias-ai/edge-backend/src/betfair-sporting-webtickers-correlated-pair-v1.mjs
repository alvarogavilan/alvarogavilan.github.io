import {analyzeBetfairSportingCorrelatedWebtickersSession} from './betfair-sporting-webtickers-correlated-session-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>String(v??'').trim().toLowerCase();

function fail(reason,extra={}){
  return {
    version:'betfair-sporting-webtickers-correlated-pair-v1',
    mode:'OFFLINE_PASSIVE_MODERN_PAIR_CONTINUITY_CANDIDATE_NO_PLAY',
    valid:false,reason,
    pairCandidateVerified:false,
    sameCycleContinuityCandidate:false,
    deadlineCrossedCandidate:false,
    unawardedAcrossDeadlineCandidate:false,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    ...extra,
  };
}
function oneCandidate(analysis){
  const c=analysis?.correlatedExactDailyCandidates||[];
  return c.length===1?c[0]:null;
}
function endpoint(c){return text(c?.responseRow?.configuredEndpoint)||text(c?.request?.endpoint);}
function row(c){return c?.responseRow?.row||{};}

export function analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar,afterHar,beforeSourceName='before.har',afterSourceName='after.har'}={}){
  let before,after;
  try{before=analyzeBetfairSportingCorrelatedWebtickersSession(beforeHar,{sourceName:beforeSourceName});}catch{return fail('BEFORE_ANALYSIS_FAILED');}
  try{after=analyzeBetfairSportingCorrelatedWebtickersSession(afterHar,{sourceName:afterSourceName});}catch{return fail('AFTER_ANALYSIS_FAILED');}
  const b=oneCandidate(before),a=oneCandidate(after);
  if(!b)return fail('BEFORE_EXACT_CORRELATED_CANDIDATE_NOT_UNIQUE',{before,after});
  if(!a)return fail('AFTER_EXACT_CORRELATED_CANDIDATE_NOT_UNIQUE',{before,after});

  const bRow=row(b),aRow=row(a);
  const bCasino=text(b.expectedBetfairImsCasino),aCasino=text(a.expectedBetfairImsCasino);
  const bEndpoint=endpoint(b),aEndpoint=endpoint(a);
  const sameCasino=!!bCasino&&lower(bCasino)===lower(aCasino);
  const sameEndpoint=!!bEndpoint&&bEndpoint===aEndpoint;
  if(!sameCasino||!sameEndpoint)return fail('BETFAIR_BINDING_CHANGED_BETWEEN_CAPTURES',{before,after,sameCasino,sameEndpoint});

  const bGht=finite(bRow.guaranteedHitTime),aGht=finite(aRow.guaranteedHitTime);
  const bTs=finite(bRow.gameTimestamp),aTs=finite(aRow.gameTimestamp);
  const bWin=finite(bRow.winCount),aWin=finite(aRow.winCount);
  const bAmount=finite(bRow.amount),aAmount=finite(aRow.amount);
  if([bGht,aGht,bTs,aTs,bWin,aWin,bAmount,aAmount].some(v=>v===null))return fail('INCOMPLETE_STRUCTURED_PAIR_STATE',{before,after});

  const sameGuaranteedHitTime=bGht===aGht;
  const winCountUnchanged=bWin===aWin;
  const amountNondecreasing=aAmount>=bAmount;
  const serverTimeAdvanced=aTs>bTs;
  const deadlineCrossedCandidate=bTs<=bGht&&aTs>bGht;
  const sameCycleContinuityCandidate=sameGuaranteedHitTime&&winCountUnchanged&&amountNondecreasing&&serverTimeAdvanced;
  const unawardedAcrossDeadlineCandidate=sameCycleContinuityCandidate&&deadlineCrossedCandidate;

  return {
    version:'betfair-sporting-webtickers-correlated-pair-v1',
    mode:'OFFLINE_PASSIVE_MODERN_PAIR_CONTINUITY_CANDIDATE_NO_PLAY',
    valid:true,
    beforeCandidate:b,
    afterCandidate:a,
    sameBetfairImsCasino:sameCasino,
    sameConfiguredEndpoint:sameEndpoint,
    sameGuaranteedHitTime,
    winCountUnchanged,
    amountNondecreasing,
    serverTimeAdvanced,
    deadlineCrossedCandidate,
    sameCycleContinuityCandidate,
    unawardedAcrossDeadlineCandidate,
    pairCandidateVerified:unawardedAcrossDeadlineCandidate,
    exactModernResponseSemanticsVerified:false,
    usableForOverduePair:false,
    scientificUse:'Compares two exact AP McCoy same-entry correlated modern webtickers candidates. It requires the same Betfair casino binding and configured endpoint, then checks same GHT, unchanged win count, nondecreasing amount, advancing server timestamp and a timestamp crossing of GHT. These are continuity candidates only: until the exact modern response schema and field semantics are independently verified for Betfair Spain, this pair must not be treated as server-proven overdue state.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,exactApMcCoyCorrelatedCandidateRequiredOnBothCaptures:true,sameBetfairCasinoAndConfiguredEndpointRequired:true,sameGhtAndWinCountRequiredForContinuity:true,modernResponseSemanticsCannotBeGuessed:true,pairCandidateCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}
