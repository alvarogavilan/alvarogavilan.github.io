export function laneStatus(lane){
  if(lane?.executionReady===true) return 'GREEN';
  if(lane?.prepareOnly===true) return 'YELLOW';
  return 'RED';
}

export function laneAmount(lane){
  const n=Number(lane?.current?.jackpotEUR);
  return Number.isFinite(n)?n:null;
}

export function laneDynamicState(lane){
  if(lane?.current?.dynamicFreshnessVerified===true) return 'DINÁMICO';
  if(lane?.current?.dynamicFreshnessVerified===false) return 'SIN MOVIMIENTO VERIFICADO';
  return 'N/D';
}

export function laneBlockers(lane){
  return Array.isArray(lane?.blockers)?lane.blockers:[];
}
