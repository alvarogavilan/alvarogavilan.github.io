import assert from 'node:assert/strict';
import {parsePlaytechMhbTickerXml,PLAYTECH_MHB_TARGETS} from './playtech-mhb-ticker-parser-v1.mjs';

const xml=`<request startTimestamp="1000" execInterval="300" casino="casino-es" info="2">
<gamedata game="krjp-2" gamegroup="krjp" local="0" timestamp="1501" winc="7"><amount-list><amount currency="usd" step="0.02" guranteedHitAmount="2000" wins="555.50" instancecode="GLOBAL-A">1800.00</amount><amount currency="eur" step="0.01" guranteedHitAmount="2000" wins="556.50" instancecode="GLOBAL-A">1875.25</amount></amount-list></gamedata>
<gamedata game="krjp-3" gamegroup="krjp" local="0" timestamp="1502" winc="8"><amount-list><amount currency="eur" guaranteedHitTime="2000" instancecode="GLOBAL-A">740.10</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp" local="0" timestamp="1503" winc="9"><amount-list><amount currency="eur" guaranteedHitTime="2500" instancecode="GLOBAL-A">430.00</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp" local="1" timestamp="1503" winc="9"><amount-list><amount currency="eur" guaranteedHitTime="2600" instancecode="LOCAL-B">420.00</amount></amount-list></gamedata>
<gamedata game="aognjp-3" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guaranteedHitAmount="500" instancecode="GLOBAL-A">490.61</amount></amount-list></gamedata>
<gamedata game="aognjp-7" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guranteedHitAmount="50" instancecode="GLOBAL-A">49.80</amount></amount-list></gamedata>
<gamedata game="mrj-4" gamegroup="mrj" local="0"><amount-list><amount currency="eur" instancecode="GLOBAL-A">807954.20</amount></amount-list></gamedata>
<gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="1600" winc="42"><amount-list><amount currency="eur" guaranteedHitTime="2700" wins="1234.56" instancecode="GLOBAL-A">123.45</amount></amount-list></gamedata>
<gamedata game="sljp-2" gamegroup="sljp" local="0" timestamp="1600" winc="11"><amount-list><amount currency="eur" guaranteedHitTime="9000" instancecode="GLOBAL-A">1138.00</amount></amount-list></gamedata>
<gamedata game="sljp-3" gamegroup="sljp" local="0" timestamp="1600" winc="3"><amount-list><amount currency="eur" instancecode="GLOBAL-A">220292.00</amount></amount-list></gamedata>
<gamedata game="sljp-1" gamegroup="sljp" local="1"><amount-list><amount currency="eur" guaranteedHitTime="2800" instancecode="LOCAL-SL">999.00</amount></amount-list></gamedata>
</request>`;

for(const code of ['aognjp-2','aognjp-3','aognjp-7','sljp-1','sljp-2','sljp-3']) assert.equal(PLAYTECH_MHB_TARGETS[code].providerScope,'GLOBAL');
const all=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500});
assert.equal(all.version,'playtech-mhb-ticker-parser-v1.6-win-count-timestamps');
assert.equal(all.rows.length,10);
assert.equal(all.rejected.providerScope,2);
assert.equal(all.requestCasino,'casino-es');
assert.equal(all.requestStartTimestamp,1000);
assert.equal(all.requestExecInterval,300);
assert.equal(all.guards.winCountPreservedFromGamedataWinc,true);
assert.equal(all.guards.amountWinsNotConfusedWithWinCount,true);

const r=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500,currency:'EUR',casino:'casino-es',local:0,instanceCode:'GLOBAL-A'});
assert.equal(r.rows.length,9);
const by=Object.fromEntries(r.rows.map(x=>[x.code,x]));
assert.equal(by['sljp-1'].gameGroup,'sljp');
assert.equal(by['sljp-1'].gameTimestamp,1600);
assert.equal(by['sljp-1'].winCount,42);
assert.equal(by['sljp-1'].wins,1234.56);
assert.equal(by['sljp-1'].totalWinnings,1234.56);
assert.notEqual(by['sljp-1'].winCount,by['sljp-1'].totalWinnings);
assert.equal(by['sljp-1'].secondsToGuaranteedHit,1200);
assert.equal(by['sljp-1'].failClosedMismatch,false);
assert.equal(by['sljp-2'].secondsToGuaranteedHit,7500);
assert.equal(by['sljp-3'].guaranteeObserved,'NONE');

const localOnly=parsePlaytechMhbTickerXml(xml,{currency:'eur',casino:'casino-es',local:1,instanceCode:'LOCAL-SL'});
assert.equal(localOnly.rows.length,0);
assert.ok(localOnly.rejected.providerScope>=2);

const missingTimeXml=`<request casino="casino-es" info="2"><gamedata game="sljp-1" gamegroup="sljp" local="0"><amount-list><amount currency="eur">123.00</amount></amount-list></gamedata></request>`;
const missingTime=parsePlaytechMhbTickerXml(missingTimeXml,{currency:'eur',casino:'casino-es',local:0});
assert.equal(missingTime.rows.length,1);
assert.equal(missingTime.rows[0].failClosedMismatch,true);

assert.equal(r.guards.realMoneyAllowed,false);
console.log('playtech-mhb-ticker-parser-v1.test.mjs: PASS');
