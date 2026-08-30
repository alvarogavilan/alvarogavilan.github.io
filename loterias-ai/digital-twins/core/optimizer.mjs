export function maximizeConservativeReturn(rows,{minimumReturnRatio=1}={}){
  if(!Array.isArray(rows))throw new Error('ROWS_ARRAY_REQUIRED');
  const valid=rows.filter(r=>Number.isFinite(r?.conservativeReturnRatio));
  if(!valid.length)return{decision:'NO_ROBUST_CANDIDATE',best:null,reason:'NO_FINITE_CONSERVATIVE_RETURN'};
  const best=valid.reduce((a,b)=>b.conservativeReturnRatio>a.conservativeReturnRatio?b:a);
  return{decision:best.conservativeReturnRatio>minimumReturnRatio?'ROBUST_MATH_CANDIDATE':'NO_ROBUST_CANDIDATE',best};
}
