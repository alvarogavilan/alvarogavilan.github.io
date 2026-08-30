import {createRng} from './rng.mjs';
import {wilsonInterval} from './confidence-bounds.mjs';
export function simulateBernoulli({probability,trials=1_000_000,seed=20260830,confidence=0.99}){
  if(!(probability>=0&&probability<=1)) throw new Error('PROBABILITY_0_1_REQUIRED');
  if(!Number.isInteger(trials)||trials<=0) throw new Error('POSITIVE_INTEGER_TRIALS_REQUIRED');
  const rng=createRng(seed); let wins=0;
  for(let i=0;i<trials;i++) if(rng()<probability) wins++;
  return {trials,wins,observedProbability:wins/trials,interval:wilsonInterval(wins,trials,confidence),seed};
}
