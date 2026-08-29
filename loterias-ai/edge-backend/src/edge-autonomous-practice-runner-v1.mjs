import {evaluateFixedStakeLadder,classifyStakeChangeClaim,EXAMPLE_040_060_100} from './slot-stake-ladder-lab-v1.mjs';
import {simulateRoulettePractice,theoreticalStraightEvPerEuro} from './roulette-practice-engine-v1.mjs';
import {auditAxaRecoveredSelector} from './axa-recovered-selector-theorem-v1.mjs';
import {screenStreak9NextSpin} from './streak-of-luck-state9-one-spin-screen-v1.mjs';
import {screenMoonCollectNextSpin,screenMoonPushNextSpin} from './full-moon-visible-state-lower-bound-screen-v1.mjs';
import {screenSnakeProgressNextSpin} from './snakes-ladders-state-screen-v1.mjs';

const VERSION='edge-autonomous-practice-runner-v1.1-expanded-persistent-state';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const weighted=(rows,keyWeight,keyValue)=>{const w=rows.reduce((a,r)=>a+(r[keyWeight]||0),0);return w?rows.reduce((a,r)=>a+(r[keyWeight]||0)*(r[keyValue]||0),0)/w:null;};

function slotRitualNullSweep(){
  const rtps=[90,93,94,94.56,94.74,94.86,94.99,95,96,97,98,99];
  return rtps.map(rtpPct=>evaluateFixedStakeLadder({rtpPct,stages:EXAMPLE_040_060_100}));
}

function classifyKnownStakeStateMechanics(){
  return [
    {id:'WILLIAM_HILL_ES_STREAK_OF_LUCK',evidence:'Exact current operator rules preserve a separate consecutive-win counter for each of six line-bet values.',result:classifyStakeChangeClaim({exactCurrentRulesVerified:true,explicitPersistentStateByStakeLevel:true})},
    {id:'BETFAIR_ES_FULL_MOON_WHITE_KING',evidence:'Exact current operator rules preserve reel/moon state by bet amount.',result:classifyStakeChangeClaim({exactCurrentRulesVerified:true,explicitPersistentStateByStakeLevel:true})},
    {id:'WILLIAM_HILL_ES_SNAKES_LADDERS_MEGADICE',evidence:'Exact current operator rules preserve the 11-section snake progress for each possible bet.',result:classifyStakeChangeClaim({exactCurrentRulesVerified:true,explicitPersistentStateByStakeLevel:true})},
    {id:'WILLIAM_HILL_ES_AOTGN_WAYS_OF_THUNDER',evidence:'Exact current operator rules preserve the current 45-to-3125 ways level by bet amount.',result:classifyStakeChangeClaim({exactCurrentRulesVerified:true,explicitPersistentStateByStakeLevel:true})},
    {id:'WILLIAM_HILL_ES_SQUEALIN_RICHES',evidence:'Exact current operator rules preserve the bonus-roulette progress bar by bet level.',result:classifyStakeChangeClaim({exactCurrentRulesVerified:true,explicitPersistentStateByStakeLevel:true})},
    {id:'GENERIC_CREATOR_040_060_100',evidence:'Stake ladder alone; no exact target stake-dependent rule.',result:classifyStakeChangeClaim({creatorOrForumOnly:true})}
  ];
}

function rouletteFairBenchmark({spinsPerSeed=100000,seeds=12}={}){
  const strategies=['flat-red','martingale-red','fibonacci-red','straight','neighbors5','axa-like-random-set'];
  const results=[];
  for(const strategy of strategies){
    const runs=[];
    for(let i=0;i<seeds;i++){
      const r=simulateRoulettePractice({strategy,spins:spinsPerSeed,baseUnit:1,maxBet:1024,startBankroll:1_000_000,seed:1009+i*7919,targetNumber:17,axaSetSize:18});
      runs.push({seed:1009+i*7919,profit:r.profit,totalStake:r.totalStake,observedRtpPct:r.observedRtpPct,observedNetPerEuro:r.observedNetPerEuro,maxDrawdown:r.maxDrawdown});
    }
    results.push({strategy,seeds,spinsPerSeed,totalSpins:seeds*spinsPerSeed,meanObservedRtpPct:round(mean(runs.map(x=>x.observedRtpPct))),weightedNetPerEuro:round(weighted(runs,'totalStake','observedNetPerEuro')),meanMaxDrawdown:round(mean(runs.map(x=>x.maxDrawdown))),runs});
  }
  return {theoreticalFairNetPerEuro:round(-1/37),theoreticalFairRtpPct:round(100*36/37),results};
}

function rouletteBiasSensitivity({spins=300000}={}){
  const weights=[1,1.01,1.02,1.05,1.10,1.20];
  return weights.map((biasWeight,i)=>{
    const theory=theoreticalStraightEvPerEuro({biasPocket:17,biasWeight,targetNumber:17});
    const sim=simulateRoulettePractice({strategy:'straight',spins,baseUnit:1,startBankroll:1_000_000,seed:4241+i*3571,targetNumber:17,biasPocket:17,biasWeight});
    return {biasWeight,theoreticalHitProbability:round(theory.hitProbability),theoreticalNetPerEuro:round(theory.netEvPerEuro),simulatedNetPerEuro:round(sim.observedNetPerEuro),simulatedRtpPct:round(sim.observedRtpPct)};
  });
}

function axaRecoveredSelectorProof(){return auditAxaRecoveredSelector({setSizes:[1,5,12,18,24,36],selectorIndependentOfCasinoOutcome:true,horizon:3});}

function betfairAotgDimensionlessFrontier(){
  const baseRtpPct=94.56,jackpotContributionPct=0.55;
  const baseHouseEdge=(100-baseRtpPct)/100,contribution=jackpotContributionPct/100;
  const lossPerMeterGapEUR=baseHouseEdge/contribution;
  const captureProbabilities=[1,0.75,0.5,0.25,0.1,0.05];
  return {baseRtpPct,jackpotContributionPct,lossPerMeterGapEUR:round(lossPerMeterGapEUR),meaning:'Under the exact accounting split, each EUR1 of remaining progressive meter growth requires about this many EUR of expected base-game loss in the worst-case boundary model.',rows:captureProbabilities.map(captureProbability=>({captureProbability,maximumGapAsFractionOfAwardFloorForPositiveWorstCaseModel:round(captureProbability/lossPerMeterGapEUR),maximumGapPctOfAwardFloor:round(100*captureProbability/lossPerMeterGapEUR)})),execution:{...EXEC},hardGuards:{awardFloorStillMustBeExactSameTier:true,currentMeterAndBoundaryStillRequired:true,raceCaptureProbabilityCannotBeInvented:true}};
}

function streakState9NormalizedSensitivity(){
  const jackpotToStake=[25,50,100,175,250,500,650,1000];
  return jackpotToStake.map(mult=>{const r=screenStreak9NextSpin({observedStreakState:9,totalStakeEUR:1,jackpotAwardFloorEUR:mult,sixtyFreeSpinsValueFloorEUR:0});return {jackpotToPaidSpinStakeMultiple:mult,breakEvenWinProbabilityIgnoringOrdinaryPayoutsAndFreeSpinValue:r.metrics?.breakEvenWinProbabilityIgnoringOrdinarySpinPayouts??null,breakEvenWinProbabilityPct:r.metrics?.breakEvenWinProbabilityPct??null};});
}

function fullMoonNormalizedSensitivity(){
  const states=[
    {id:'five-minimum-money-moons',moons:Array.from({length:5},()=>({type:'MONEY',valueX:0.5}))},
    {id:'four-minimum-money-plus-bonus-min',moons:[{type:'MONEY',valueX:0.5},{type:'MONEY',valueX:0.5},{type:'MONEY',valueX:0.5},{type:'MONEY',valueX:0.5},{type:'BONUS',valueX:10}]},
    {id:'mixed-visible-higher-cash',moons:[{type:'MONEY',valueX:7.5},{type:'MONEY',valueX:5},{type:'MONEY',valueX:2.5},{type:'MULTIPLIER'},{type:'BONUS',valueX:10}]}
  ];
  return states.map(s=>{const collect=screenMoonCollectNextSpin({totalStakeEUR:1,extraBetMode:false,moons:s.moons});const push=screenMoonPushNextSpin({totalStakeEUR:1,extraBetMode:false,moons:s.moons});return {id:s.id,collectBreakEvenTriggerPct:collect.metrics?.breakEvenTriggerProbabilityPct??null,pushBreakEvenTriggerPct:push.metrics?.breakEvenTriggerProbabilityPct??null,visiblePayoutFloorX:collect.visibleMoonPayoutFloorX??push.visibleMoonPayoutFloorX??null};});
}

function snakesNormalizedSensitivity(){
  return [10,9,8,7].map(observedActiveSegments=>{const r=screenSnakeProgressNextSpin({totalStakeEUR:1,observedActiveSegments,exactCurrentOperatorProgressRuleVerified:true,exactCurrentOperatorBonusFloorVerified:true});return {observedActiveSegments,additionalProgressPointsNeeded:r.minimumAdditionalProgressPointsNeeded,bonusFloorX:r.bonusMinimumGuaranteedMultiple,breakEvenCompletionProbabilityPct:r.metrics?.breakEvenCompletionProbabilityPct??null};});
}

export function runAutonomousPractice(options={}){
  const roulette=rouletteFairBenchmark({spinsPerSeed:options.rouletteSpinsPerSeed??100000,seeds:options.rouletteSeeds??12});
  const bias=rouletteBiasSensitivity({spins:options.biasSpins??300000});
  const slotSweep=slotRitualNullSweep();
  const stateMechanics=classifyKnownStakeStateMechanics();
  const findings=[
    {id:'GENERIC_STAKE_LADDER',status:'REJECTED_AS_INDEPENDENT_EDGE',reason:'Under IID scale-invariant math, 0.40x15 -> 0.60x10 -> 1.00x5 changes turnover, not expected ROI.'},
    {id:'AXA_INTERNAL_SELECTOR',status:'REJECTED_AS_FAIR_RNG_EDGE',reason:'Recovered internal random set selection cannot change fair European roulette expectation if independent of next casino outcome.'},
    {id:'STREAK_OF_LUCK_PER_BET_STATE',status:'KEEP_HIGH_PRIORITY_RESEARCH',reason:'Exact operator rules document persistent streak state by line-bet level.'},
    {id:'FULL_MOON_PER_BET_STATE',status:'KEEP_HIGH_PRIORITY_RESEARCH',reason:'Exact operator rules document persistent reel/moon state by bet amount.'},
    {id:'SNAKES_LADDERS_PER_BET_STATE',status:'KEEP_HIGH_PRIORITY_RESEARCH',reason:'Exact operator rules document 11-section progress by bet and a 20x guaranteed minimum bonus; 10/11 creates a 5% conservative completion break-even threshold.'},
    {id:'AOTGN_WAYS_OF_THUNDER_PER_BET_STATE',status:'KEEP_HIGH_PRIORITY_RESEARCH',reason:'Exact operator rules document the 45-to-3125 ways level by bet amount; conditional level EV remains unknown.'},
    {id:'SQUEALIN_RICHES_PER_BET_STATE',status:'KEEP_RESEARCH',reason:'Exact operator rules document bonus-roulette progress by bet level; completion floor/probability remain unknown.'},
    {id:'BETFAIR_AOTG_AMOUNT_BOUNDARY',status:'KEEP_HIGH_PRIORITY_RESEARCH',reason:'Exact base/jackpot accounting permits a dimensionless conservative boundary frontier once current meter, award floor and capture lower bound are known.'},
    {id:'ROULETTE_PHYSICAL_BIAS',status:'KEEP_ONLY_IF_EXACT_TABLE_SIGNAL',reason:'Synthetic bias becomes positive when real outcome probabilities move enough; fair controls do not.'}
  ];
  return {version:VERSION,mode:'AUTONOMOUS_NO_USER_INPUT',generatedAt:new Date().toISOString(),slotRitualNullSweep:slotSweep,stakeStateMechanics:stateMechanics,rouletteFairBenchmark:roulette,rouletteBiasSensitivity:bias,axaRecoveredSelectorProof:axaRecoveredSelectorProof(),betfairAotgDimensionlessFrontier:betfairAotgDimensionlessFrontier(),streakState9NormalizedSensitivity:streakState9NormalizedSensitivity(),fullMoonNormalizedSensitivity:fullMoonNormalizedSensitivity(),snakesNormalizedSensitivity:snakesNormalizedSensitivity(),findings,execution:{...EXEC},hardGuards:{noUserInputRequired:true,noCasinoCredentialRequired:true,noAutomaticBetting:true,noWagerProbe:true,syntheticSensitivityNeverBecomesOperatorFact:true,realMoneyRequiresSeparateExactCurrentEvidenceGate:true}};
}

if(import.meta.url===`file://${process.argv[1]}`){process.stdout.write(`${JSON.stringify(runAutonomousPractice(),null,2)}\n`);}
