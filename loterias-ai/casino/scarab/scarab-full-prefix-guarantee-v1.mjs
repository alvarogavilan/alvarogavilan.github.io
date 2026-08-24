export const SCARAB_WILD_PAY_MULTIPLIERS=Object.freeze({2:2,3:20,4:50,5:200});

function finitePositive(x){return Number.isFinite(Number(x))&&Number(x)>0;}

export function remainingPurchasedSpins(lastCompletedGame){
  const g=Number(lastCompletedGame);
  if(!Number.isInteger(g)||g<1||g>9) throw new Error('lastCompletedGame must be an integer 1..9; Game 10 of 10 means the next game starts a fresh cycle');
  return 10-g;
}

export function guaranteedFinalSpinReturnMultiple({fullPrefixReels,wildPayMultipliers=SCARAB_WILD_PAY_MULTIPLIERS}={}){
  const k=Number(fullPrefixReels);
  if(!Number.isInteger(k)||k<2||k>5) return 0;
  const p=Number(wildPayMultipliers?.[k]);
  if(!finitePositive(p)) throw new Error(`missing positive wild pay multiplier for ${k} wilds`);
  return p;
}

export function evaluateFullPrefixState({
  lastCompletedGame,
  fullPrefixReels,
  totalBet,
  localFingerprintVerified=false,
  localPaytableVerified=false,
  localCycleSemanticsVerified=false,
  localPersistentFramesVerified=false,
  localFixedPositionSettlementVerified=false,
  localSameBetLevelPersistenceVerified=false,
  localPayoutCapSemanticsVerified=false,
  wildPayMultipliers=SCARAB_WILD_PAY_MULTIPLIERS
}={}){
  if(!finitePositive(totalBet)) throw new Error('totalBet must be positive');
  const remainingSpins=remainingPurchasedSpins(lastCompletedGame);
  const finalReturnMultiple=guaranteedFinalSpinReturnMultiple({fullPrefixReels,wildPayMultipliers});
  const guaranteedFinalPayout=totalBet*finalReturnMultiple;
  const futureStakeToFinal=totalBet*remainingSpins;
  const guaranteedNet=guaranteedFinalPayout-futureStakeToFinal;
  const deterministicPositive=finalReturnMultiple>remainingSpins;
  const deterministicBreakEvenOrBetter=finalReturnMultiple>=remainingSpins;
  const candidateForExecutionContract=Boolean(
    deterministicPositive&&
    localFingerprintVerified&&
    localPaytableVerified&&
    localCycleSemanticsVerified&&
    localPersistentFramesVerified&&
    localFixedPositionSettlementVerified&&
    localSameBetLevelPersistenceVerified&&
    localPayoutCapSemanticsVerified
  );
  return {
    theorem:'FULL_PREFIX_REELS_DISTRIBUTION_FREE_LOWER_BOUND',
    assumptions:{
      fullPrefixMeansEveryVisibleCellInReels1ThroughKIsAlreadyGoldFramed:true,
      eachFrameTransformsToWildInTheSameCellBeforeFinalEvaluation:true,
      winsEvaluateLeftToRightFromReel1:true,
      everyActivePaylineUsesExactlyOneCellPerReel:true,
      wildOnlyPayForKMatchesApplies:true,
      totalBetAndLinePaysScaleTogether:true,
      sameBetLevelIsMaintainedUntilFinalCycleSpin:true,
      localPayoutCapsDoNotReduceClaimedLowerBound:true
    },
    lastCompletedGame:Number(lastCompletedGame),
    remainingSpins,
    fullPrefixReels:Number(fullPrefixReels),
    finalReturnMultiple,
    guaranteedFinalPayout,
    futureStakeToFinal,
    guaranteedNet,
    guaranteedNetInBetUnits:guaranteedNet/Number(totalBet),
    deterministicPositive,
    deterministicBreakEvenOrBetter,
    candidateForExecutionContract,
    localFixedPositionSettlementVerified:Boolean(localFixedPositionSettlementVerified),
    localSameBetLevelPersistenceVerified:Boolean(localSameBetLevelPersistenceVerified),
    localPayoutCapSemanticsVerified:Boolean(localPayoutCapSemanticsVerified),
    localExecutionEligible:false,
    executionAuthority:'EDGE_CLIENT_EXECUTION_CONTRACT_ONLY',
    realMoneyAllowed:false
  };
}

export function theoreticalEntryTable({totalBet=1}={}){
  const rows=[];
  for(let game=1;game<=9;game++){
    for(let k=2;k<=5;k++) rows.push(evaluateFullPrefixState({lastCompletedGame:game,fullPrefixReels:k,totalBet}));
  }
  return rows;
}
