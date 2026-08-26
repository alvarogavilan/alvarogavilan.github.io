import assert from 'node:assert/strict';
import {parsePlaytechMhbTickerXml} from '../casino/jackpots/playtech-mhb-ticker-parser-v1.mjs';

const xml=`<request currency="eur" startTimestamp="1000" execInterval="300" casino="x" info="2">
<gamedata game="krjp-2" gamegroup="krjp"><amount-list><amount currency="eur" step="0.01" guranteedHitAmount="2000">1875.25</amount></amount-list></gamedata>
<gamedata game="krjp-3" gamegroup="krjp"><amount-list><amount currency="eur" guaranteedHitTime="2000">740.10</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp"><amount-list><amount currency="eur" guaranteedHitTime="2500">430.00</amount></amount-list></gamedata>
<gamedata game="aognjp-3" gamegroup="aognjp"><amount-list><amount currency="eur" guaranteedHitAmount="500">490.61</amount></amount-list></gamedata>
<gamedata game="aognjp-7" gamegroup="aognjp"><amount-list><amount currency="eur" guranteedHitAmount="50">49.80</amount></amount-list></gamedata>
<gamedata game="mrj-4" gamegroup="mrj"><amount-list><amount currency="eur">807954.20</amount></amount-list></gamedata>
</request>`;

const r=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500});
assert.equal(r.rows.length,6);
const by=Object.fromEntries(r.rows.map(x=>[x.code,x]));
assert.equal(by['krjp-2'].tier,'POWER_STRIKE');
assert.equal(by['krjp-2'].guaranteedHitAmount,2000);
assert.equal(by['krjp-2'].distanceToGuaranteedHitAmount,124.75);
assert.equal(by['krjp-3'].secondsToGuaranteedHit,500);
assert.equal(by['aognjp-2'].secondsToGuaranteedHit,1000);
assert.ok(Math.abs(by['aognjp-3'].distanceToGuaranteedHitAmount-9.39)<1e-9);
assert.ok(Math.abs(by['aognjp-7'].distanceToGuaranteedHitAmount-0.2)<1e-9);
assert.equal(by['mrj-4'].guaranteeObserved,'NONE');
assert.equal(r.guards.realMoneyAllowed,false);
console.log('playtech-mhb-ticker-parser-v1.test.mjs: PASS');
