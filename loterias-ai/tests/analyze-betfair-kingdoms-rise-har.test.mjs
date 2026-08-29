import assert from 'node:assert/strict';
import {analyzeBetfairKingdomsRiseHarObject as analyze} from '../scripts/analyze-betfair-kingdoms-rise-har.mjs';

const launcher={startedDateTime:'2026-08-29T14:00:00.000Z',request:{url:'https://launcher.betfair.es/?mode=real&gameId=kingdom-rise-sands-of-fury-cptn&token=PRIVATE'},response:{content:{text:''}}};
const har={log:{entries:[
  launcher,
  {startedDateTime:'2026-08-29T14:00:01.000Z',request:{url:'https://ticker.example/new_jackpotxml.php?info=1&casino=bf_es&game=krjp-3&currency=eur&ssoid=PRIVATE'},response:{content:{text:'<request currency="eur" casino="bf_es" info="1"><gamedata timestamp="1788012001" local="0" winc="12" gamegroup="krjp" game="krjp-3"><amount-list><amount pos="1" sign="€" step="0.01" wins="12.00" instancecode="" currency="eur" guranteedHitAmount="2000.00">1990.25</amount></amount-list></gamedata></request>'}}}
]}};

let r=analyze(har);
assert.equal(r.ok,true);
assert.equal(r.exactLauncherObserved,true);
assert.equal(r.eurGlobalRowCount,1);
assert.equal(r.guaranteedAmountRows.length,1);
assert.equal(r.guaranteedAmountRows[0].game,'krjp-3');
assert.equal(r.guaranteedAmountRows[0].amount,1990.25);
assert.equal(r.guaranteedAmountRows[0].guaranteedHitAmount,2000);
assert.equal(r.guaranteedAmountRows[0].boundarySemantic,'GUARANTEED_AMOUNT_BOUNDARY');
assert.equal(r.guaranteedAmountRows[0].semanticTierCandidate,'POWER_STRIKE_BY_BOUNDARY_SEMANTICS');
assert.equal(r.guaranteedAmountRows[0].providerTierIdentity,'UNVERIFIED_KRJP_NUMERIC_TIER');
assert.equal(r.guaranteedAmountRows[0].numericTierMappingRequiredForSemanticCandidate,false);
assert.equal(r.guaranteedAmountRows[0].exactPowerStrikeBindingVerified,false);
assert.equal(r.guaranteedAmountRows[0].tickerEndpoint,'https://ticker.example/new_jackpotxml.php');
assert.equal(r.exactBetfairTickerBindingCandidate,true);
assert.equal(r.powerStrikeSemanticBindingCandidate,true);
assert.equal(r.numericKrjp2Krjp3MappingRequiredForSemanticBinding,false);
assert.equal(r.amountBoundaryCaptureCandidate,true);
assert.equal(r.amountBoundaryPromotionAllowed,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
assert.equal(JSON.stringify(r).includes('ssoid='),false);
assert.equal(JSON.stringify(r).includes('token='),false);

const withCorrectSpelling={log:{entries:[
  launcher,
  {request:{url:'https://ticker.example/new_jackpotxml.php?info=1&casino=bf_es&game=krjp-x&currency=eur'},response:{content:{text:'<request><gamedata local="0" gamegroup="krjp" game="krjp-x"><amount-list><amount currency="eur" guaranteedHitAmount="77.50">76.25</amount></amount-list></gamedata></request>'}}}
]}};
r=analyze(withCorrectSpelling);
assert.equal(r.guaranteedAmountRows[0].guaranteedHitAmount,77.5);
assert.equal(r.guaranteedAmountRows[0].semanticTierCandidate,'POWER_STRIKE_BY_BOUNDARY_SEMANTICS');
assert.equal(r.powerStrikeSemanticBindingCandidate,true);
assert.equal(r.amountBoundaryPromotionAllowed,false);

const timed={log:{entries:[
  launcher,
  {request:{url:'https://ticker.example/new_jackpotxml.php?info=1&casino=bf_es&game=krjp-2&currency=eur'},response:{content:{text:'<request><gamedata local="0" gamegroup="krjp" game="krjp-2"><amount-list><amount currency="eur" guaranteedHitTime="1788050000">1250.00</amount></amount-list></gamedata></request>'}}}
]}};
r=analyze(timed);
assert.equal(r.guaranteedTimeRows.length,1);
assert.equal(r.guaranteedTimeRows[0].boundarySemantic,'GUARANTEED_TIME_BOUNDARY');
assert.equal(r.guaranteedTimeRows[0].semanticTierCandidate,'DAILY_STRIKE_BY_BOUNDARY_SEMANTICS');
assert.equal(r.dailyStrikeSemanticBindingCandidate,true);
assert.equal(r.powerStrikeSemanticBindingCandidate,false);

const dual={log:{entries:[
  launcher,
  {request:{url:'https://ticker.example/new_jackpotxml.php?info=1&casino=bf_es&game=krjp-z&currency=eur'},response:{content:{text:'<request><gamedata local="0" gamegroup="krjp" game="krjp-z"><amount-list><amount currency="eur" guranteedHitAmount="2000" guaranteedHitTime="1788050000">1900</amount></amount-list></gamedata></request>'}}}
]}};
r=analyze(dual);
assert.equal(r.dualBoundaryRows.length,1);
assert.equal(r.powerStrikeSemanticBindingCandidate,false);
assert.equal(r.dailyStrikeSemanticBindingCandidate,false);
assert.equal(r.amountBoundaryPromotionAllowed,false);

r=analyze({log:{entries:[]}});
assert.equal(r.ok,true);
assert.equal(r.exactLauncherObserved,false);
assert.equal(r.amountBoundaryCaptureCandidate,false);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('analyze-betfair-kingdoms-rise-har.test.mjs: PASS');
