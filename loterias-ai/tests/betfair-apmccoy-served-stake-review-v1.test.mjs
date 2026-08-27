import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyServedStake,isApprovedBetfairApMcCoyServedStakeReviewArtifact} from '../edge-backend/src/betfair-apmccoy-served-stake-review-v1.mjs';

const GAME='ap-mccoy-sporting-legends-cptn';
const launcher={request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${GAME}&launchProduct=casino&mode=real&token=LAUNCH_SECRET`,headers:[]},response:{status:200,content:{text:''}}};
const response=body=>({request:{method:'GET',url:'https://game.example/config?session=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify(body)}}});
const har=body=>({log:{entries:[launcher,response(body)]}});
const fake='a'.repeat(40);

let r=reviewBetfairApMcCoyServedStake(har({availableTotalBets:[0.10,0.20,0.50],coinValues:[0.01,0.02]}),{sourceName:'ap.har',reviewCommit:fake,requiredStakeEUR:0.10});
assert.equal(r.valid,false);
assert.equal(r.contractRevision,'v1.1-code-owned-artifact-identity');
assert.equal(r.reason,'STAKE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.deepEqual(r.servedTotalStakeValuesEUR,[0.1,0.2,0.5]);
assert.equal(r.stakeAtDecisionExactVerified,false);
assert.equal(r.servedStakeMenuSemanticsVerified,false);
assert.equal(r.reviewApproved,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(isApprovedBetfairApMcCoyServedStakeReviewArtifact({...r,reviewCommit:fake}),false);
assert.equal(JSON.stringify(r).includes('LAUNCH_SECRET'),false);
assert.equal(JSON.stringify(r).includes('QUERY_SECRET'),false);

r=reviewBetfairApMcCoyServedStake(har({availableTotalBets:[0.20,0.50]}),{reviewCommit:fake,requiredStakeEUR:0.10});
assert.equal(r.valid,false);assert.equal(r.reason,'REQUIRED_STAKE_NOT_IN_SERVED_TOTAL_STAKE_MENU');

r=reviewBetfairApMcCoyServedStake(har({coinValues:[0.01,0.02],betValues:[0.10,0.20]}),{reviewCommit:fake,requiredStakeEUR:0.10});
assert.equal(r.valid,false);assert.equal(r.reason,'EXPLICIT_TOTAL_STAKE_MENU_CANDIDATE_REQUIRED');

r=reviewBetfairApMcCoyServedStake(har({availableTotalBets:[0.10,0.20]}),{reviewCommit:'bad',requiredStakeEUR:0.10});
assert.equal(r.valid,false);assert.equal(r.reason,'VALID_STAKE_REVIEW_COMMIT_SHA_REQUIRED');

console.log('betfair-apmccoy-served-stake-review-v1.test.mjs: PASS');
