import {deriveProspectiveEmpiricalRaceLowerBound} from './sporting-legends-empirical-race-bound-v1.mjs';

const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const SHA256=/^[a-f0-9]{64}$/i;
const VISUAL_VALIDATOR='sporting-legends-visual-passive-cycle-v1';
const VISUAL_MODE='DIRECT_OFFICIAL_GAME_CLIENT_VISUAL';

export function deriveProspectiveVisualRaceLowerBoundFromValidatedCycles({
  cycles,confidence=0.95,protocolId,actionLatencySeconds,prospectiveProtocolFrozen=false,
}={}){
  const list=Array.isArray(cycles)?cycles:[],pid=text(protocolId),latency=finite(actionLatencySeconds);
  const guards={
    validatedVisualPassiveCycleLedgerRequired:true,
    visualAndTickerCyclesCannotBeMixed:true,
    uniqueCycleIdsRequired:true,
    uniqueScreenshotHashesRequired:true,
    currentVisualCycleCannotAuthorizeItsOwnBet:true,
    noPoissonStationarityAssumption:true,
    noAutomaticWagering:true,
    realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'sporting-legends-visual-empirical-race-bound-v1',valid:false,usableForExecution:false,reason,guards,...extra});
  if(!pid)return fail('MISSING_PROTOCOL_ID');
  if(!(latency>0))return fail('INVALID_ACTION_LATENCY');
  if(prospectiveProtocolFrozen!==true)return fail('PROSPECTIVE_PROTOCOL_NOT_FROZEN');
  if(list.length<1)return fail('NO_VALIDATED_VISUAL_CYCLES');

  const cycleIds=new Set(),evidenceIds=new Set(),hashes=new Set();let k=0;
  for(const x of list){
    if(!x||x.valid!==true||x.usableForRaceEvidence!==true||x.usableForExecution!==false||
      x.validatorVersion!==VISUAL_VALIDATOR||x.evidenceMode!==VISUAL_MODE||x.passiveDryRun!==true||
      x.prospectivelyObserved!==true||x.comparableCycleDefinitionVerified!==true){
      return fail('INVALID_VISUAL_CYCLE_EVIDENCE');
    }
    if(x?.guards?.currentCycleCannotAuthorizeItsOwnRealMoneyAction!==true)return fail('VISUAL_EXECUTION_ISOLATION_GUARD_MISSING');
    const id=text(x.cycleId);
    if(!id||cycleIds.has(id))return fail('MISSING_OR_DUPLICATE_CYCLE_ID');
    cycleIds.add(id);
    if(text(x.protocolId)!==pid)return fail('PROTOCOL_ID_MISMATCH');
    if(finite(x.actionLatencySeconds)!==latency)return fail('ACTION_LATENCY_MISMATCH');
    if(x.outcome!=='SUCCESS'&&x.outcome!=='FAILURE')return fail('INVALID_CYCLE_OUTCOME');
    if(!Array.isArray(x.evidenceIds)||x.evidenceIds.length!==3||!Array.isArray(x.evidenceSha256)||x.evidenceSha256.length!==3)return fail('INCOMPLETE_SCREENSHOT_LEDGER');
    for(const e of x.evidenceIds){
      const v=text(e);if(!v||evidenceIds.has(v))return fail('MISSING_OR_DUPLICATE_EVIDENCE_ID');evidenceIds.add(v);
    }
    for(const h of x.evidenceSha256){
      const v=text(h)?.toLowerCase();if(!v||!SHA256.test(v)||hashes.has(v))return fail('INVALID_OR_DUPLICATE_SCREENSHOT_HASH');hashes.add(v);
    }
    if(x.outcome==='SUCCESS')k++;
  }

  const aggregate=deriveProspectiveEmpiricalRaceLowerBound({
    successfulDryRunCycles:k,totalDryRunCycles:list.length,confidence,
    prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true,
  });
  if(!aggregate.valid)return fail('CLOPPER_PEARSON_BOUND_FAILED',{aggregate});
  return {
    ...aggregate,
    version:'sporting-legends-visual-empirical-race-bound-v1',
    usableForExecution:true,
    reason:'VALIDATED_VISUAL_PASSIVE_CYCLE_CLOPPER_PEARSON_BOUND_AVAILABLE',
    source:'VALIDATED_PASSIVE_CYCLE_LEDGER',
    ledgerSubtype:'VISUAL_OFFICIAL_CLIENT',
    evidenceMode:VISUAL_MODE,
    validatorVersion:VISUAL_VALIDATOR,
    protocolId:pid,actionLatencySeconds:latency,
    cycleIds:[...cycleIds],evidenceIds:[...evidenceIds],evidenceSha256:[...hashes],guards,
  };
}
