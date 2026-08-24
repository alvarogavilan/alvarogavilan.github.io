import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/jackpot-king-shared-pool-economics-v1.json','utf8'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.hardGuards.realMoneyAllowed,false);
assert.equal(e.hardGuards.crossSourceTriggerConflictFailsClosed,true);
assert.equal(e.hardGuards.sameTitleNameIsNotConfigurationProof,true);
assert.equal(e.crossTitleTriggerFingerprint.equalHazardPerEURProven,false);
const irish=e.verifiedOperatorPages.find(x=>x.game==='Irish Riches Megaways: Jackpot King');
assert.ok(irish);
assert.equal(irish.sourceConsistency,'OPERATOR_VS_MANUFACTURER_TRIGGER_CONFLICT');
assert.match(irish.operatorEntryTriggerSignature,/5 Jackpot King symbols/i);
const c=e.spainOperatorManufacturerConflicts.find(x=>x.game==='Irish Riches Megaways: Jackpot King');
assert.ok(c);
assert.equal(c.status,'UNRESOLVED_RULES_FINGERPRINT_CONFLICT');
assert.equal(c.operatorRequiredOverlaySymbols,5);
assert.equal(c.manufacturerRequiredOverlaySymbols,4);
assert.equal(c.executionImpact,'RULES_FINGERPRINT_NOT_VERIFIED');
assert.equal(c.realMoneyUse,'PROHIBITED');
assert.equal(e.currentBestBaseRtpScreen.notAPlaySignal,true);

console.log('edge-jpk-spain-trigger-conflict-v1.test.mjs: PASS');
