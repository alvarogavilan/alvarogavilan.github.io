import assert from 'node:assert/strict';
import {parsePlaytechMhbTickerXml,PLAYTECH_MHB_TARGETS} from '../casino/jackpots/playtech-mhb-ticker-parser-v1.mjs';

const xml=`<request startTimestamp="1000" execInterval="300" casino="casino-es" info="2">
<gamedata game="krjp-2" gamegroup="krjp" local="0"><amount-list><amount currency="usd" step="0.02" guranteedHitAmount="2000" instancecode="GLOBAL-A">1800.00</amount><amount currency="eur" step="0.01" guranteedHitAmount="2000" instancecode="GLOBAL-A">1875.25</amount></amount-list></gamedata>
<gamedata game="krjp-3" gamegroup="krjp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="2000" instancecode="GLOBAL-A">740.10</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="2500" instancecode="GLOBAL-A">430.00</amount></amount-list></gamedata>
<gamedata game="aognjp-2" gamegroup="aognjp" local="1"><amount-list><amount currency="eur" guaranteedHitTime="2600" instancecode="LOCAL-B">420.00</amount></amount-list></gamedata>
<gamedata game="aognjp-3" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guaranteedHitAmount="500" instancecode="GLOBAL-A">490.61</amount></amount-list></gamedata>
<gamedata game="aognjp-7" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guranteedHitAmount="50" instancecode="GLOBAL-A">49.80</amount></amount-list></gamedata>
<gamedata game="mrj-4" gamegroup="mrj" local="0"><amount-list><amount currency="eur" instancecode="GLOBAL-A">807954.20</amount></amount-list></gamedata>
<gamedata game="sljp-1" gamegroup="sljp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="2700" instancecode="GLOBAL-A">123.45</amount></amount-list></gamedata>
<gamedata game="sljp-2" gamegroup="sljp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="9000" instancecode="GLOBAL-A">1138.00</amount></amount-list></gamedata>
<gamedata game="sljp-3" gamegroup="sljp" local="0"><amount-list><amount currency="eur" instancecode="GLOBAL-A">220292.00</amount></amount-list></gamedata>
<gamedata game="sljp-1" gamegroup="sljp" local="1"><amount-list><amount currency="eur" guaranteedHitTime="2800" instancecode="LOCAL-SL">999.00</amount></amount-list></gamedata>
</request>`;

for(const code of ['aognjp-2','aognjp-3','aognjp-7','sljp-1','sljp-2','sljp-3']) assert.equal(PLAYTECH_MHB_TARGETS[code].providerScope,'GLOBAL');
assert.equal(PLAYTECH_MHB_TARGETS['sljp-1'].guarantee,'TIME');
assert.equal(PLAYTECH_MHB_TARGETS['sljp-2'].guarantee,'TIME');
assert.equal(PLAYTECH_MHB_TARGETS['sljp-3'].guarantee,'NONE');

const all=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500});
assert.equal(all.version,'playtech-mhb-ticker-parser-v1.5-sporting-legends');
assert.equal(all.rows.length,10);
assert.equal(all.rejected.providerScope,2);
assert.equal(all.guards.multiCurrencySafe,true);
assert.equal(all.guards.topologyMetadataPreserved,true);
assert.equal(all.guards.providerDocumentedScopeEnforced,true);
assert.equal(all.guards.instanceCodeOptionalByTickerSpec,true);
assert.equal(all.requestCasino,'casino-es');
assert.ok(all.rows.some(x=>x.code==='krjp-2'&&x.currency==='usd'&&x.amount===1800));
assert.ok(all.rows.filter(x=>x.code.startsWith('aognjp-')).every(x=>x.providerScope==='GLOBAL'&&x.local!==1));
assert.ok(all.rows.filter(x=>x.code.startsWith('sljp-')).every(x=>x.providerScope==='GLOBAL'&&x.local!==1));

const r=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:1500,currency:'EUR',casino:'casino-es',local:0,instanceCode:'GLOBAL-A'});
assert.equal(r.filters.currency,'eur');
assert.equal(r.filters.casino,'casino-es');
assert.equal(r.filters.local,0);
assert.equal(r.rows.length,9);
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
assert.equal(by['aognjp-2'].protocolBinding.instanceCodeOptional,true);
assert.equal(by['sljp-1'].network,'SPORTING_LEGENDS');
assert.equal(by['sljp-1'].tier,'DAILY');
assert.equal(by['sljp-1'].secondsToGuaranteedHit,1200);
assert.equal(by['sljp-1'].failClosedMismatch,false);
assert.equal(by['sljp-2'].tier,'WEEKLY');
assert.equal(by['sljp-2'].secondsToGuaranteedHit,7500);
assert.equal(by['sljp-3'].tier,'MEGA');
assert.equal(by['sljp-3'].guaranteeObserved,'NONE');
assert.equal(by['sljp-3'].failClosedMismatch,false);

const localOnly=parsePlaytechMhbTickerXml(xml,{currency:'eur',casino:'casino-es',local:1,instanceCode:'LOCAL-SL'});
assert.equal(localOnly.rows.length,0);
assert.ok(localOnly.rejected.providerScope>=2);

const missingTimeXml=`<request casino="casino-es" info="2"><gamedata game="sljp-1" gamegroup="sljp" local="0"><amount-list><amount currency="eur">123.00</amount></amount-list></gamedata></request>`;
const missingTime=parsePlaytechMhbTickerXml(missingTimeXml,{currency:'eur',casino:'casino-es',local:0});
assert.equal(missingTime.rows.length,1);
assert.equal(missingTime.rows[0].failClosedMismatch,true);
assert.equal(missingTime.rows[0].guaranteeObserved,'NONE');

const noInstanceXml=`<request casino="casino-es" info="2"><gamedata game="aognjp-2" gamegroup="aognjp" local="0"><amount-list><amount currency="eur" guaranteedHitTime="2500">430.00</amount></amount-list></gamedata></request>`;
const noInstance=parsePlaytechMhbTickerXml(noInstanceXml,{currency:'eur',casino:'casino-es',local:0});
assert.equal(noInstance.rows.length,1);
assert.equal(noInstance.rows[0].instanceCode,null);
assert.equal(noInstance.rows[0].protocolBinding.instanceCodeOptional,true);
assert.equal(noInstance.rows[0].protocolBinding.instanceCodePresent,false);

const wrongCasino=parsePlaytechMhbTickerXml(xml,{currency:'eur',casino:'other-es'});
assert.equal(wrongCasino.rows.length,0);
assert.ok(wrongCasino.rejected.casino>0);
const wrongInstance=parsePlaytechMhbTickerXml(xml,{currency:'eur',instanceCode:'NOPE'});
assert.equal(wrongInstance.rows.length,0);
assert.ok(wrongInstance.rejected.instanceCode>0);
assert.equal(r.guards.realMoneyAllowed,false);
console.log('playtech-mhb-ticker-parser-v1.test.mjs: PASS');
