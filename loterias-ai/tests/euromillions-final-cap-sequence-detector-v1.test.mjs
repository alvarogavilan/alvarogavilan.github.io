import assert from 'node:assert/strict';
import {detectEuroMillionsFifthCapTarget} from '../lotteries/euromillions-final-cap-sequence-detector-v1.mjs';

const cap=(date,winners=0)=>({date,advertisedJackpotEUR:250_000_000,firstCategoryWinnerCount:winners});
const four=[cap('2026-01-01'),cap('2026-01-05'),cap('2026-01-08'),cap('2026-01-12')];
const yes=detectEuroMillionsFifthCapTarget({completedDraws:four,targetDraw:{date:'2026-01-15',advertisedJackpotEUR:250_000_000},officialHistoryVerified:true,targetAdvertisedJackpotVerified:true});
assert.equal(yes.completedCapNoWinnerStreak,4);
assert.equal(yes.exactFifthCapTarget,true);
assert.equal(yes.usableForExecution,false);
assert.equal(yes.execution.decision,'NO_PLAY');

const onlyThree=detectEuroMillionsFifthCapTarget({completedDraws:four.slice(1),targetDraw:{date:'2026-01-15',advertisedJackpotEUR:250_000_000},officialHistoryVerified:true,targetAdvertisedJackpotVerified:true});
assert.equal(onlyThree.exactFifthCapTarget,false);

const winnerReset=detectEuroMillionsFifthCapTarget({completedDraws:[cap('2026-01-01'),cap('2026-01-05'),cap('2026-01-08',1),cap('2026-01-12')],targetDraw:{date:'2026-01-15',advertisedJackpotEUR:250_000_000},officialHistoryVerified:true,targetAdvertisedJackpotVerified:true});
assert.equal(winnerReset.completedCapNoWinnerStreak,1);
assert.equal(winnerReset.exactFifthCapTarget,false);

const notCap=detectEuroMillionsFifthCapTarget({completedDraws:four,targetDraw:{date:'2026-01-15',advertisedJackpotEUR:240_000_000},officialHistoryVerified:true,targetAdvertisedJackpotVerified:true});
assert.equal(notCap.exactFifthCapTarget,false);
assert.equal(notCap.gates.targetAdvertisedJackpotVerified,false);

const unverified=detectEuroMillionsFifthCapTarget({completedDraws:four,targetDraw:{date:'2026-01-15',advertisedJackpotEUR:250_000_000},officialHistoryVerified:false,targetAdvertisedJackpotVerified:true});
assert.equal(unverified.exactFifthCapTarget,false);
assert.equal(unverified.execution.realMoneyAllowed,false);

console.log('euromillions-final-cap-sequence-detector-v1.test.mjs PASS');
