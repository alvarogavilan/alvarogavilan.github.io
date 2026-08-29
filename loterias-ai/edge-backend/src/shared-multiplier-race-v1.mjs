export function reachTargetBeforeReset({targetMultiplier=10, startMultiplier=1, boostBeforeResetRaceProbability}) {
  const steps = targetMultiplier - startMultiplier;
  const r = Number(boostBeforeResetRaceProbability);
  if (!Number.isFinite(r) || r < 0 || r > 1) throw new Error('boostBeforeResetRaceProbability must be in [0,1]');
  if (!Number.isInteger(steps) || steps < 0) throw new Error('invalid multiplier range');
  const probability = r ** steps;
  return {steps, probability};
}

export function raceShareNeeded({targetMultiplier=10, startMultiplier=1, targetReachProbability}) {
  const steps = targetMultiplier - startMultiplier;
  const p = Number(targetReachProbability);
  if (!Number.isFinite(p) || p <= 0 || p > 1) throw new Error('targetReachProbability must be in (0,1]');
  return {steps, requiredBoostShareAmongBoostOrResetEvents: p ** (1 / steps)};
}

export function multiplierExerciseFloor({multiplier, minimumCoinValueX=0.5, minimumCoinReels=3}) {
  const m = Number(multiplier);
  const grossFloorX = m * minimumCoinValueX * minimumCoinReels;
  return {multiplier:m, grossFloorX, zeroBuildBreakEvenCoinWinProbabilityPerExerciseSpin:1/grossFloorX};
}

export const HARD_GUARDS = Object.freeze({
  raceProbabilityIsNotSpinProbability:true,
  unknownBoostOrCoinRatesCannotBeInvented:true,
  ordinaryReturnsAndBuildResetsMustBeCountedForRealEV:true,
  noRealMoneyAuthorizationFromSyntheticRace:true
});
