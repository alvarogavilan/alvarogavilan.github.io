const VERSION='roulette-prospective-holdout-validator-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const Z99=2.5758293035489004;
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const execution=()=>({...EXECUTION});
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function wilsonLower(hits,n,z=Z99){if(!(n>0))return null;const p=hits/n,z2=z*z,den=1+z2/n;const center=p+z2/(2*n);const radius=z*Math.sqrt((p*(1-p)+z2/(4*n))/n);return Math.max(0,(center-radius)/den);}
function normalizeCandidate(candidate={}){const numbers=[...new Set((Array.isArray(candidate.numbers)?candidate.numbers:[]).map(num).filter(n=>Number.isInteger(n)&&n>=0&&n<=36))];return {id:String(candidate.id||''),tableId:String(candidate.tableId||''),wheelId:String(candidate.wheelId||''),numbers,frozenAtMs:num(candidate.frozenAtMs),sourceVerdict:String(candidate.sourceVerdict||'')};}
function normalizeRows(rows=[]){return (Array.isArray(rows)?rows:[]).map((r,i)=>({index:i,number:num(r?.number),tsMs:num(r?.tsMs),tableId:String(r?.tableId||''),wheelId:String(r?.wheelId||'')})).filter(r=>Number.isInteger(r.number)&&r.number>=0&&r.number<=36&&r.tsMs!==null);}
export function validateRouletteCandidateProspectively(candidateInput={},holdoutInput=[],options={}){
  const candidate=normalizeCandidate(candidateInput),rows=normalizeRows(holdoutInput),minSpins=Math.max(500,Math.floor(num(options.minimumHoldoutSpins)??2000));
  if(!candidate.id||!candidate.tableId||!candidate.wheelId||candidate.numbers.length<1)return {version:VERSION,ok:false,reason:'FROZEN_CANDIDATE_IDENTITY_AND_NUMBERS_REQUIRED',execution:execution()};
  if(candidate.frozenAtMs===null)return {version:VERSION,ok:false,reason:'CANDIDATE_FROZEN_TIMESTAMP_REQUIRED',execution:execution()};
  if(!['REPRODUCIBLE_BIAS_RESEARCH_CANDIDATE','DISCOVERY_VALIDATION_CANDIDATE'].includes(candidate.sourceVerdict))return {version:VERSION,ok:false,reason:'UPSTREAM_RESEARCH_CANDIDATE_REQUIRED',execution:execution()};
  if(rows.length<minSpins)return {version:VERSION,ok:false,reason:'INSUFFICIENT_PROSPECTIVE_HOLDOUT',holdoutSpins:rows.length,minimumHoldoutSpins:minSpins,execution:execution()};
  const firstTs=Math.min(...rows.map(r=>r.tsMs));
  if(!(firstTs>candidate.frozenAtMs))return {version:VERSION,ok:false,reason:'HOLDOUT_MUST_START_AFTER_CANDIDATE_FREEZE',execution:execution()};
  if(rows.some(r=>r.tableId!==candidate.tableId||r.wheelId!==candidate.wheelId))return {version:VERSION,ok:false,reason:'TABLE_OR_WHEEL_IDENTITY_DRIFT',execution:execution()};
  const set=new Set(candidate.numbers),hits=rows.filter(r=>set.has(r.number)).length,n=rows.length,k=candidate.numbers.length;
  const observedHitRate=hits/n,expectedFairHitRate=k/37,lowerHitRate99=wilsonLower(hits,n),observedRtp=observedHitRate*36/k,conservativeRtp99=lowerHitRate99*36/k;
  const conservativeEdgePct=(conservativeRtp99-1)*100,observedEdgePct=(observedRtp-1)*100;
  const minConservativeEdgePct=Math.max(0,num(options.minimumConservativeEdgePct)??0);
  const verdict=conservativeEdgePct>minConservativeEdgePct?'PROSPECTIVE_99PCT_CONSERVATIVE_POSITIVE_EDGE_RESEARCH_CANDIDATE':'NO_PROSPECTIVE_CONSERVATIVE_POSITIVE_EDGE';
  return {version:VERSION,ok:true,candidate,holdoutSpins:n,hits,metrics:{expectedFairHitRate:round(expectedFairHitRate,10),observedHitRate:round(observedHitRate,10),lowerHitRate99:round(lowerHitRate99,10),observedRtpPct:round(observedRtp*100,6),conservativeRtp99Pct:round(conservativeRtp99*100,6),observedEdgePct:round(observedEdgePct,6),conservativeEdge99Pct:round(conservativeEdgePct,6)},practiceVerdict:verdict,execution:execution(),hardGuards:{candidateFrozenBeforeHoldout:true,holdoutCannotSelectNumbers:true,exactTableAndWheelIdentityRequired:true,minimumProspectiveSampleRequired:true,straightUpEqualStakeEconomicsOnly:true,noProgressionSystem:true,noAutomaticBetting:true,independentExecutionGateStillRequired:true}};
}
