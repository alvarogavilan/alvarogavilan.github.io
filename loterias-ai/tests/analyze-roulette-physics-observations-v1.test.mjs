import assert from 'node:assert/strict';
import {analyzePhysicsObservations} from '../edge-backend/src/analyze-roulette-physics-observations-v1.mjs';
const good=[];for(let i=0;i<20;i++)good.push({ballReleaseMs:1000,betCloseMs:3100+i*5,firstDeflectorMs:2600+i*3,streamLatencyMs:100,actionLatencyMs:150,minimumObservationMs:700});
let r=analyzePhysicsObservations(good,{minRounds:10});assert.equal(r.ok,true);assert.equal(r.practiceVerdict,'STABLE_POST_RELEASE_WINDOW_RESEARCH_CANDIDATE');assert.equal(r.execution.realMoneyAllowed,false);assert.equal(r.metrics.candidateRate,1);
const bad=[];for(let i=0;i<20;i++)bad.push({ballReleaseMs:1000,betCloseMs:1500,firstDeflectorMs:1800,streamLatencyMs:200,actionLatencyMs:200,minimumObservationMs:700});r=analyzePhysicsObservations(bad,{minRounds:10});assert.equal(r.practiceVerdict,'NO_STABLE_USABLE_POST_RELEASE_WINDOW');
r=analyzePhysicsObservations(good.slice(0,2),{minRounds:10});assert.equal(r.reason,'INSUFFICIENT_VALID_ROUNDS');
console.log('analyze-roulette-physics-observations-v1.test.mjs: PASS');
