import assert from 'node:assert/strict';
import {analyzeBetfairApMcCoyCurrentSessionHar} from '../scripts/analyze-betfair-apmccoy-current-session.mjs';

const entry=(startedDateTime,url,text,mimeType='text/plain')=>({
  startedDateTime,
  request:{method:'GET',url,headers:[]},
  response:{status:200,headers:[],content:{mimeType,text}},
});
const har={log:{entries:[
  entry('2026-08-29T10:29:58.000Z','https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn','launcher'),
  entry('2026-08-29T10:29:59.000Z','https://casino.betfair.es/initialResources/es_ES_desktop','{"jackpotsCasino":"bfes","jackpotsCasinoUrl":"https://ticker.example/new_jackpotxml.php"}','application/json'),
  entry('2026-08-29T10:30:00.000Z','https://ticker.example/new_jackpotxml.php?info=1&casino=bfes&game=sljp-1&currency=EUR&local=0','<response><request casino="bfes" startTimestamp="1787999400" execInterval="5"/><gamedata game="sljp-1" local="0" timestamp="1787999400" winc="7"><amount currency="EUR" guaranteedHitTime="1787999460" wins="1000">123.45</amount></gamedata></response>','application/xml'),
  entry('2026-08-29T10:30:01.000Z','https://ticker.example/new_jackpotxml.php?info=1&casino=bfes&game=sljp-2&currency=EUR&local=0','<response><request casino="bfes" startTimestamp="1787999401" execInterval="5"/><gamedata game="sljp-2" local="0" timestamp="1787999401" winc="3"><amount currency="EUR" guaranteedHitTime="1788003000" wins="9000">1138.50</amount></gamedata></response>','application/xml')
]}};

const out=analyzeBetfairApMcCoyCurrentSessionHar(har,{sourceName:'apmccoy-both.har'});
assert.equal(out.execution.decision,'NO_PLAY');
assert.equal(out.execution.realMoneyAllowed,false);
assert.equal(out.servedSnapshot.valid,true);
assert.equal(out.servedSnapshot.code,'sljp-1');
assert.equal(out.servedSnapshot.amount,123.45);
assert.equal(out.closed.freshGlobalEurDailySljp1State,true);
assert.equal(out.servedWeeklySnapshot.valid,true);
assert.equal(out.servedWeeklySnapshot.code,'sljp-2');
assert.equal(out.servedWeeklySnapshot.tier,'WEEKLY');
assert.equal(out.servedWeeklySnapshot.amount,1138.50);
assert.equal(out.servedWeeklySnapshot.guaranteedHitTime,1788003000);
assert.equal(out.closed.freshGlobalEurWeeklySljp2ResearchState,true);
assert.equal(out.closed.exactCurrentWeeklyAmountFromServerResearchOnly,true);
assert.equal(out.closed.exactCurrentWeeklyGuaranteedHitTimeFromServerResearchOnly,true);
assert.equal(out.prospectiveFreeze.dailyOnly,true);
assert.equal(out.prospectiveFreeze.weeklyDoesNotInheritDailyFreeze,true);
assert.equal(out.stillMandatory.weeklyIndependentProspectiveProtocolApproved,false);
assert.equal(out.hardGuards.weeklySnapshotCannotAuthorizeExecution,true);
assert.equal(out.hardGuards.dailyProspectiveEvidenceCannotTransferToWeekly,true);

console.log('analyze-betfair-apmccoy-current-session-daily-weekly-v1.test.mjs: PASS');
