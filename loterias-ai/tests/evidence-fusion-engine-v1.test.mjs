import assert from 'node:assert/strict';
import {fuseClaim,fuseResearchBundle,sourceWeight} from '../edge-backend/src/evidence-fusion-engine-v1.mjs';
const target={jurisdiction:'ES',operator:'Betfair Spain',title:'Kingdoms Rise Sands of Fury'};
let obs=[
 {claimId:'powerAmountBoundary',value:true,sourceClass:'CURRENT_OPERATOR_EXACT_TITLE',jurisdiction:'ES',operator:'Betfair Spain',title:'Kingdoms Rise Sands of Fury',exactTargetBinding:true},
 {claimId:'powerAmountBoundary',value:true,sourceClass:'PROVIDER_FAMILY_MATERIAL',jurisdiction:'UK',operator:'Other',title:'Kingdoms Rise Reign of Ice',exactTargetBinding:false}
];
let r=fuseClaim('powerAmountBoundary',obs,target);
assert.equal(r.status,'EXACT_VERIFIED_RESEARCH');
assert.equal(r.value,true);
assert.equal(r.execution.realMoneyAllowed,false);

obs=[
 {claimId:'bubblePersistence',value:true,sourceClass:'CURRENT_OPERATOR_EXACT_TITLE',jurisdiction:'DK',operator:'Danske Spil',title:'Ocean Magic',exactTargetBinding:false},
 {claimId:'bubblePersistence',value:false,sourceClass:'SPECIALIST_AP_GUIDE',jurisdiction:'UK',operator:'Grosvenor',title:'Ocean Magic',exactTargetBinding:false}
];
r=fuseClaim('bubblePersistence',obs,{jurisdiction:'ES',operator:'EnRacha',title:'Ocean Magic'});
assert.equal(r.status,'CROSS_DEPLOYMENT_CONFLICT_DISCOVERY_ONLY');

obs=[
 {claimId:'guaranteedBubbleCount',value:7,sourceClass:'CREATOR_VIDEO',jurisdiction:'US',operator:'Unknown',title:'Ocean Magic',exactTargetBinding:false}
];
r=fuseClaim('guaranteedBubbleCount',obs,{jurisdiction:'ES',operator:'EnRacha',title:'Ocean Magic'});
assert.equal(r.status,'DISCOVERY_ONLY');

const bundle=fuseResearchBundle({target,observations:[
 {claimId:'powerAmountBoundary',value:true,sourceClass:'CURRENT_OPERATOR_EXACT_TITLE',jurisdiction:'ES',operator:'Betfair Spain',title:'Kingdoms Rise Sands of Fury',exactTargetBinding:true},
 {claimId:'dailyFollowingPeriod',value:true,sourceClass:'OPERATOR_OTHER_JURISDICTION_EXACT_TITLE',jurisdiction:'UK',operator:'Betfred',title:'Frank Bruno Sporting Legends',exactTargetBinding:false},
 {claimId:'dailyFollowingPeriod',value:true,sourceClass:'CREATOR_VIDEO',jurisdiction:'UK',operator:'Unknown',title:'Frank Bruno Sporting Legends',exactTargetBinding:false}
]});
assert.deepEqual(bundle.exactVerifiedClaims,['powerAmountBoundary']);
assert.ok(bundle.discoveryOnlyClaims.includes('dailyFollowingPeriod'));
assert.equal(sourceWeight('REGULATOR'),100);
assert.equal(bundle.execution.decision,'NO_PLAY');
console.log('evidence-fusion-engine-v1.test.mjs: PASS');
