import assert from 'node:assert/strict';
import {validateBetfairSportingServerSnapshot} from '../casino/jackpots/betfair-sporting-server-binding-validator-v1.mjs';

const configBinding={
  sameDocument:true,
  sourceBetfairOwned:true,
  sourceInitialResources:true,
  sourceUrl:'https://casino.betfair.es/api/initialResources/session',
  jackpotsCasino:'bfes',
  tickerUrl:'https://ticker.example/sporting.xml',
  instanceCode:null,
};
const responseUrl='https://ticker.example/sporting.xml?cacheBust=123';
const tickerXml=`<response>
  <request casino="bfes" startTimestamp="1000" execInterval="5" />
  <gamedata game="sljp-1" local="0" timestamp="1000" winc="7" gamegroup="SPORTING">
    <amount currency="EUR" guaranteedHitTime="1100" wins="1000">123.45</amount>
  </gamedata>
  <gamedata game="sljp-2" local="0" timestamp="1000" winc="3" gamegroup="SPORTING">
    <amount currency="EUR" guaranteedHitTime="5100" wins="9000">1138.50</amount>
  </gamedata>
  <gamedata game="sljp-3" local="0" timestamp="1000" winc="1" gamegroup="SPORTING">
    <amount currency="EUR" wins="220000">220292.00</amount>
  </gamedata>
</response>`;

const daily=validateBetfairSportingServerSnapshot({configBinding,tickerXml,responseUrl,nowEpochSeconds:1002});
assert.equal(daily.valid,true);
assert.equal(daily.requiredCode,'sljp-1');
assert.equal(daily.tier,'DAILY');
assert.equal(daily.snapshot.code,'sljp-1');
assert.equal(daily.snapshot.amount,123.45);
assert.equal(daily.snapshot.guaranteedHitTime,1100);
assert.equal(daily.currentSljp1RowRecovered,true);
assert.equal(daily.currentDailyAmountExactVerified,true);
assert.equal(daily.currentSljp2RowRecovered,false);
assert.equal(daily.usableForOverduePair,true);
assert.equal(daily.realMoneyAllowed,false);

const weekly=validateBetfairSportingServerSnapshot({configBinding,tickerXml,responseUrl,nowEpochSeconds:1002,requiredCode:'sljp-2'});
assert.equal(weekly.valid,true);
assert.equal(weekly.requiredCode,'sljp-2');
assert.equal(weekly.tier,'WEEKLY');
assert.equal(weekly.snapshot.code,'sljp-2');
assert.equal(weekly.snapshot.amount,1138.50);
assert.equal(weekly.snapshot.guaranteedHitTime,5100);
assert.equal(weekly.currentSljp2RowRecovered,true);
assert.equal(weekly.currentWeeklyAmountExactVerified,true);
assert.equal(weekly.currentSljp1RowRecovered,false);
assert.equal(weekly.usableForOverduePair,false);
assert.equal(weekly.usableForWeeklyResearch,true);
assert.equal(weekly.decision,'NO_PLAY');
assert.equal(weekly.realMoneyAllowed,false);

const mega=validateBetfairSportingServerSnapshot({configBinding,tickerXml,responseUrl,nowEpochSeconds:1002,requiredCode:'sljp-3'});
assert.equal(mega.valid,false);
assert.equal(mega.reason,'SUPPORTED_TIMED_SLJP_CODE_REQUIRED');
assert.equal(mega.realMoneyAllowed,false);

const wrongCasino=validateBetfairSportingServerSnapshot({...{configBinding:{...configBinding,jackpotsCasino:'other'}},tickerXml,responseUrl,nowEpochSeconds:1002,requiredCode:'sljp-2'});
assert.equal(wrongCasino.valid,false);
assert.equal(wrongCasino.realMoneyAllowed,false);

console.log('betfair-sporting-server-binding-weekly-v1.test.mjs: PASS');
