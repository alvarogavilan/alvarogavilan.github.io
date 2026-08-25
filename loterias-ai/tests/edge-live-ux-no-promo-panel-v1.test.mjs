import assert from 'node:assert/strict';
import fs from 'node:fs';

// EDGE must never surface promotional/loyalty-stacking analysis on its live
// dashboard. edge-jokerbet-stack-client-v1.mjs's entire premise is asking
// whether a game's base RTP plus JOKERBET's Club/cashback promotional
// program (bono-cashback-semanal) could combine past 100% - a
// promotion-stacking question, not a game-mathematics one - so
// edge-live-ux-v1.mjs (the loader that wires every panel into the live
// dashboard) must never import it, regardless of whether the panel's own
// rows currently all gate on positiveEvProven:false.
const source = fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs', 'utf8');
assert.doesNotMatch(source, /^\s*import\s+['"]\.\/edge-jokerbet-stack-client-v1\.mjs['"]/m);

console.log('edge-live-ux-no-promo-panel-v1.test.mjs: PASS');
