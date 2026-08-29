import assert from 'node:assert/strict';
import {laneStakeKnown,buildLaneCard} from '../edge-live/edge-radar-lanes-v1.mjs';

const staleUltimate={
  id:'botemania-ultimate-video-poker-jacks-progressive',
  type:'PROGRESSIVE_VIDEO_POKER',
  game:{name:'Ultimate Video Poker — Jotas o Mejor Progresivo'},
  evidence:{
    identityVerified:true,
    exactStakeKnown:true,
    jackpotQualifyingStakeVerified:false,
    thresholdKnown:false,
    strategyVerified:false,
  },
  current:{jackpotEUR:3457.70},
  economic:{breakEvenJackpotEUR:null},
  order:{action:'DO_NOT_PLAY',stakePerSpinEUR:0},
  executionReady:false,prepareOnly:false,blockers:['BREAK_EVEN_THRESHOLD_EUR_NOT_VERIFIED']
};

assert.equal(laneStakeKnown(staleUltimate),false);
assert.equal(buildLaneCard(staleUltimate).stakeKnown,false);

const missingQualification={...staleUltimate,evidence:{...staleUltimate.evidence,jackpotQualifyingStakeVerified:undefined}};
assert.equal(laneStakeKnown(missingQualification),false);

const exactQualified={...staleUltimate,evidence:{...staleUltimate.evidence,jackpotQualifyingStakeVerified:true}};
assert.equal(laneStakeKnown(exactQualified),true);

const nonVpExact={type:'MUST_BE_WON_BY_PROGRESSIVE_NETWORK',evidence:{exactStakeKnown:true}};
assert.equal(laneStakeKnown(nonVpExact),true);
const nonVpExplicitlyUnqualified={type:'MUST_BE_WON_BY_PROGRESSIVE_NETWORK',evidence:{exactStakeKnown:true,jackpotQualifyingStakeVerified:false}};
assert.equal(laneStakeKnown(nonVpExplicitlyUnqualified),false);

console.log('edge-radar-progressive-vp-stake-gate-v1.test.mjs: PASS');
