#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const FILES=[
  'loterias-ai/casino/jackpots/winfall-shared-network-triangulation-v1.mjs',
  'loterias-ai/casino/jackpots/winfall-passive-network-triangulation-v2.mjs',
  'loterias-ai/casino/jackpots/winfall-provider-network-metadata-v1.mjs',
];
const OUT='loterias-ai/casino/jackpots/evidence/winfall-shared-target-audit-v1.json';
export const EXPECTED_SHARED_TIKI_SLUG='tiki-templo';
export const WRONG_SHARED_TIKI_SLUG='la-isla-de-tiki';

export function classifyTargetConfig(source=''){
  const text=String(source);
  const usesExpected=text.includes(`'${EXPECTED_SHARED_TIKI_SLUG}'`)||text.includes(`\"${EXPECTED_SHARED_TIKI_SLUG}\"`);
  const usesWrong=text.includes(`'${WRONG_SHARED_TIKI_SLUG}'`)||text.includes(`\"${WRONG_SHARED_TIKI_SLUG}\"`);
  const hypothesisNamesTikiTemplo=/La Isla de Tiki Templo/i.test(text);
  return {
    usesExpectedSharedTikiSlug:usesExpected,
    usesWrongSharedTikiSlug:usesWrong,
    hypothesisNamesTikiTemplo,
    targetMismatch:hypothesisNamesTikiTemplo&&usesWrong&&!usesExpected,
  };
}

export function auditSources(entries){
  const rows=entries.map(({file,source})=>({file,...classifyTargetConfig(source)}));
  const invalidated=rows.filter(r=>r.targetMismatch).map(r=>r.file);
  return {
    rows,
    invalidated,
    negativeClosureValid:invalidated.length===0,
    exactLiveIdVerified:false,
    identityPromotionAllowed:false,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const entries=FILES.map(file=>({file,source:fs.readFileSync(file,'utf8')}));
  const audit=auditSources(entries);
  const out={
    version:'winfall-shared-target-audit-v1',
    generatedAt:new Date().toISOString(),
    operator:'botemania-es',
    target:'winfall-wishes-jackpot',
    expectedOfficialSharedTargets:['winfall-wishes-jackpot','wonderland',EXPECTED_SHARED_TIKI_SLUG],
    wrongTarget:WRONG_SHARED_TIKI_SLUG,
    audit,
    decision:{
      priorNegativeSharedNetworkClosureValid:audit.negativeClosureValid,
      correctedProbeRequired:audit.invalidated.length>0,
      exactLiveIdVerified:false,
      identityPromotionAllowed:false,
      economicPromotionAllowed:false,
      realMoneyAllowed:false,
      reason:audit.invalidated.length>0?'PRIOR_PROBES_USED_DIFFERENT_TIKI_GAME_THAN_THE_OPERATOR_NAMED_SHARED_PARTNER':'NO_TARGET_MISMATCH_DETECTED',
    },
    guards:{
      wrongTargetNeverCountsAsNegativeEvidence:true,
      invalidatedNegativeNeverPromotesOrKillsIdentity:true,
      correctedTargetMustBeProspectivelyFrozenBeforeRerun:true,
      noAmountEqualityIdentityInference:true,
      noBetting:true,
      realMoneyAllowed:false,
    },
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out,null,2));
}
