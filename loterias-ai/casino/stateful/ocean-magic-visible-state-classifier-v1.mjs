const VERSION='ocean-magic-visible-state-classifier-v1';

const WILD={
  1:['YES','YES','YES','YES'],
  2:['YES','YES','YES','YES'],
  3:['YES','YES','YES','YES'],
  4:['MAYBE','MAYBE','MAYBE','MAYBE'],
  5:['NO','NO','NO','NO'],
};
const BURST={
  1:['MAYBE','YES','YES','MAYBE'],
  2:['MAYBE','YES','YES','MAYBE'],
  3:['YES','YES','YES','YES'],
  4:['MAYBE','MAYBE','MAYBE','MAYBE'],
  5:['NO','NO','NO','NO'],
};

function normMode(v){
  const s=String(v||'').trim().toUpperCase().replace(/[ _-]+/g,'_');
  if(['WILD','WILD_BUBBLE','WILD_BUBBLE_MODE'].includes(s))return 'WILD_BUBBLE';
  if(['BURST','BUBBLE_BURST','BUBBLE_BOOST','BUBBLE_BURST_MODE','BUBBLE_BOOST_MODE'].includes(s))return 'BUBBLE_BURST';
  return null;
}
function normalizeBubbles(bubbles){
  if(!Array.isArray(bubbles))return null;
  const out=[];
  for(const b of bubbles){
    const reel=Number(b?.reel),row=Number(b?.row);
    if(!Number.isInteger(reel)||reel<1||reel>5||!Number.isInteger(row)||row<1||row>4)return null;
    const key=`${reel}:${row}`;
    if(!out.some(x=>x.key===key))out.push({reel,row,key});
  }
  return out;
}
function externalLabel(mode,b){
  const map=mode==='WILD_BUBBLE'?WILD:BURST;
  return map[b.reel][b.row-1];
}

export function classifyOceanMagicVisibleNextSpinState({mode,bubbles,exactBet365BuildFingerprintVerified=false,conditionalEvLowerBound=null}={}){
  const m=normMode(mode);
  const bs=normalizeBubbles(bubbles);
  const base={
    version:VERSION,
    game:'Ocean Magic',
    strategySourceClass:'EXTERNAL_PUBLISHED_CONSERVATIVE_SIMULATION_85_86_BASE_RETURN',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
  };
  if(!m)return {...base,valid:false,reason:'UNKNOWN_MODE'};
  if(!bs)return {...base,valid:false,reason:'INVALID_BUBBLE_COORDINATES'};

  const classified=bs.map(b=>({...b,label:externalLabel(m,b)}));
  const yes=classified.filter(x=>x.label==='YES');
  const maybe=classified.filter(x=>x.label==='MAYBE');
  const no=classified.filter(x=>x.label==='NO');
  const onlyR4Rows1And4=classified.length===2&&classified.every(x=>x.reel===4&&(x.row===1||x.row===4))&&classified.some(x=>x.row===1)&&classified.some(x=>x.row===4);
  const publishedStrategyPlayCandidate=yes.length>0||(maybe.length>=2&&!onlyR4Rows1And4);

  const ev=Number(conditionalEvLowerBound);
  const exactBuild=exactBet365BuildFingerprintVerified===true;
  const executionEligible=publishedStrategyPlayCandidate&&exactBuild&&Number.isFinite(ev)&&ev>1;

  return {
    ...base,
    valid:true,
    mode:m,
    bubbles:classified,
    counts:{yes:yes.length,maybe:maybe.length,no:no.length,total:classified.length},
    externalStrategy:{
      publishedStrategyPlayCandidate,
      exceptionOnlyReel4Rows1And4:onlyR4Rows1And4,
      meaning:publishedStrategyPlayCandidate?'STATE_DESERVES_EXACT_BUILD_EV_REVIEW':'DISCARD_STATE_UNDER_PUBLISHED_STRATEGY',
    },
    bet365SpainGate:{
      exactBuildFingerprintVerified:exactBuild,
      conditionalEvLowerBound:Number.isFinite(ev)?ev:null,
      lowerBoundExceedsOne:Number.isFinite(ev)&&ev>1,
      executionEligible,
      reason:executionEligible?'ALL_RESEARCH_GATES_NUMERICALLY_PASS_BUT_EXECUTION_CONTRACT_STILL_REQUIRED':(!publishedStrategyPlayCandidate?'PUBLISHED_STRATEGY_REJECTS_STATE':(!exactBuild?'BET365_9670_BUILD_NOT_FINGERPRINTED':'CONDITIONAL_EV_LOWER_BOUND_NOT_ABOVE_ONE')),
    },
    hardGuards:{
      externalStrategyCannotAuthorizeExecution:true,
      headlineRtpCannotSubstituteConditionalStateEv:true,
      exactServedBuildFingerprintRequired:true,
      conditionalEvLowerBoundStrictlyAboveOneRequired:true,
      executionContractStillRequired:true,
    },
  };
}

export const OCEAN_MAGIC_PUBLISHED_STRATEGY_MATRIX=Object.freeze({WILD_BUBBLE:WILD,BUBBLE_BURST:BURST});
