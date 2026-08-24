export const DEFAULT_SCARAB_WILD_PAY=Object.freeze({2:2,3:20,4:50,5:200});

function positive(x){return Number.isFinite(Number(x))&&Number(x)>0;}
function key(reel,row){return `${Number(reel)}:${Number(row)}`;}

export function validatePaylines(paylines,{reels=5,rows=4}={}){
  if(!Array.isArray(paylines)||paylines.length<1) throw new Error('paylines must be a non-empty array');
  return paylines.map((line,i)=>{
    if(!Array.isArray(line)||line.length!==reels) throw new Error(`payline ${i} must contain exactly ${reels} row indices`);
    return line.map((row,reel)=>{
      const r=Number(row);
      if(!Number.isInteger(r)||r<0||r>=rows) throw new Error(`payline ${i} reel ${reel} has invalid row ${row}`);
      return r;
    });
  });
}

export function normalizeFramedCells(framedCells,{reels=5,rows=4}={}){
  if(!Array.isArray(framedCells)) throw new Error('framedCells must be an array');
  const out=new Set();
  for(const cell of framedCells){
    const reel=Array.isArray(cell)?Number(cell[0]):Number(cell?.reel);
    const row=Array.isArray(cell)?Number(cell[1]):Number(cell?.row);
    if(!Number.isInteger(reel)||reel<0||reel>=reels||!Number.isInteger(row)||row<0||row>=rows) throw new Error(`invalid framed cell ${JSON.stringify(cell)}`);
    out.add(key(reel,row));
  }
  return out;
}

export function guaranteedWildPrefixForLine(line,framedSet){
  let k=0;
  for(let reel=0;reel<line.length;reel++){
    if(!framedSet.has(key(reel,line[reel]))) break;
    k++;
  }
  return k;
}

export function guaranteedLinePayCredits({prefixLength,wildPay=DEFAULT_SCARAB_WILD_PAY}={}){
  const k=Number(prefixLength);
  if(!Number.isInteger(k)||k<2) return 0;
  const p=Number(wildPay?.[Math.min(k,5)]);
  if(!positive(p)) throw new Error(`missing positive Wild pay for prefix length ${k}`);
  return p;
}

export function analyzeFramedCoverage({
  paylines,
  framedCells,
  rows=4,
  reels=5,
  lineStake,
  totalBet,
  lastCompletedGame,
  wildPay=DEFAULT_SCARAB_WILD_PAY,
  localGeometryVerified=false,
  localPaytableVerified=false,
  localCycleSemanticsVerified=false,
  localPersistentFramesVerified=false,
  localSameBetLevelPersistenceVerified=false,
  localPayoutCapSemanticsVerified=false,
  localLineScalingVerified=false
}={}){
  const lines=validatePaylines(paylines,{reels,rows});
  const framed=normalizeFramedCells(framedCells,{reels,rows});
  if(!positive(lineStake)) throw new Error('lineStake must be positive');
  if(!positive(totalBet)) throw new Error('totalBet must be positive');
  const game=Number(lastCompletedGame);
  if(!Number.isInteger(game)||game<1||game>9) throw new Error('lastCompletedGame must be 1..9');
  const remainingSpins=10-game;
  const expectedTotalBet=Number(lineStake)*lines.length;
  const scalingMatches=Math.abs(expectedTotalBet-Number(totalBet))<=Math.max(1e-9,Math.abs(Number(totalBet))*1e-9);

  const lineResults=lines.map((line,index)=>{
    const prefixLength=guaranteedWildPrefixForLine(line,framed);
    const payCredits=guaranteedLinePayCredits({prefixLength,wildPay});
    const guaranteedPayout=payCredits*Number(lineStake);
    return {index,line,prefixLength,payCredits,guaranteedPayout};
  });
  const guaranteedFinalPayout=lineResults.reduce((s,x)=>s+x.guaranteedPayout,0);
  const guaranteedPayCredits=lineResults.reduce((s,x)=>s+x.payCredits,0);
  const futureStakeToFinal=Number(totalBet)*remainingSpins;
  const guaranteedNet=guaranteedFinalPayout-futureStakeToFinal;
  const deterministicPositive=guaranteedNet>1e-12;
  const deterministicBreakEvenOrBetter=guaranteedNet>=-1e-12;
  const candidateForExecutionContract=Boolean(
    deterministicPositive&&
    scalingMatches&&
    localGeometryVerified&&
    localPaytableVerified&&
    localCycleSemanticsVerified&&
    localPersistentFramesVerified&&
    localSameBetLevelPersistenceVerified&&
    localPayoutCapSemanticsVerified&&
    localLineScalingVerified
  );

  const prefixHistogram={0:0,1:0,2:0,3:0,4:0,5:0};
  for(const x of lineResults) prefixHistogram[Math.min(x.prefixLength,5)]++;

  return {
    theorem:'GEOMETRY_AWARE_PARTIAL_FRAME_PAYLINE_LOWER_BOUND',
    proofScope:'SYNTHETIC_OR_VERIFIED_PAYLINE_GEOMETRY_ONLY',
    assumptions:{
      suppliedPaylinesExactlyMatchLocalActiveGeometry:true,
      framedCellsBecomeWildBeforeFinalEvaluation:true,
      winsEvaluateFromLeftmostReel:true,
      wildPayTableAppliesPerLineStake:true,
      onlyGuaranteedWildPrefixPaysAreCounted:true,
      noBaseSymbolOrScatterValueIsAssumed:true,
      sameBetLevelIsMaintained:true,
      localPayoutCapsDoNotReduceClaimedLowerBound:true
    },
    activePaylines:lines.length,
    framedCellCount:framed.size,
    expectedTotalBet,
    totalBet:Number(totalBet),
    lineStake:Number(lineStake),
    scalingMatches,
    lastCompletedGame:game,
    remainingSpins,
    guaranteedPayCredits,
    guaranteedFinalPayout,
    futureStakeToFinal,
    guaranteedNet,
    guaranteedNetInBetUnits:guaranteedNet/Number(totalBet),
    deterministicPositive,
    deterministicBreakEvenOrBetter,
    prefixHistogram,
    lineResults,
    candidateForExecutionContract,
    localExecutionEligible:false,
    executionAuthority:'EDGE_CLIENT_EXECUTION_CONTRACT_ONLY',
    realMoneyAllowed:false
  };
}
