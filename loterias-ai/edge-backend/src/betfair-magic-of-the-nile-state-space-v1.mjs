const VERSION='betfair-magic-of-the-nile-state-space-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const COLORS=Object.freeze(['red','blue','green']);

function integerGem(v){const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=2?n:null;}
function execution(){return {...EXECUTION};}

export function enumerateMagicOfTheNilePreTriggerStates(){
  const states=[];
  for(let red=0;red<=2;red++)for(let blue=0;blue<=2;blue++)for(let green=0;green<=2;green++)states.push(classifyMagicOfTheNileState({red,blue,green}));
  return states;
}

export function classifyMagicOfTheNileState(input={}){
  const red=integerGem(input.red),blue=integerGem(input.blue),green=integerGem(input.green);
  if([red,blue,green].some(v=>v===null))return {version:VERSION,valid:false,reason:'RED_BLUE_GREEN_MUST_EACH_BE_INTEGER_0_TO_2',execution:execution()};
  const vector={red,blue,green};
  const values=[red,blue,green];
  const total=values.reduce((a,b)=>a+b,0);
  const colorsAtTwo=COLORS.filter(c=>vector[c]===2);
  const colorsAtOne=COLORS.filter(c=>vector[c]===1);
  const nextGemCompletesFeature=colorsAtTwo.length>0;
  const simultaneousNearFeatureCount=colorsAtTwo.length;
  let discoveryClass='LOW_PRIORITY_PUBLIC_PRIOR';
  if(total>=5)discoveryClass='STRONG_DISCOVERY_PRIOR';
  else if(total===4&&colorsAtTwo.length>=2)discoveryClass='BORDERLINE_STRONGER_TWO_PAIRS_PRIOR';
  else if(total===4)discoveryClass='BORDERLINE_CONFIGURATION_DEPENDENT_PRIOR';
  else if(total<=3)discoveryClass='GENERALLY_AVOID_PUBLIC_PRIOR';
  const greenWeightCaution=green>0;
  return {
    version:VERSION,valid:true,state:vector,stateKey:`${red}-${blue}-${green}`,totalGems:total,colorsAtTwo,colorsAtOne,nextGemCompletesFeature,simultaneousNearFeatureCount,discoveryClass,greenWeightCaution,
    exactSpainConditionalEvVerified:false,exactSpainPositiveEvVerified:false,
    scientificUse:'Finite-state discovery classifier only. It freezes public expert priors over the 27 visible pre-trigger gem states and never converts them into a Spanish execution threshold.',
    execution:execution(),
    hardGuards:{stateSpaceSizeIs27:true,publicPriorIsNotExactEv:true,greenIsNotAssignedNumericPenalty:true,spanishFeatureProbabilitiesRequiredForExactEv:true,spanishFeatureReturnsRequiredForExactEv:true,exactServedBetLevelRequired:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}

export function assessMagicOfTheNileExactEvInputs(input={}){
  const requirements={
    exactBetfairSpainGameIdVerified:input.gameId==='magic-of-nile-aig',
    exactSpainTheoreticalRtpVerified:input.exactSpainTheoreticalRtpVerified===true&&Number(input.theoreticalRtpPct)===96.02,
    exactServedBetLevelVerified:input.exactServedBetLevelVerified===true&&Number.isFinite(Number(input.totalBetEUR))&&Number(input.totalBetEUR)>0,
    exactCurrentGemVectorVerified:classifyMagicOfTheNileState(input.gemVector||{}).valid===true&&input.exactCurrentGemVectorVerified===true,
    exactSpainGemAwardProbabilitiesVerified:input.exactSpainGemAwardProbabilitiesVerified===true,
    exactSpainFeatureReturnDistributionsVerified:input.exactSpainFeatureReturnDistributionsVerified===true,
    exactSpainBaseAndBonusTransitionModelVerified:input.exactSpainBaseAndBonusTransitionModelVerified===true
  };
  const missing=Object.entries(requirements).filter(([,ok])=>!ok).map(([k])=>k);
  return {version:VERSION,requirements,missing,readyForExactConditionalEvComputation:missing.length===0,execution:execution(),hardGuards:{sameRtpDoesNotProveSameMath:true,foreignReelStripsCannotFillSpainProbabilities:true,expertGemThresholdCannotFillMissingMath:true,realMoneyAllowed:false}};
}
