import { EdgeSentinel as V9EdgeSentinel } from './index-v9.mjs';
import { exponentialMeanConfidence } from './winfall-confidence-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v10-winfall-confidence-20260824a';
const WINFALL_BASE_RTP=0.9485;
const WINFALL_CONTRIBUTION=0.0060;
const MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT=10;
const CONFIDENCE_LEVEL=0.95;

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}

export class EdgeSentinel extends V9EdgeSentinel{
  async winfallResearch(limit=200){
    const research=await super.winfallResearch(limit);
    const rows=this.pairedWinfallResetCandidates(limit);
    const pre=rows.map(r=>r.pairedPreDropEUR);
    const ci=exponentialMeanConfidence(pre,{confidence:CONFIDENCE_LEVEL,minimumSampleSize:MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT});
    const factor=(1-WINFALL_BASE_RTP)/WINFALL_CONTRIBUTION;
    const point=ci?factor*ci.meanPointEUR:null;
    const twoLower=ci?factor*ci.meanTwoSidedLowerEUR:null;
    const twoUpper=ci?factor*ci.meanTwoSidedUpperEUR:null;
    const conservativeUpper95=ci?factor*ci.meanOneSidedUpperEUR:null;
    const kPoint=ci?WINFALL_CONTRIBUTION/ci.meanPointEUR:null;
    const kLower95=ci?WINFALL_CONTRIBUTION/ci.meanOneSidedUpperEUR:null;
    research.version='edge-winfall-prospective-lab-v2-confidence';
    research.protocol.confidencePolicy={
      enabledAfterMinimumProspectivePairs:true,
      confidenceLevel:CONFIDENCE_LEVEL,
      distributionAssumption:'PAIRED_PRE_DROP_JACKPOT_AMOUNTS_ARE_IID_EXPONENTIAL_UNDER_CONSTANT_HAZARD_AND_ZERO_RESET',
      exactSpainResetEUR:0,
      exactSpainContribution:WINFALL_CONTRIBUTION,
      conservativeEntryConcept:'CURRENT_VERIFIED_WINFALL_METER_MUST_EXCEED_ONE_SIDED_95_PERCENT_UPPER_BREAK_EVEN_BOUND_BEFORE_STATISTICS_CAN_SUPPORT_ENTRY',
      executionAuthority:false
    };
    research.conditionalConstantHazardDiagnostic={
      ...research.conditionalConstantHazardDiagnostic,
      confidenceIntervalAvailable:ci!==null,
      confidenceLevel:ci?.confidenceLevel||null,
      hitMeterMeanTwoSided95EUR:ci?{lower:ci.meanTwoSidedLowerEUR,point:ci.meanPointEUR,upper:ci.meanTwoSidedUpperEUR}:null,
      kPerEURLower95IfAssumptionsHold:kLower95,
      kPerEURPointIfAssumptionsHold:kPoint,
      breakEvenJackpotTwoSided95EUR:ci?{lower:twoLower,point,upper:twoUpper}:null,
      conservativeBreakEvenUpper95EUR:conservativeUpper95,
      conservativePositiveEvStatisticalScreenPassed:false,
      conservativePositiveEvStatisticalScreenReason:'CURRENT_EXACT_WINFALL_METER_IS_NOT_BOUND; CONFIDENCE_BOUNDS_ARE_CONDITIONAL_RESEARCH_ONLY',
      confidenceMethod:ci?.method||null
    };
    research.decision={
      ...research.decision,
      confidenceBoundComputed:ci!==null,
      confidenceBoundVerified:false,
      conservativeThresholdVerified:false,
      realMoneyAllowed:false
    };
    research.guards={
      ...research.guards,
      pointEstimateCannotEnableExecution:true,
      oneSided95UpperBreakEvenRequiredForAnyFutureStatisticalPromotion:true,
      exponentialDistributionIsModelAssumptionNotPublishedFact:true,
      confidenceIntervalDoesNotRepairIdentityOrAwardAttribution:true,
      confidenceBoundCannotEnableRealMoney:true
    };
    return research;
  }

  async fetch(request){
    const url=new URL(request.url);
    const path=url.pathname;
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),winfallConfidenceBounds:true,pointEstimateCannotEnableExecution:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
