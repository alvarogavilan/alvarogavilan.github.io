import assert from 'node:assert/strict';
import {buildExactSportingTickerUrl,runBetfairSportingLiveTickerProbe} from '../edge-backend/src/betfair-sporting-live-ticker-probe-v1.mjs';

const binding={
  sourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',
  jackpotsCasino:'betfair_es',
  tickerUrl:'https://example.playtech.com/new_jackpotxml.php',
  instanceCode:null,
  sameDocument:true,sourceBetfairOwned:true,sourceInitialResources:true,
};
const built=buildExactSportingTickerUrl(binding);
const u=new URL(built);
assert.equal(u.searchParams.get('info'),'1');
assert.equal(u.searchParams.get('casino'),'betfair_es');
assert.equal(u.searchParams.get('game'),'sljp-1');
assert.equal(u.searchParams.get('currency'),'eur');
assert.equal(u.searchParams.get('local'),'0');
assert.equal(buildExactSportingTickerUrl({...binding,tickerUrl:'https://example.playtech.com/webtickers'}),null);
assert.equal(buildExactSportingTickerUrl({...binding,sourceBetfairOwned:false}),null);
assert.equal(buildExactSportingTickerUrl({...binding,sourceUrl:'https://evil.example/initialResources/es_ES_desktop'}),null);
assert.equal(buildExactSportingTickerUrl({...binding,tickerUrl:'https://user:pass@example.playtech.com/new_jackpotxml.php'}),null);

const routed=buildExactSportingTickerUrl({...binding,tickerUrl:'https://example.playtech.com/new_jackpotxml.php?route=es-prod&casino=wrong&game=wrong&instanceCode=stale#frag'});
const routedUrl=new URL(routed);
assert.equal(routedUrl.searchParams.get('route'),'es-prod');
assert.equal(routedUrl.searchParams.get('casino'),'betfair_es');
assert.equal(routedUrl.searchParams.get('game'),'sljp-1');
assert.equal(routedUrl.searchParams.get('currency'),'eur');
assert.equal(routedUrl.searchParams.get('local'),'0');
assert.equal(routedUrl.searchParams.has('instanceCode'),false);
assert.equal(routedUrl.hash,'');
const withInstance=buildExactSportingTickerUrl({...binding,instanceCode:'ims-a',tickerUrl:'https://example.playtech.com/new_jackpotxml.php?route=es-prod'});
assert.equal(new URL(withInstance).searchParams.get('instanceCode'),'ims-a');

const xml=`<request currency="eur" startTimestamp="1990" execInterval="10" game="sljp-1" casino="betfair_es" info="1"><gamedata timestamp="2005" local="0" winc="42" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" step="0.01" wins="1000" currency="eur" guaranteedHitTime="2100">123.45</amount></amount-list></gamedata></request>`;
let requested=null;
const fetchImpl=async url=>{
  requested=String(url);
  return {ok:true,status:200,url:String(url),headers:{get:()=> 'application/xml'},text:async()=>xml};
};
const configProbeRunner=async()=>({version:'test-config',observedAt:'2026-08-26T17:00:00Z',discovery:{coLocatedBetfairConfigBindings:[binding]}});

let r=await runBetfairSportingLiveTickerProbe({configProbeRunner,fetchImpl,nowEpochSeconds:2010,maxFeedAgeIntervals:2});
assert.equal(r.valid,true);
assert.equal(r.exactBetfairSpainTickerImsBindingVerified,true);
assert.equal(r.currentSljp1RowRecovered,true);
assert.equal(r.currentDailyAmountExactVerified,true);
assert.equal(r.currentGuaranteedHitTimeExactVerified,true);
assert.equal(r.snapshot.code,'sljp-1');
assert.equal(r.snapshot.amount,123.45);
assert.equal(r.snapshot.guaranteedHitTime,2100);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.maxSpins,0);
assert.equal(r.currentSnapshotCannotProveOverdueByItself,true);
assert.equal(r.hardGuards.configuredRoutingQueryPreserved,true);
assert.equal(new URL(requested).searchParams.get('casino'),'betfair_es');

const equivalentBinding={...binding,sourceUrl:'https://casino.betfair.es/initialResources/es_ES_desktop'};
r=await runBetfairSportingLiveTickerProbe({configProbeRunner:async()=>({discovery:{coLocatedBetfairConfigBindings:[binding,equivalentBinding]}}),fetchImpl,nowEpochSeconds:2010});
assert.equal(r.valid,true);
assert.equal(r.bindingProvenance.equivalentConfigSourceCount,2);
assert.equal(r.bindingProvenance.distinctExactRequestCount,1);
assert.deepEqual(r.bindingProvenance.equivalentConfigSources.sort(),[binding.sourceUrl,equivalentBinding.sourceUrl].sort());
assert.equal(r.decision,'NO_PLAY');

r=await runBetfairSportingLiveTickerProbe({configProbeRunner:async()=>({discovery:{coLocatedBetfairConfigBindings:[binding,{...binding,jackpotsCasino:'other'}]}}),fetchImpl,nowEpochSeconds:2010});
assert.equal(r.valid,false);
assert.equal(r.reason,'AMBIGUOUS_EXACT_XML_BINDING');
assert.equal(r.distinctExactRequestCount,2);
assert.equal(r.realMoneyAllowed,false);

r=await runBetfairSportingLiveTickerProbe({configProbeRunner,fetchImpl:async url=>({ok:true,status:200,url:String(url),headers:{get:()=> 'application/xml'},text:async()=>'<bad />'}),nowEpochSeconds:2010});
assert.equal(r.valid,false);
assert.equal(r.reason,'SERVER_SNAPSHOT_VALIDATION_FAILED');
assert.equal(r.maxTotalStakeEUR,0);
console.log('betfair-sporting-live-ticker-probe-v1.test.mjs: PASS');
