import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function load(path){
  const code=fs.readFileSync(path,'utf8');
  const context={globalThis:{},console,Date,Math,JSON,Number,String,Array,Set,Object,Error};
  context.window=undefined;
  vm.createContext(context);
  vm.runInContext(code,context,{filename:path});
  return context.globalThis;
}

const adapter=load('loterias-ai/js/selae-adapter.js').SELAEAdapter;
const backfill=load('loterias-ai/js/backfill-orchestrator.js').LotteryBackfill;
const treasury=load('loterias-ai/js/treasury-engine.js').LotteryTreasury;
const archive=load('loterias-ai/js/archive-integrity.js').LotteryArchiveIntegrity;

assert.equal(adapter.toDateISO('20/07/2026'),'2026-07-20');
assert.equal(adapter.validateNumericDraw({gameId:'bonoloto',drawDate:'2026-07-20',main:[5,22,28,33,39,46]}).ok,true);
assert.equal(adapter.validateNumericDraw({gameId:'bonoloto',drawDate:'2026-07-20',main:[5,5,28,33,39,46]}).ok,false);
assert.equal(adapter.validateNumericDraw({gameId:'euromillones',drawDate:'2026-07-17',main:[12,21,23,34,40],secondary:[9,10]}).ok,true);

const batches=backfill.plan('bonoloto',2024,2026);
assert.equal(batches.length,3);
assert.equal(batches[0].year,2026);
assert.equal(backfill.next(batches).status,'PENDING');

let state=treasury.initialState(50);
state=treasury.apply(state,{type:'STAKE_CONFIRMED',amount:5,gameId:'bonoloto'});
assert.equal(state.bankroll,45);
state=treasury.apply(state,{type:'RETURN_VERIFIED',amount:8,gameId:'bonoloto'});
const ts=treasury.summary(state);
assert.equal(ts.bankroll,53);
assert.equal(ts.realizedPnL,3);
assert.equal(ts.roiPct,60);

const integrity=archive.analyze([{drawId:'bonoloto-2026-07-20',drawDate:'2026-07-20',source:{official:true},verification:{status:'VALIDATED'}}]);
assert.equal(integrity.integrityPass,true);
assert.equal(integrity.validated,1);

console.log('Loterías AI core tests: PASS');