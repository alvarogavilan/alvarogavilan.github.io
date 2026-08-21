import assert from 'node:assert/strict';
import { selectJpkLiveSource, modelMatchesJpkState } from '../casino/jackpots/jpk-live-source-core-v1.mjs';

const now=Date.parse('2026-08-21T12:30:00.000Z');
const freshNetwork={
  observedAt:'2026-08-21T12:29:50.000Z',
  currentByKey:{
    'blueprint:JACKPOTKING':{amountEUR:128431.96},
    'blueprint:JACKPOTKING_REGAL':{amountEUR:15579.45},
    'blueprint:JACKPOTKING_ROYAL':{amountEUR:1748.02}
  }
};
const staleObserver={latest:{observedAt:'2026-08-20T06:48:55.020Z',sourceReadable:true,graphql:{httpStatus:200},labeledPots:{JACKPOT_KING:128086.24,REGAL:15501.89,ROYAL:1689.19}}};
const selected=selectJpkLiveSource({allNetwork:freshNetwork,observer:staleObserver,nowMs:now});
assert.equal(selected.sourceClass,'ALL_NETWORK_BLUEPRINT_EXACT_IDS');
assert.equal(selected.sourceFresh,true);
assert.equal(selected.ageSeconds,10);
assert.deepEqual(selected.potsEUR,{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.02});

const staleNetwork={...freshNetwork,observedAt:'2026-08-21T12:20:00.000Z'};
const staleSelected=selectJpkLiveSource({allNetwork:staleNetwork,observer:staleObserver,nowMs:now});
assert.equal(staleSelected.sourceClass,'ALL_NETWORK_BLUEPRINT_EXACT_IDS');
assert.equal(staleSelected.sourceFresh,false);
assert.equal(staleSelected.ageSeconds,600);

const incompleteNetwork={observedAt:'2026-08-21T12:29:55.000Z',currentByKey:{'blueprint:JACKPOTKING':{amountEUR:1}}};
const freshObserver={latest:{observedAt:'2026-08-21T12:29:40.000Z',sourceReadable:true,graphql:{httpStatus:200},labeledPots:{JACKPOT_KING:10,REGAL:20,ROYAL:30}}};
const fallback=selectJpkLiveSource({allNetwork:incompleteNetwork,observer:freshObserver,nowMs:now});
assert.equal(fallback.sourceClass,'LEGACY_JPK_OBSERVER');
assert.equal(fallback.sourceFresh,true);

assert.equal(modelMatchesJpkState({current:{observedAt:'2026-08-21T12:29:50.000Z',potsEUR:{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.02}}},{observedAt:'2026-08-21T12:29:50.000Z',potsEUR:{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.02}}),true);
assert.equal(modelMatchesJpkState({current:{observedAt:'2026-08-20T06:48:55.020Z',potsEUR:{JACKPOT_KING:128086.24,REGAL:15501.89,ROYAL:1689.19}}},{observedAt:'2026-08-21T12:29:50.000Z',potsEUR:{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.02}}),false);
assert.equal(modelMatchesJpkState({current:{observedAt:'2026-08-21T12:29:50.000Z',potsEUR:{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.02}}},{observedAt:'2026-08-21T12:29:50.000Z',potsEUR:{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.10}}),false);

console.log('jpk-live-source-core-v1.test.mjs: PASS');
