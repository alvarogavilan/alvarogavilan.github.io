import { EdgeSentinel as V8EdgeSentinel } from './index-v8.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v9-winfall-prospective-lab-20260824a';
const TIKI_KEY='generic:tikitemple2_1';
const ALICE_KEY='generic:progressivealice1';
const PROTOCOL_FROZEN_AT='2026-08-21T16:21:00.000Z';
const PROTOCOL_FROZEN_AT_MS=Date.parse(PROTOCOL_FROZEN_AT);
const PAIR_EPS_EUR=0.01;
const MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT=10;
const WINFALL_BASE_RTP=0.9485;
const WINFALL_CONTRIBUTION=0.0060;
const WINFALL_RESET_EUR=0;

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function mean(values){
  const a=values.filter(finite).map(Number);
  return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
}
function median(values){
  const a=values.filter(finite).map(Number).sort((a,b)=>a-b);
  if(!a.length)return null;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function summary(values){
  const a=values.filter(finite).map(Number).sort((a,b)=>a-b);
  return {n:a.length,min:a.length?a[0]:null,median:median(a),mean:mean(a),max:a.length?a[a.length-1]:null};
}

export class EdgeSentinel extends V8EdgeSentinel{
  pairedWinfallResetCandidates(limit=200){
    const n=Math.max(1,Math.min(1000,Number(limit)||200));
    return [...this.sql.exec(
      `SELECT a.observed_at_ms AS observed_at_ms,
              a.observed_at AS observed_at,
              a.before_eur AS tiki_before_eur,
              a.after_eur AS tiki_after_eur,
              a.delta_eur AS tiki_delta_eur,
              b.before_eur AS alice_before_eur,
              b.after_eur AS alice_after_eur,
              b.delta_eur AS alice_delta_eur
       FROM science_events a
       JOIN science_events b ON b.observed_at_ms=a.observed_at_ms
       WHERE a.type='RESET_OR_AWARD_CANDIDATE'
         AND b.type='RESET_OR_AWARD_CANDIDATE'
         AND a.meter_key=?
         AND b.meter_key=?
         AND a.observed_at_ms>=?
         AND ABS(a.before_eur-b.before_eur)<=?
         AND ABS(a.after_eur-b.after_eur)<=?
       ORDER BY a.observed_at_ms DESC
       LIMIT ?`,
      TIKI_KEY,ALICE_KEY,PROTOCOL_FROZEN_AT_MS,PAIR_EPS_EUR,PAIR_EPS_EUR,n
    )].map(r=>({
      observedAtMs:Number(r.observed_at_ms),
      observedAt:r.observed_at,
      tiki:{beforeEUR:Number(r.tiki_before_eur),afterEUR:Number(r.tiki_after_eur),deltaEUR:Number(r.tiki_delta_eur)},
      alice:{beforeEUR:Number(r.alice_before_eur),afterEUR:Number(r.alice_after_eur),deltaEUR:Number(r.alice_delta_eur)},
      pairedPreDropEUR:(Number(r.tiki_before_eur)+Number(r.alice_before_eur))/2,
      pairedPostDropEUR:(Number(r.tiki_after_eur)+Number(r.alice_after_eur))/2,
      classification:'SYNCHRONIZED_RESET_OR_AWARD_CANDIDATE_NOT_PRIZE_PROOF'
    }));
  }

  async winfallResearch(limit=200){
    const state=(await this.ctx.storage.get('state'))||{};
    const telemetry=(await this.ctx.storage.get('scienceTelemetryV1'))||{};
    const rows=this.pairedWinfallResetCandidates(limit);
    const pairedCount=rows.length;
    const pre=rows.map(r=>r.pairedPreDropEUR);
    const post=rows.map(r=>r.pairedPostDropEUR);
    const currentTiki=finite(state?.meters?.[TIKI_KEY])?Number(state.meters[TIKI_KEY]):null;
    const currentAlice=finite(state?.meters?.[ALICE_KEY])?Number(state.meters[ALICE_KEY]):null;
    const currentAbsDiffEUR=currentTiki!==null&&currentAlice!==null?Math.abs(currentTiki-currentAlice):null;
    const eligibleForConditionalHazardFit=pairedCount>=MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT;
    const meanPreDropEUR=eligibleForConditionalHazardFit?mean(pre):null;
    const conditionalKPerEUR=meanPreDropEUR!==null&&meanPreDropEUR>0?WINFALL_CONTRIBUTION/meanPreDropEUR:null;
    const conditionalBreakEvenEUR=conditionalKPerEUR!==null?(1-WINFALL_BASE_RTP)/conditionalKPerEUR:null;
    return {
      version:'edge-winfall-prospective-lab-v1',
      observedAt:state?.observedAt||null,
      observedAtMs:state?.observedAtMs||null,
      protocol:{
        frozenAt:PROTOCOL_FROZEN_AT,
        targets:[TIKI_KEY,ALICE_KEY],
        pairToleranceEUR:PAIR_EPS_EUR,
        minimumProspectivePairedResetsForConditionalHazardFit:MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT,
        officialWinfallSpainInputs:{baseRtp:WINFALL_BASE_RTP,contribution:WINFALL_CONTRIBUTION,resetEUR:WINFALL_RESET_EUR,probabilityProportionalToTotalBet:true},
        modelAssumptionForConditionalFit:'P_JACKPOT_PER_DECISION = kPerEUR * stakeEUR WITH k CONSTANT ACROSS JACKPOT VALUES'
      },
      currentPair:{
        [TIKI_KEY]:currentTiki,
        [ALICE_KEY]:currentAlice,
        absDiffEUR:currentAbsDiffEUR,
        withinPairTolerance:currentAbsDiffEUR!==null&&currentAbsDiffEUR<=PAIR_EPS_EUR,
        exactAliasAlreadyDisproved:true,
        exactWinfallLiveIdVerified:false
      },
      telemetry:{
        tiki:telemetry?.meterStats?.[TIKI_KEY]||null,
        alice:telemetry?.meterStats?.[ALICE_KEY]||null
      },
      pairedResetCandidates:{
        prospectiveCandidateCount:pairedCount,
        preDropEUR:summary(pre),
        postDropEUR:summary(post),
        recent:rows.slice(0,20)
      },
      conditionalConstantHazardDiagnostic:{
        eligibleForFit:eligibleForConditionalHazardFit,
        pairedResetCountRequired:MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT,
        pairedResetCountObserved:pairedCount,
        meanPairedPreDropEUR:meanPreDropEUR,
        kPerEURIfPairIsExactWinfallPoolAndCandidatesAreAwards:conditionalKPerEUR,
        breakEvenJackpotEURIfPairIsExactWinfallPoolAndCandidatesAreAwards:conditionalBreakEvenEUR,
        currentWinfallJackpotEUR:null,
        currentRtp:null,
        currentPositiveEvProven:false,
        reasonCurrentEvaluationBlocked:'EXACT_WINFALL_LIVE_ID_NOT_VERIFIED_AND_RESET_CANDIDATES_ARE_NOT_AWARD_PROOF'
      },
      decision:{
        pairedResetCouplingVerified:false,
        exactGameIdentityVerified:false,
        winfallExactLiveIdVerified:false,
        hazardVerified:false,
        thresholdVerified:false,
        economicPromotionAllowed:false,
        realMoneyAllowed:false
      },
      guards:{
        synchronizedDropIsNotJackpotAwardProof:true,
        pairedResetCouplingNeverEqualsGameIdentity:true,
        exactAliasDisproofIsMonotonic:true,
        minimumTenProspectivePairsBeforeAnyConditionalFit:true,
        constantHazardIsAnAssumptionNotPublishedFact:true,
        contributionRateIsNotHazard:true,
        foreignSeedNeverUsed:true,
        currentPairValueCannotBeUsedAsWinfallMeterUntilBound:true,
        conditionalThresholdCannotEnableExecution:true,
        telemetryCannotEnableRealMoney:true,
        executionContractRemainsSoleGreenAuthority:true
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url);
    const path=url.pathname;
    if(path==='/science/winfall'){
      await this.ensureAlarm();
      try{await this.updateScienceTelemetry();}catch{}
      const research=await this.winfallResearch(Number(url.searchParams.get('limit')||200));
      return responseJson({
        ok:true,
        service:'loterias-edge-sentinel',
        deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        deploymentCapabilities:{scienceStatus:true,scienceEvents:true,jpkResetDistributions:true,winfallProspectiveLab:true,persistentSnapshots:true,telegramDeliveryProof:true,executionContractFailClosed:true},
        research
      });
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),winfallProspectiveLab:true};
      return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
