import { EdgeSentinel as V17EdgeSentinel } from './index-v17.mjs';
import { EXTERNAL_JACKPOT_HISTORY_REFERENCES,EXTERNAL_REFERENCE_LINKS_BY_METER } from './external-jackpot-history-references-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v18-jackpot-history-depth-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
const refMap=new Map(EXTERNAL_JACKPOT_HISTORY_REFERENCES.map(x=>[x.referenceId,x]));

function depthClass({observations,candidateCycles,fullCycles,verifiedAwards}){
  if(verifiedAwards>=30)return 'VERIFIED_AWARD_HISTORY_30_PLUS';
  if(verifiedAwards>=10)return 'VERIFIED_AWARD_HISTORY_10_TO_29';
  if(fullCycles>=30)return 'DIRECT_FULL_CYCLES_30_PLUS_UNVERIFIED_AWARDS';
  if(fullCycles>=10)return 'DIRECT_FULL_CYCLES_10_TO_29_UNVERIFIED_AWARDS';
  if(candidateCycles>0)return 'SPARSE_CANDIDATE_CYCLES';
  if(observations>0)return 'TELEMETRY_ONLY_NO_CYCLES';
  return 'NO_DIRECT_HISTORY';
}

export class EdgeSentinel extends V17EdgeSentinel{
  historyDepthRows(){
    const ath=[...this.sql.exec(`SELECT meter_key,observations,first_seen_at,last_seen_at,min_eur,max_eur FROM meter_ath ORDER BY meter_key ASC`)];
    const cycleAgg=new Map([...this.sql.exec(`SELECT meter_key,
      COUNT(*) AS candidate_cycles,
      SUM(CASE WHEN start_boundary_exact=1 THEN 1 ELSE 0 END) AS full_cycles,
      SUM(CASE WHEN award_verified=1 THEN 1 ELSE 0 END) AS verified_awards,
      MIN(cycle_ended_at) AS first_cycle_at,
      MAX(cycle_ended_at) AS last_cycle_at
      FROM meter_cycles GROUP BY meter_key`)].map(r=>[r.meter_key,r]));
    return ath.map(r=>{
      const c=cycleAgg.get(r.meter_key)||{};
      const observations=Number(r.observations||0),candidateCycles=Number(c.candidate_cycles||0),fullCycles=Number(c.full_cycles||0),verifiedAwards=Number(c.verified_awards||0);
      const linked=(EXTERNAL_REFERENCE_LINKS_BY_METER[r.meter_key]||[]).map(id=>refMap.get(id)).filter(Boolean).map(x=>({
        referenceId:x.referenceId,family:x.family,provider:x.provider,winsRecorded:x.winsRecorded||0,trackedSince:x.trackedSince||null,sourcePublisher:x.sourcePublisher,sourceUrl:x.sourceUrl,relationToSpain:x.relationToSpain,fullRawRowsInEdge:x.fullRawRowsInEdge,overlapGroup:x.overlapGroup||null,transferAllowed:false
      }));
      return {
        meterKey:r.meter_key,
        directSpain:{
          observations,
          firstSeenAt:r.first_seen_at||null,
          lastSeenAt:r.last_seen_at||null,
          observedMinEUR:Number(r.min_eur),
          observedMaxEUR:Number(r.max_eur),
          candidateCycles,
          fullObservedCycles:fullCycles,
          verifiedAwards,
          firstCandidateAt:c.first_cycle_at||null,
          lastCandidateAt:c.last_cycle_at||null,
          timingSampleN:fullCycles,
          awardSampleN:verifiedAwards
        },
        externalHistoricalReferences:linked,
        evidenceDepthClass:depthClass({observations,candidateCycles,fullCycles,verifiedAwards}),
        interpretation:{telemetryRowsAreNotJackpotWins:true,timingNIsFullObservedCyclesNotMeterTicks:true,verifiedAwardNIsStricterThanCycleN:true,externalWinsAreNotAddedToSpanishN:true}
      };
    });
  }

  historyDepthResearch(meterKey=null){
    const all=this.historyDepthRows();const rows=meterKey?all.filter(r=>r.meterKey===meterKey):all;
    const directObservations=all.reduce((s,r)=>s+r.directSpain.observations,0);
    const candidateCycles=all.reduce((s,r)=>s+r.directSpain.candidateCycles,0);
    const fullCycles=all.reduce((s,r)=>s+r.directSpain.fullObservedCycles,0);
    const verifiedAwards=all.reduce((s,r)=>s+r.directSpain.verifiedAwards,0);
    const providerAggregates=EXTERNAL_JACKPOT_HISTORY_REFERENCES.filter(r=>r.isProviderAggregate===true);
    const nonOverlappingAggregateWins=providerAggregates.reduce((s,r)=>s+Number(r.winsRecorded||0),0);
    const individualReferenceWins=EXTERNAL_JACKPOT_HISTORY_REFERENCES.filter(r=>r.isProviderAggregate!==true).reduce((s,r)=>s+Number(r.winsRecorded||0),0);
    return {
      version:'edge-jackpot-history-depth-v1.1-overlap-safe',
      generatedAt:new Date().toISOString(),
      rows,
      summary:{
        metersTracked:all.length,
        directMeterObservations:directObservations,
        directCandidateCycles:candidateCycles,
        directFullObservedCycles:fullCycles,
        directVerifiedAwards:verifiedAwards,
        externalReferenceDatasets:EXTERNAL_JACKPOT_HISTORY_REFERENCES.length,
        externalReferenceProviderAggregates:providerAggregates.length,
        externalReferenceProviderAggregateWinsNonOverlapping:nonOverlappingAggregateWins,
        externalIndividualSeriesWinsDeclaredOverlapping:individualReferenceWins,
        externalRawRowsFullyIngestedIntoEdge:0
      },
      externalReferences:EXTERNAL_JACKPOT_HISTORY_REFERENCES,
      sampleSemantics:{
        meterObservation:'One timestamped jackpot-meter reading. Millions of these can still contain only a few jackpot cycles.',
        candidateCycle:'A large reset-like boundary inferred from direct telemetry. It is not automatically a jackpot award.',
        fullObservedCycle:'A cycle observed from one reset-like boundary to the next. This is the relevant n for interval/timing descriptions.',
        verifiedAward:'A cycle boundary independently verified as an actual jackpot award. This is the strongest event sample.',
        externalReferenceWin:'A historical win reported by an external tracker. It never increments the Spanish sample without configuration identity proof.',
        overlapRule:'Individual external series can be subsets of provider aggregates and are never arithmetically added to those aggregates.'
      },
      guards:{
        observationCountCannotMasqueradeAsWinCount:true,
        externalHistoryCannotIncreaseSpanishSampleN:true,
        externalOverlapCannotInflateReferenceCount:true,
        foreignAverageTimeCannotPredictSpanishNextHit:true,
        configurationIdentityRequiredBeforeParameterTransfer:true,
        externalReferencesCanGenerateHypothesesOnly:true,
        timingResearchCannotEnableRealMoney:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/history-depth'){
      await this.ensureAlarm();try{await this.updateCycleLedger();await this.updateAthLedger();}catch{}
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{jackpotHistoryDepth:true,sampleSemantics:true,externalReferenceRegistry:true,overlapSafeReferenceCounts:true,executionContractFailClosed:true},research:this.historyDepthResearch(url.searchParams.get('meter')||null)});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),jackpotHistoryDepth:true,externalReferenceRegistry:true,overlapSafeReferenceCounts:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
