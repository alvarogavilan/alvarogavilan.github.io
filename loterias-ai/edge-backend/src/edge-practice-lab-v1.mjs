#!/usr/bin/env node

const VERSION = 'edge-counterfactual-practice-lab-v1';
const EXECUTION = Object.freeze({decision:'NO_PLAY', realMoneyAllowed:false, realStakeEUR:0, maxSpins:0, maxTotalStakeEUR:0});
const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
const pct = v => { const n=num(v); return n===null ? null : n/100; };
const clamp01 = v => Math.max(0, Math.min(1, v));
const round = (v,d=6) => Number.isFinite(v) ? Number(v.toFixed(d)) : null;

function baseResult(kind, provenance){
  return {version:VERSION, kind, provenance, execution:{...EXECUTION}, hardGuards:{practiceOnly:true, syntheticNeverBecomesEvidence:true, noAutomaticBetting:true, noWagerProbe:true, exactCurrentOperatorEvidenceStillRequired:true}};
}
function fail(kind, provenance, reason, missing=[]){
  return {...baseResult(kind,provenance), ok:false, reason, missing};
}
function provenanceOf(value){
  const p=String(value||'SYNTHETIC').toUpperCase();
  return ['SYNTHETIC','HYPOTHESIS','MIXED','VERIFIED_EXACT'].includes(p) ? p : 'HYPOTHESIS';
}

export function evaluateAmountBoundaryPractice(input={}){
  const provenance=provenanceOf(input.provenance);
  const required=['currentAmountEUR','guaranteedHitAmountEUR','qualifyingStakeEUR','baseRtpPct','meterContributionPct','jackpotAwardFloorEUR'];
  const missing=required.filter(k=>num(input[k])===null);
  if(missing.length) return fail('AMOUNT_BOUNDARY_MHB',provenance,'MISSING_REQUIRED_INPUTS',missing);
  const current=num(input.currentAmountEUR), cap=num(input.guaranteedHitAmountEUR), stake=num(input.qualifyingStakeEUR);
  const baseRtp=pct(input.baseRtpPct), contribution=pct(input.meterContributionPct), awardFloor=num(input.jackpotAwardFloorEUR);
  const capture=clamp01(num(input.captureProbability) ?? 1);
  if(!(cap>current && current>=0 && stake>0 && baseRtp>=0 && baseRtp<=1 && contribution>0 && contribution<=1 && awardFloor>=0)){
    return fail('AMOUNT_BOUNDARY_MHB',provenance,'INVALID_INPUT_RANGE');
  }
  const accountingVerified = input.rtpAccountingVerifiedBaseExcludingJackpot === true;
  const gap=cap-current;
  const houseEdge=1-baseRtp;
  const worstCaseCoinIn=gap/contribution;
  const worstCaseSpins=Math.ceil(worstCaseCoinIn/stake);
  const worstCaseBaseLoss=worstCaseCoinIn*houseEdge;
  const jackpotCaptureFloor=awardFloor*capture;
  const robustNetEvFloor=jackpotCaptureFloor-worstCaseBaseLoss;
  const stressFractions=(Array.isArray(input.remainingGapFractions)&&input.remainingGapFractions.length?input.remainingGapFractions:[0.25,0.5,0.75,1])
    .map(num).filter(v=>v!==null&&v>=0&&v<=1);
  const stress=stressFractions.map(f=>{
    const coinIn=worstCaseCoinIn*f;
    const loss=coinIn*houseEdge;
    return {remainingGapFraction:f, assumedCoinInEUR:round(coinIn), expectedBaseLossEUR:round(loss), netEvEUR:round(jackpotCaptureFloor-loss)};
  });
  const breakEvenCaptureProbability=awardFloor>0?clamp01(worstCaseBaseLoss/awardFloor):null;
  const modelUsableForEconomics=accountingVerified;
  const practiceVerdict=!modelUsableForEconomics?'BLOCKED_RTP_ACCOUNTING':(robustNetEvFloor>0?'ROBUST_POSITIVE_IN_PRACTICE':'NOT_ROBUST_POSITIVE_IN_PRACTICE');
  return {
    ...baseResult('AMOUNT_BOUNDARY_MHB',provenance),ok:true,practiceVerdict,modelUsableForEconomics,
    inputs:{currentAmountEUR:current,guaranteedHitAmountEUR:cap,qualifyingStakeEUR:stake,baseRtpPct:num(input.baseRtpPct),meterContributionPct:num(input.meterContributionPct),jackpotAwardFloorEUR:awardFloor,captureProbability:capture,rtpAccountingVerifiedBaseExcludingJackpot:accountingVerified},
    metrics:{gapEUR:round(gap),houseEdgePct:round(houseEdge*100),worstCaseCoinInToBoundaryEUR:round(worstCaseCoinIn),worstCaseSpins,worstCaseBaseLossEUR:round(worstCaseBaseLoss),jackpotCaptureFloorEUR:round(jackpotCaptureFloor),robustNetEvFloorEUR:round(robustNetEvFloor),breakEvenCaptureProbability:round(breakEvenCaptureProbability)},
    stress,
    interpretation: provenance==='VERIFIED_EXACT'?'Even VERIFIED_EXACT inputs remain practice-only here; execution requires a separate current-session gate.':'Synthetic/hypothesis outputs are counterfactual only and cannot populate operator facts.'
  };
}

export function evaluateTimedFirstContributionPractice(input={}){
  const provenance=provenanceOf(input.provenance);
  const required=['qualifyingStakeEUR','baseRtpPct','jackpotAwardFloorEUR','probabilityOurContributionIsFirst'];
  const missing=required.filter(k=>num(input[k])===null);
  if(missing.length) return fail('TIMED_FIRST_CONTRIBUTION',provenance,'MISSING_REQUIRED_INPUTS',missing);
  const stake=num(input.qualifyingStakeEUR), baseRtp=pct(input.baseRtpPct), award=num(input.jackpotAwardFloorEUR), pFirst=clamp01(num(input.probabilityOurContributionIsFirst));
  if(!(stake>0 && baseRtp>=0 && baseRtp<=1 && award>=0)) return fail('TIMED_FIRST_CONTRIBUTION',provenance,'INVALID_INPUT_RANGE');
  const accountingVerified=input.rtpAccountingVerifiedBaseExcludingJackpot===true;
  const ruleVerified=input.firstContributionGuaranteeVerified===true;
  const baseLoss=stake*(1-baseRtp);
  const jackpotEv=award*pFirst;
  const netEv=jackpotEv-baseLoss;
  const breakEvenP=award>0?clamp01(baseLoss/award):null;
  const practiceVerdict=!ruleVerified?'BLOCKED_RULE_NOT_VERIFIED':(!accountingVerified?'BLOCKED_RTP_ACCOUNTING':(netEv>0?'POSITIVE_IN_PRACTICE':'NON_POSITIVE_IN_PRACTICE'));
  return {
    ...baseResult('TIMED_FIRST_CONTRIBUTION',provenance),ok:true,practiceVerdict,
    inputs:{qualifyingStakeEUR:stake,baseRtpPct:num(input.baseRtpPct),jackpotAwardFloorEUR:award,probabilityOurContributionIsFirst:pFirst,firstContributionGuaranteeVerified:ruleVerified,rtpAccountingVerifiedBaseExcludingJackpot:accountingVerified},
    metrics:{baseExpectedLossEUR:round(baseLoss),jackpotExpectedValueEUR:round(jackpotEv),netEvEUR:round(netEv),breakEvenProbabilityOurContributionIsFirst:round(breakEvenP)},
    interpretation:'This models the race mathematically; it does not prove latency, boundary survival, current jackpot state, or that a wager would actually be first.'
  };
}

export function sweepAmountBoundaryPractice(input={}){
  const provenance=provenanceOf(input.provenance);
  const cap=num(input.guaranteedHitAmountEUR), start=num(input.startAmountEUR), steps=Math.max(2,Math.min(5000,Math.floor(num(input.steps)??101)));
  if(!(cap>start)) return fail('AMOUNT_BOUNDARY_SWEEP',provenance,'INVALID_SWEEP_RANGE');
  const rows=[];
  for(let i=0;i<steps;i++){
    const current=start+(cap-start)*(i/(steps-1));
    if(current>=cap) continue;
    const r=evaluateAmountBoundaryPractice({...input,currentAmountEUR:current});
    if(r.ok) rows.push({currentAmountEUR:round(current),practiceVerdict:r.practiceVerdict,robustNetEvFloorEUR:r.metrics.robustNetEvFloorEUR,worstCaseCoinInToBoundaryEUR:r.metrics.worstCaseCoinInToBoundaryEUR});
  }
  const firstRobustPositive=rows.find(r=>r.practiceVerdict==='ROBUST_POSITIVE_IN_PRACTICE')||null;
  return {...baseResult('AMOUNT_BOUNDARY_SWEEP',provenance),ok:true,rows,firstRobustPositive,execution:{...EXECUTION},note:'Grid threshold is a practice threshold under supplied assumptions, never an operator execution threshold.'};
}

export function rankPracticeCandidates(candidates=[]){
  if(!Array.isArray(candidates)) return fail('PRACTICE_RANKING','SYNTHETIC','CANDIDATES_ARRAY_REQUIRED');
  const evaluated=candidates.map((c,index)=>{
    const r=c.kind==='TIMED_FIRST_CONTRIBUTION'?evaluateTimedFirstContributionPractice(c):evaluateAmountBoundaryPractice(c);
    const ev=r.ok?(r.metrics.robustNetEvFloorEUR ?? r.metrics.netEvEUR ?? -Infinity):-Infinity;
    return {index,id:c.id||`candidate-${index+1}`,kind:c.kind||'AMOUNT_BOUNDARY_MHB',practiceVerdict:r.practiceVerdict||r.reason,practiceEvEUR:Number.isFinite(ev)?ev:null,result:r};
  });
  evaluated.sort((a,b)=>(b.practiceEvEUR??-Infinity)-(a.practiceEvEUR??-Infinity));
  return {...baseResult('PRACTICE_RANKING','MIXED'),ok:true,ranked:evaluated,execution:{...EXECUTION}};
}

export function syntheticDemo(){
  return rankPracticeCandidates([
    {id:'synthetic-amount-boundary',kind:'AMOUNT_BOUNDARY_MHB',provenance:'SYNTHETIC',currentAmountEUR:990,guaranteedHitAmountEUR:1000,qualifyingStakeEUR:1,baseRtpPct:94.5,meterContributionPct:1,jackpotAwardFloorEUR:990,captureProbability:0.5,rtpAccountingVerifiedBaseExcludingJackpot:true},
    {id:'synthetic-timed-first',kind:'TIMED_FIRST_CONTRIBUTION',provenance:'SYNTHETIC',qualifyingStakeEUR:1,baseRtpPct:94.5,jackpotAwardFloorEUR:50,probabilityOurContributionIsFirst:0.1,firstContributionGuaranteeVerified:true,rtpAccountingVerifiedBaseExcludingJackpot:true}
  ]);
}

if(import.meta.url===`file://${process.argv[1]}`){
  const arg=process.argv[2];
  if(arg==='--demo') process.stdout.write(`${JSON.stringify(syntheticDemo(),null,2)}\n`);
  else process.stdout.write(`${JSON.stringify({version:VERSION,usage:'node edge-practice-lab-v1.mjs --demo',execution:EXECUTION},null,2)}\n`);
}
