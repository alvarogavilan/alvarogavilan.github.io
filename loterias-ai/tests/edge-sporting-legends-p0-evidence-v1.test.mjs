import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBreakthroughCards,cardHtml} from '../edge-live/research-breakthroughs-v1.mjs';

const p='loterias-ai/edge-live/evidence/betfair-spain-sporting-legends-ap-mccoy-p0-v1.json';
const data=JSON.parse(fs.readFileSync(p,'utf8'));

assert.equal(data.market,'ES');
assert.equal(data.sourceType,'ONLINE');
assert.equal(data.promotion,false);
assert.equal(data.execution.decision,'NO_PLAY');
assert.equal(data.execution.realMoneyAllowed,false);
assert.equal(data.execution.realStakeEUR,0);
assert.equal(data.execution.maxSpins,0);
assert.equal(data.execution.maxTotalStakeEUR,0);

assert.equal(data.currentSpanishGamePage.pageHeadlineJackpotSnapshotEUR,9178.25);
assert.equal(data.currentSpanishGamePage.headlineTierBindingVerified,false);
assert.equal(data.retrospectiveSpainRtpValidation.latestObservedApMcCoyRealizedRtpPct,108.41);
assert.equal(data.retrospectiveSpainRtpValidation.provesProspectivePositiveEv,false);

assert.equal(data.economicScreen.exactServedRtpVariantVerified,false);
assert.equal(data.economicScreen.mainGame.conservativeUnboundRtpPct,93.03);
assert.equal(data.economicScreen.mainGame.conservativeBreakEvenAdditionalJackpotReturnPct,6.97);
assert.equal(data.economicScreen.accumulatorPlus.nominalBestVariantBreakEvenAdditionalJackpotReturnPct,2.83);
assert.equal(data.economicScreen.accumulatorPlus.exactJackpotStakeWeightingVerified,false);
assert.equal(data.economicScreen.accumulatorPlus.nominalBreakEvenUsableForExecution,false);
assert.equal(data.gates.powerPlayJackpotStakeWeightingVerified,false);
assert.equal(data.hardGuards.retrospectiveRtpAbove100DoesNotProveProspectiveEdge,true);
assert.equal(data.hardGuards.accumulatorPlusRtpCannotDriveExecutionUntilJackpotStakeWeightingVerified,true);

const cards=buildBreakthroughCards(data);
assert.equal(cards.length,1);
const c=cards[0];
assert.equal(c.kind,'SPORTING_P0');
assert.equal(c.action,'NO_PLAY');
assert.equal(c.closedGates,6);
assert.equal(c.totalGates,15);
assert.equal(c.conservativeBaseRtpPct,93.03);
assert.equal(c.conservativeBreakEvenAdditionalPct,6.97);
assert.equal(c.nominalPowerPlayBreakEvenAdditionalPct,2.83);
assert.equal(c.powerPlayWeightingVerified,false);

const html=cardHtml(c);
assert.match(html,/6\/15/);
assert.match(html,/93\.03%/);
assert.match(html,/6\.97%/);
assert.match(html,/2,83% NOMINAL · BLOQUEADO/);
assert.match(html,/108,41% es retrospectivo/);
assert.match(html,/NO ES SEÑAL DE APUESTA/);
assert.doesNotMatch(html,/JUGAR AHORA/);

console.log('edge-sporting-legends-p0-evidence-v1.test.mjs: PASS');
