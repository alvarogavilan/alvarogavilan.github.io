import assert from 'node:assert/strict';
import {parsePlaytechMhbTickerXml} from '../casino/jackpots/playtech-mhb-ticker-parser-v1.mjs';

const xml=`<request startTimestamp="1000" execInterval="300" casino="casino-es" info="2">
<gamedata game="krjp-2" gamegroup="krjp" local="0"><amount-list><amount currency="usd" step="0.02" guranteedHitAmount="2000" instancecode="GLOBAL-A">1800.00</amount><amount currency="eur" step="0.01" guranteedHitAmount="2000" instancecode="GLOBAL-A">1875.25</amount></amount-list></gamedata>
<gamedata game="krjp-3" gamegroup="krjp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="2000" instancecode="GLOBAL-A">740.10</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="2500" instancecode="GLOBAL-A">430.00</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp" local="1"><amount-list><amount currency="eur" guaranteedHitTime="2600" instancecode="LOCAL-B">420.00</amount></amount-list></gamedata>
<gamedata game="aognjp-3" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guaranteedHitAmount="500" instancecode="GLOBAL-A">490.61</amount></amount-list></gamedata>
<gamedata game="aognjp-7" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guranteedHitAmount="50" instancecode="GLOBAL-A">49.80</amount></amount-list></gamedata>
<gamedata game="mrj-4" gamegroup="mrj" local="0"><amount-list><amount currency="eur" instancecode="GLOBAL-A">807954.20</amount></amount-list></gamedata>
</request>`;

const all=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500});
assert.equal(all.rows.length,8);
assert.equal(all.guards.multiCurrencySafe,true);
assert.equal(all.guards.topologyMetadataPreserved,true);
assert.equal(all.requestCasino,'casino-es');
assert.ok(all.rows.some(x=>x.code==='krjp-2'&&x.currency==='usd'&&x.amount===1800));

const r=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500,currency:'EUR',casino:'casino-es',local:0,instanceCode:'GLOBAL-A'});
assert.equal(r.filters.currency,'eur');
assert.equal(r.filters.casino,'casino-es');
assert.equal(r.filters.local,0);
assert.equal(r.rows.length,6);
assert.ok(r.rows.every(x=>x.currency==='eur'&&x.requestCasino==='casino-es'&&x.local===0&&x.instanceCode==='GLOBAL-A'));
const by=Object.fromEntries(r.rows.map(x=>[x.code,x]));
assert.equal(by['krjp-2'].tier,'POWER_STRIKE');
assert.equal(by['krjp-2'].guaranteedHitAmount,2000);
assert.equal(by['krjp-2'].distanceToGuaranteedHitAmount,124.75);
assert.equal(by['krjp-3'].secondsToGuaranteedHit,500);
assert.equal(by['aognjp-2'].secondsToGuaranteedHit,1000);
assert.ok(Math.abs(by['aognjp-3'].distanceToGuaranteedHitAmount-9.39)<1e-9);
assert.ok(Math.abs(by['aognjp-7'].distanceToGuaranteedHitAmount-0.2)<1e-9);
assert.equal(by['mrj-4'].guaranteeObserved,'NONE');
assert.equal(by['aognjp-2'].isLocal,false);

const localOnly=parsePlaytechMhbTickerXml(xml,{currency:'eur',casino:'casino-es',local:1,instanceCode:'LOCAL-B'});
assert.equal(localOnly.rows.length,1);
assert.equal(localOnly.rows[0].code,'aognjp-2');
assert.equal(localOnly.rows[0].isLocal,true);

const wrongCasino=parsePlaytechMhbTickerXml(xml,{currency:'eur',casino:'other-es'});
assert.equal(wrongCasino.rows.length,0);
assert.ok(wrongCasino.rejected.casino>0);

const wrongInstance=parsePlaytechMhbTickerXml(xml,{currency:'eur',instanceCode:'NOPE'});
assert.equal(wrongInstance.rows.length,0);
assert.ok(wrongInstance.rejected.instanceCode>0);
assert.equal(r.guards.realMoneyAllowed,false);
console.log('playtech-mhb-ticker-parser-v1.test.mjs: PASS');
