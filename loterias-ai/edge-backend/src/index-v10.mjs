import { EdgeSentinel as V9EdgeSentinel } from './index-v9.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v10-winfall-confidence-20260824a';
const WINFALL_BASE_RTP=0.9485;
const WINFALL_CONTRIBUTION=0.0060;
const MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT=10;
const CONFIDENCE_LEVEL=0.95;

function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}

function logGamma(z){
  const p=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(z<0.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1;
  let x=p[0];
  for(let i=1;i<p.length;i++)x+=p[i]/(z+i);
  const t=z+7.5;
  return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
}

function regularizedGammaP(a,x){
  if(!(a>0)||x<0||!Number.isFinite(a)||!Number.isFinite(x))return NaN;
  if(x===0)return 0;
  const gln=logGamma(a),EPS=1e-14,FPMIN=1e-300;
  if(x<a+1){
    let ap=a,sum=1/a,del=sum;
    for(let n=1;n<=1000;n++){
      ap+=1;
      del*=x/ap;
      sum+=del;
      if(Math.abs(del)<Math.abs(sum)*EPS)break;
    }
    return Math.min(1,Math.max(0,sum*Math.exp(-x+a*Math.log(x)-gln)));
  }
  let b=x+1-a,c=1/FPMIN,d=1/b,h=d;
  for(let i=1;i<=1000;i++){
    const an=-i*(i-a);
    b+=2;
    d=an*d+b;
    if(Math.abs(d)<FPMIN)d=FPMIN;
    c=b+an/c;
    if(Math.abs(c)<FPMIN)c=FPMIN;
    d=1/d;
    const del=d*c;
    h*=del;
    if(Math.abs(del-1)<EPS)break;
  }
  const q=Math.exp(-x+a*Math.log(x)-gln)*h;
  return Math.min(1,Math.max(0,1-q));
}

function chiSquareQuantile(p,df){
  if(!(p>0&&p<1)||!(df>0))return null;
  const cdf=x=>regularizedGammaP(df/2,x/2);
  let lo=0,hi=Math.max(1,df);
  while(cdf(hi)<p&&hi<1e12)hi*=2;
  for(let i=0;i<120;i++){
    const mid=(lo+hi)/2;
    if(cdf(mid)<p)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
}

function exponentialMeanConfidence(values,confidence=CONFIDENCE_LEVEL){
  const a=values.filter(finite).map(Number).filter(x=>x>0);
  if(a.length<MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT)return null;
  const n=a.length,sum=a.reduce((s,x)=>s+x,0),alpha=1-confidence,df=2*n;
  const qLowTwoSided=chiSquareQuantile(alpha/2,df);
  const qHighTwoSided=chiSquareQuantile(1-alpha/2,df);
  const qLowOneSided=chiSquareQuantile(alpha,df);
  if(!finite(qLowTwoSided)||!finite(qHighTwoSided)||!finite(qLowOneSided))return null;
  return {
    sampleSize:n,
    confidenceLevel:confidence,
    meanPointEUR:sum/n,
    meanTwoSidedLowerEUR:2*sum/qHighTwoSided,
    meanTwoSidedUpperEUR:2*sum/qLowTwoSided,
    meanOneSidedUpperEUR:2*sum/qLowOneSided,
    method:'EXACT_CHI_SQUARE_INTERVAL_FOR_EXPONENTIAL_MEAN_CONDITIONAL_ON_IID_EXPONENTIAL_HIT_METERS'
  };
}

export class EdgeSentinel extends V9EdgeSentinel{
  async winfallResearch(limit=200){
    const research=await super.winfallResearch(limit);
    const rows=this.pairedWinfallResetCandidates(limit);
    const pre=rows.map(r=>r.pairedPreDropEUR);
    const ci=exponentialMeanConfidence(pre);
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
      conservativePositiveEvStatisticalScreenReason:'CURRENT_EXACT_WINFALL_METER_IS_NOT_BOUND; CONFIDENCE BOUNDS ARE CONDITIONAL RESEARCH ONLY',
      confidenceMethod:ci?.method||null
    };
    research.decision={
      ...research.decision,
      confidenceBoundVerified:ci!==null,
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
