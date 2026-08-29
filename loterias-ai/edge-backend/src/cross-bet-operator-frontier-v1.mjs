const VERSION='cross-bet-operator-frontier-v1';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;

export function screenOperatorCrossBetFrontier(rows=[]){
  const screened=rows.map((r,index)=>{
    const min=n(r.minStakeEUR),max=n(r.maxStakeEUR),endpoints=r.exactCurrentStakeEndpointsVerified===true;
    const ratio=min>0&&max>=min?max/min:null;
    let classification='STAKE_ENDPOINTS_INCOMPLETE';
    if(endpoints&&ratio!==null)classification=r.exactCurrentCrossBetStateRuleVerified===true&&r.currentStakeScalesStatePayout===true?'VERIFIED_CROSS_BET_MECHANIC_FRONTIER':'DISCOVERY_RULE_BINDING_REQUIRED';
    return{index,id:r.id||`operator-${index+1}`,operator:r.operator||null,title:r.title||null,minStakeEUR:min,maxStakeEUR:max,stakeRatio:round(ratio),classification,execution:{...EXEC},hardGuards:{stakeRatioAloneIsNotEdge:true,noRuleTransferAcrossOperators:true,positiveEvNotProven:true}};
  });
  const weight={VERIFIED_CROSS_BET_MECHANIC_FRONTIER:100,DISCOVERY_RULE_BINDING_REQUIRED:30,STAKE_ENDPOINTS_INCOMPLETE:10};
  const verifiedRank=[...screened].sort((a,b)=>(weight[b.classification]??0)-(weight[a.classification]??0)||(b.stakeRatio??-1)-(a.stakeRatio??-1)||a.index-b.index);
  const potentialRank=[...screened].sort((a,b)=>(b.stakeRatio??-1)-(a.stakeRatio??-1)||a.index-b.index);
  return{version:VERSION,screened,verifiedRank,potentialRatioLeader:potentialRank[0]||null,verifiedMechanicLeader:verifiedRank.find(x=>x.classification==='VERIFIED_CROSS_BET_MECHANIC_FRONTIER')||null,execution:{...EXEC}};
}
