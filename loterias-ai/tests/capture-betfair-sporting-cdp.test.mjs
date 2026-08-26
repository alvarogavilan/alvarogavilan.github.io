import assert from 'node:assert/strict';
import {
  isEligibleBetfairSportingTarget,
  defaultPrivateCapturePath,
  discoverConfiguredTickerEndpointsFromText,
  filterRelevantCaptureEntries,
} from '../scripts/capture-betfair-sporting-cdp.mjs';

assert.equal(isEligibleBetfairSportingTarget('https://launcher.betfair.es/?gameId=ap-mccoy-sporting-legends-cptn&mode=real'),true);
assert.equal(isEligibleBetfairSportingTarget('https://casino.betfair.es/juego/ap-mccoy-sporting-legends-cptn'),true);
assert.equal(isEligibleBetfairSportingTarget('https://launcher.betfair.es/?gameId=other-game'),false);
assert.equal(isEligibleBetfairSportingTarget('https://evil.example/?gameId=ap-mccoy-sporting-legends-cptn'),false);

const privatePath=defaultPrivateCapturePath({cwd:'/repo',epochMs:0});
assert.equal(privatePath.startsWith('/repo/.git/edge-private/'),true);
assert.equal(privatePath.endsWith('.har'),true);

const configText=String.raw`{"jackpotsCasino":"bf_es","jackpotsCasinoUrl":"https:\/\/tickers.playtech.example\/new_jackpotxml.php?configured=secret","liveEndpointUrl":"https:\/\/webtickers.playtech.example\/webtickers"}`;
assert.deepEqual(discoverConfiguredTickerEndpointsFromText(configText),[
  'https://tickers.playtech.example/new_jackpotxml.php',
  'https://webtickers.playtech.example/webtickers',
]);

const entries=[
  {request:{url:'https://launcher.betfair.es/initialResources/es_ES_desktop?t=1'},response:{content:{text:'{"jackpotsCasino":"bf_es"}'}}},
  {request:{url:'https://tickers.playtech.example/new_jackpotxml.php?casino=bf_es&game=sljp-1'},response:{content:{text:'<gamedata game="sljp-1" />'}}},
  {request:{url:'https://unknown.example/live'},response:{content:{text:'{"guaranteedHitTime":1787785300,"game":"sljp-1"}'}}},
  {request:{url:'https://example.com/ordinary'},response:{content:{text:'ordinary'}}},
  {request:{url:'wss://webtickers.playtech.example/live'},response:{content:{text:''}},_webSocketMessages:[{type:'receive',data:'{"game":"sljp-1","casino":"bf_es"}'}]},
];
const filtered=filterRelevantCaptureEntries(entries,{configuredEndpoints:['https://tickers.playtech.example/new_jackpotxml.php?configured=secret']});
assert.equal(filtered.length,4);
assert.equal(filtered.some(e=>e.request.url.includes('ordinary')),false);
assert.equal(filtered.some(e=>e.request.url.includes('initialResources')),true);
assert.equal(filtered.some(e=>e.request.url.includes('unknown.example')),true);
assert.equal(filtered.some(e=>e.request.url.startsWith('wss://')),true);

console.log('capture-betfair-sporting-cdp.test.mjs: PASS');
