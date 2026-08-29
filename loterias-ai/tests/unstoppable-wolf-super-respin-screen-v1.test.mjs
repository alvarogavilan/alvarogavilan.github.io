import assert from 'node:assert/strict';
import {screenUnstoppableWolfSuperRespin,compareUnstoppableWolfOperators} from '../edge-backend/src/unstoppable-wolf-super-respin-screen-v1.mjs';

let r=screenUnstoppableWolfSuperRespin({operatorId:'INTERWETTEN_ES',indicatorsFilled:4});
assert.equal(r.ok,true);
assert.equal(r.practiceVerdict,'ONE_EVENT_FROM_SHARED_STATE_TERMINAL_TRIGGER');
assert.equal(r.metrics.stakeLeverageRatio,200);
assert.equal(r.metrics.indicatorsNeeded,1);
assert.equal(r.operatorConfig.rtpPct,96.50);
assert.equal(r.execution.realMoneyAllowed,false);

r=screenUnstoppableWolfSuperRespin({operatorId:'JOKERBET_ES',indicatorsFilled:4});
assert.equal(r.metrics.stakeLeverageRatio,40);
assert.equal(r.operatorConfig.rtpPct,94.10);

r=screenUnstoppableWolfSuperRespin({operatorId:'INTERWETTEN_ES',indicatorsFilled:4,probabilityRemainingReelFullWolfStackNextSpin:.10,superRespinPayoutFloorX:12});
assert.equal(r.practiceVerdict,'POSITIVE_TERMINAL_ONE_SPIN_FLOOR_REQUIRES_PROSPECTIVE_VALIDATION');
assert.equal(r.execution.realMoneyAllowed,false);

const c=compareUnstoppableWolfOperators();
assert.equal(c[0].operatorId,'INTERWETTEN_ES');
assert.equal(c[0].stakeRatio,200);
console.log('unstoppable-wolf-super-respin-screen-v1.test.mjs: PASS');
