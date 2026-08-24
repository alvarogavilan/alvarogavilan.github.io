const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const EPS=1e-12;

function rawEUR(points){
  const p=Number(points);
  return finite(p)&&p>=0?p/1000:null;
}

function floorPayout(raw){return Math.floor(raw);}
function nearestPayoutSet(raw){
  const lo=Math.floor(raw),f=raw-lo;
  if(Math.abs(f-0.5)<=EPS)return [lo,lo+1];
  return [f<0.5?lo:lo+1];
}

export function officialLanguagePayoutInterval(points){
  const raw=rawEUR(points);
  if(raw===null)return {rawEUR:null,minEUR:null,maxEUR:null,semanticsConflict:true,plausible:[]};
  const floor=floorPayout(raw);
  const nearest=nearestPayoutSet(raw);
  const plausible=[...new Set([floor,...nearest])].sort((a,b)=>a-b);
  return {
    rawEUR:raw,minEUR:plausible[0],maxEUR:plausible[plausible.length-1],
    semanticsConflict:plausible.length>1,
    plausible,
    officialSpanish:'NEAREST_EURO',
    officialEnglish:'ROUND_DOWN_EURO'
  };
}

export function marginalOfficialPayoutInterval({startingPoints=0,addedPoints=0}={}){
  const before=rawEUR(startingPoints),after=rawEUR(Number(startingPoints)+Number(addedPoints));
  if(before===null||after===null||after<before)return {minEUR:null,maxEUR:null,plausible:[],semanticsConflict:true};
  const deltas=[];
  deltas.push(floorPayout(after)-floorPayout(before));
  for(const b of nearestPayoutSet(before))for(const a of nearestPayoutSet(after))if(a>=b)deltas.push(a-b);
  const plausible=[...new Set(deltas)].sort((a,b)=>a-b);
  return {
    startingPoints:Number(startingPoints),addedPoints:Number(addedPoints),endingPoints:Number(startingPoints)+Number(addedPoints),
    minEUR:plausible[0],maxEUR:plausible[plausible.length-1],plausible,
    semanticsConflict:plausible.length>1,
    guaranteedPositive:plausible[0]>0,
    officialSpanish:'NEAREST_EURO',officialEnglish:'ROUND_DOWN_EURO'
  };
}

export function cashLoyaltyLevelTable(levels,{slotMultiplier=1,casinoMultiplier=0.1}={}){
  return levels.map(x=>({
    ...x,
    continuousSlotCashReturnFraction:x.multiplierVerified?x.multiplier*slotMultiplier/1000:null,
    continuousSlotCashReturnPct:x.multiplierVerified?x.multiplier*slotMultiplier/10:null,
    continuousCasinoLiveCashReturnFraction:x.multiplierVerified?x.multiplier*casinoMultiplier/1000:null,
    continuousCasinoLiveCashReturnPct:x.multiplierVerified?x.multiplier*casinoMultiplier/10:null
  }));
}

export function screenCashLoyalty({weeklyTurnoverEUR=0,startingWeeklyPoints=0,level=1,category='SLOTS',levels=[],slotMultiplier=1,casinoMultiplier=0.1,sportsMultiplier=null}={}){
  const turnover=Number(weeklyTurnoverEUR),start=Number(startingWeeklyPoints);
  const row=levels.find(x=>x.level===Number(level))||null;
  const categoryMultiplier=category==='SLOTS'?slotMultiplier:(category==='CASINO_OR_LIVE'?casinoMultiplier:(category==='SPORTS'?sportsMultiplier:null));
  const ready=finite(turnover)&&turnover>=0&&finite(start)&&start>=0&&row&&row.multiplierVerified===true&&finite(categoryMultiplier);
  const addedPoints=ready?turnover*row.multiplier*Number(categoryMultiplier):null;
  const endPoints=ready?start+addedPoints:null;
  const before=ready?officialLanguagePayoutInterval(start):null;
  const after=ready?officialLanguagePayoutInterval(endPoints):null;
  const marginal=ready?marginalOfficialPayoutInterval({startingPoints:start,addedPoints}):null;
  return {
    version:'paf-group-cash-loyalty-screen-v1',weeklyTurnoverEUR:finite(turnover)?turnover:null,startingWeeklyPoints:finite(start)?start:null,
    level:Number(level),category,levelMultiplier:row?.multiplier??null,levelMultiplierVerified:row?.multiplierVerified===true,
    categoryMultiplier:finite(categoryMultiplier)?Number(categoryMultiplier):null,addedPoints,endPoints,
    payoutBefore:before,payoutAfter:after,marginalCashReward:marginal,
    guaranteedMarginalCashEUR:marginal?.minEUR??null,possibleMarginalCashEUR:marginal?.maxEUR??null,
    roundingSemanticsResolved:false,executable:false,realMoneyAllowed:false,
    blockers:[...(row?[]:['LEVEL_INVALID']),...(row?.multiplierVerified?[]:['LEVEL_MULTIPLIER_NOT_VERIFIED']),...(finite(categoryMultiplier)?[]:['CATEGORY_INVALID']),'OFFICIAL_LANGUAGE_ROUNDING_CONFLICT','CURRENT_ACCOUNT_LEVEL_NOT_CAPTURED','WEEKLY_POINTS_STATE_NOT_CAPTURED','PROSPECTIVE_VALIDATION_MISSING']
  };
}
