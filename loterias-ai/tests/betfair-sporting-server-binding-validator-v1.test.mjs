import assert from 'node:assert/strict';
import {validateBetfairSportingServerSnapshot} from '../casino/jackpots/betfair-sporting-server-binding-validator-v1.mjs';

const binding={
  sourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',
  jackpotsCasino:'betfair_es',
  tickerUrl:'https://example.playtech.com/new_jackpotxml.php',
  instanceCode:null,
  sameDocument:true,sourceBetfairOwned:true,sourceInitialResources:true,
};
const xml=`<root><request casino="betfair_es" currency="eur" game="sljp-1" startTimestamp="1990" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="2005" winc="42"><amount currency="EUR" guaranteedHitTime="2100" step="0.01" wins="1000">123.45</amount></gamedata></root>`;

let r=validateBetfairSportingServerSnapshot({configBinding:binding,tickerXml:xml,responseUrl:'https://example.playtech.com/new_jackpotxml.php?info=1&casino=betfair_es&game=sljp-1&currency=eur&local=0',nowEpochSeconds:2010});
assert.equal(r.valid,true);
assert.equal(r.usableForOverduePair,true);
assert.equal(r.exactBetfairSpainTickerImsBindingVerified,true);
assert.equal(r.currentSljp1RowRecovered,true);
assert.equal(r.currentDailyAmountExactVerified,true);
assert.equal(r.currentGuaranteedHitTimeExactVerified,true);
assert.equal(r.expectedBetfairImsCasino,'betfair_es');
assert.equal(r.snapshot.code,'sljp-1');
assert.equal(r.snapshot.amount,123.45);
assert.equal(r.snapshot.winCount,42);
assert.equal(r.snapshot.guaranteedHitTime,2100);
assert.equal(r.feedAgeSeconds,5);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.currentSnapshotCannotProveOverdueByItself,true);

r=validateBetfairSportingServerSnapshot({configBinding:{...binding,sameDocument:false},tickerXml:xml,responseUrl:binding.tickerUrl,nowEpochSeconds:2010});
assert.equal(r.valid,false);assert.equal(r.reason,'CONFIG_BINDING_NOT_COLOCATED_AND_VERIFIED');
r=validateBetfairSportingServerSnapshot({configBinding:binding,tickerXml:xml,responseUrl:'https://other.playtech.com/new_jackpotxml.php',nowEpochSeconds:2010});
assert.equal(r.valid,false);assert.equal(r.reason,'TICKER_RESPONSE_ENDPOINT_MISMATCH');
r=validateBetfairSportingServerSnapshot({configBinding:binding,tickerXml:xml,responseUrl:binding.tickerUrl,nowEpochSeconds:2030});
assert.equal(r.valid,false);assert.equal(r.reason,'SERVER_FEED_TOO_STALE');
const wrongCasino=xml.replaceAll('betfair_es','other_ims');
r=validateBetfairSportingServerSnapshot({configBinding:binding,tickerXml:wrongCasino,responseUrl:binding.tickerUrl,nowEpochSeconds:2010});
assert.equal(r.valid,false);assert.equal(r.reason,'EXACT_SLJP1_ROW_NOT_RECOVERED');
console.log('betfair-sporting-server-binding-validator-v1.test.mjs: PASS');
