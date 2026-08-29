import assert from 'node:assert/strict';
import {megaFireBaseWager,megaFireNormalization,lightningAssessment} from '../edge-backend/src/roulette-multiplier-normalization-lab-v1.mjs';
for(const type of ['straight','split','street','corner','line'])assert.equal(megaFireBaseWager(type).baseReturnPct,81.08108108);
const m=megaFireNormalization();assert.equal(m.allInsideBaseReturnsEqual,true);assert.equal(m.impliedAverageBonusReturnPct,16.21891892);assert.equal(m.execution.realMoneyAllowed,false);
const l=lightningAssessment();assert.equal(l.luckyNumbersGeneratedAfterBettingTimeExpired,true);assert.equal(l.reactiveLuckyNumberStrategyPossible,false);assert.equal(l.nonLuckyStraightBaseReturnPct,81.08108108);assert.equal(l.execution.decision,'NO_PLAY');
console.log('roulette-multiplier-normalization-lab-v1.test.mjs: PASS');
