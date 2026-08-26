import assert from 'node:assert/strict';
import fs from 'node:fs';

const d=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/playtech-sporting-webticker-request-semantics-v1.json','utf8'));

assert.equal(d.scope.onlineOnly,true);
assert.equal(d.scope.nonPromoOnly,true);
assert.equal(d.scope.operatorTarget,'Betfair Spain');
assert.equal(d.scope.provider,'Playtech');
assert.equal(d.closedSemantics.sportingDailyProviderCodeSljp1Verified,true);
assert.equal(d.closedSemantics.sportingDailyProviderScopeGlobalLocal0Verified,true);
assert.equal(d.closedSemantics.providerGameBasedTickerInfo1SemanticsVerified,true);
assert.equal(d.closedSemantics.providerGameBasedTickerRequiresCasinoAndGameVerified,true);
assert.equal(d.closedSemantics.providerTickerLocalCurrencyInstanceCodeParameterSemanticsVerified,true);
assert.equal(d.closedSemantics.providerGamedataTimestampUnixUtcSemanticsVerified,true);
assert.equal(d.closedSemantics.providerGamedataWincWinCountSemanticsVerified,true);
assert.equal(d.closedSemantics.providerGuaranteedHitTimeUnixUtcSemanticsVerified,true);
assert.equal(d.closedSemantics.modernPlaytechPlatformWebtickersArchitectureObservedAtAnotherOperator,true);
assert.equal(d.stillUnknownForBetfairSpain.exactInitialResourcesJackpotsCasinoVerified,false);
assert.equal(d.stillUnknownForBetfairSpain.exactConfiguredTickerEndpointVerified,false);
assert.equal(d.stillUnknownForBetfairSpain.exactModernWebtickersTransportVerified,false);
assert.equal(d.stillUnknownForBetfairSpain.exactModernResponseSchemaVerified,false);
assert.equal(d.stillUnknownForBetfairSpain.currentSljp1AmountVerified,false);
assert.equal(d.hardGuards.otherOperatorCasinoNameCannotTransferToBetfair,true);
assert.equal(d.hardGuards.otherOperatorEndpointCannotTransferToBetfair,true);
assert.equal(d.hardGuards.aggregateResponseFieldsDoNotProveRowIdentity,true);
assert.equal(d.execution.decision,'NO_PLAY');
assert.equal(d.execution.realMoneyAllowed,false);
assert.equal(d.execution.maxSpins,0);
assert.equal(d.execution.maxTotalStakeEUR,0);

console.log('playtech-sporting-webticker-request-semantics-v1.test.mjs: PASS');
