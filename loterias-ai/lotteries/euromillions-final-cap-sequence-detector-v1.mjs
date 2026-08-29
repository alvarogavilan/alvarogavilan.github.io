const VERSION='euromillions-final-cap-sequence-detector-v1';
const CAP_EUR=250_000_000;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,ticketCount:0,maxTotalStakeEUR:0});
const validDraw=d=>d&&typeof d.date==='string'&&Number.isFinite(Number(d.advertisedJackpotEUR))&&Number.isInteger(Number(d.firstCategoryWinnerCount))&&Number(d.firstCategoryWinnerCount)>=0;

/**
 * Detect whether a *future target draw* is the exact fifth consecutive draw
 * offering the current EUR250m maximum after four completed cap draws with no
 * first-category winner.  Inputs must be official completed-draw records plus
 * an independently verified advertised jackpot for the target draw.
 *
 * This detector has no execution authority.
 */
export function detectEuroMillionsFifthCapTarget({completedDraws=[],targetDraw=null,officialHistoryVerified=false,targetAdvertisedJackpotVerified=false}={}){
  const ordered=Array.isArray(completedDraws)?completedDraws.filter(validDraw).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))):[];
  const targetOk=targetDraw&&typeof targetDraw.date==='string'&&Number(targetDraw.advertisedJackpotEUR)===CAP_EUR;
  let streak=0;
  for(let i=ordered.length-1;i>=0;i--){
    const d=ordered[i];
    if(Number(d.advertisedJackpotEUR)!==CAP_EUR||Number(d.firstCategoryWinnerCount)!==0)break;
    streak++;
  }
  const gates={
    officialHistoryVerified:officialHistoryVerified===true,
    targetAdvertisedJackpotVerified:targetAdvertisedJackpotVerified===true&&targetOk===true,
    fourImmediatelyPrecedingCapDrawsWithoutTopWinner:streak>=4,
  };
  const exactFifthCapTarget=Object.values(gates).every(Boolean);
  return {
    version:VERSION,
    capEUR:CAP_EUR,
    completedCapNoWinnerStreak:streak,
    target:{date:targetDraw?.date??null,advertisedJackpotEUR:Number.isFinite(Number(targetDraw?.advertisedJackpotEUR))?Number(targetDraw.advertisedJackpotEUR):null},
    gates,
    exactFifthCapTarget,
    researchUse:exactFifthCapTarget?'EXACT_FIFTH_CAP_TARGET_CANDIDATE_FOR_EV_REVIEW':'NOT_EXACT_FIFTH_CAP_TARGET',
    usableForExecution:false,
    execution:execution(),
    hardGuards:{completedDrawsMustBeOfficial:true,targetJackpotMustBeVerifiedPreDraw:true,capAmountExact:true,topWinnerResetsStreak:true,noOutcomeSelection:true,realMoneyAllowed:false}
  };
}
