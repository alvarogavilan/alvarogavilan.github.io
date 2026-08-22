#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PROBES=[
  {
    source:'loterias-ai/casino/jackpots/winfall-shared-network-triangulation-v1.mjs',
    evidence:'loterias-ai/casino/jackpots/evidence/winfall-shared-network-triangulation-v1.json',
  },
  {
    source:'loterias-ai/casino/jackpots/winfall-passive-network-triangulation-v2.mjs',
    evidence:'loterias-ai/casino/jackpots/evidence/winfall-passive-network-triangulation-v2.json',
  },
  {
    source:'loterias-ai/casino/jackpots/winfall-provider-network-metadata-v1.mjs',
    evidence:'loterias-ai/casino/jackpots/evidence/winfall-provider-network-metadata-v1.json',
  },
];
const OUT='loterias-ai/casino/jackpots/evidence/winfall-shared-target-audit-v1.json';
export const EXPECTED_SHARED_TIKI_SLUG='tiki-templo';
export const WRONG_SHARED_TIKI_SLUG='la-isla-de-tiki';

const hasQuoted=(text,value)=>String(text).includes(`'${value}'`)||String(text).includes(`\"${value}\"`);

export function classifyTargetConfig(source=''){
  const text=String(source);
  const usesExpected=hasQuoted(text,EXPECTED_SHARED_TIKI_SLUG);
  const usesWrong=hasQuoted(text,WRONG_SHARED_TIKI_SLUG);
  const hypothesisNamesTikiTemplo=/La Isla de Tiki Templo/i.test(text)||/Tiki Templo/i.test(text);
  return {
    usesExpectedSharedTikiSlug:usesExpected,
    usesWrongSharedTikiSlug:usesWrong,
    hypothesisNamesTikiTemplo,
    targetMismatch:hypothesisNamesTikiTemplo&&usesWrong&&!usesExpected,
  };
}

export function classifyEvidenceTarget(evidence){
  const text=JSON.stringify(evidence??{});
  const usesExpected=text.includes(`\"${EXPECTED_SHARED_TIKI_SLUG}\"`);
  const usesWrong=text.includes(`\"${WRONG_SHARED_TIKI_SLUG}\"`);
  const resolvedSlug=evidence?.hypothesis?.resolvedBotemaniaSlug??evidence?.scope?.resolvedBotemaniaSlug??null;
  const correctlyTargeted=usesExpected&&!usesWrong&&resolvedSlug===EXPECTED_SHARED_TIKI_SLUG;
  return {
    usesExpectedSharedTikiSlug:usesExpected,
    usesWrongSharedTikiSlug:usesWrong,
    resolvedBotemaniaSlug:resolvedSlug,
    correctlyTargeted,
    staleWrongTargetEvidence:usesWrong||!correctlyTargeted,
  };
}

export function auditProbes(entries){
  const rows=entries.map(({sourceFile,source,evidenceFile,evidence})=>{
    const sourceConfig=classifyTargetConfig(source);
    const evidenceTarget=classifyEvidenceTarget(evidence);
    return {sourceFile,evidenceFile,sourceConfig,evidenceTarget};
  });
  const sourceMismatches=rows.filter(r=>r.sourceConfig.targetMismatch).map(r=>r.sourceFile);
  const invalidatedEvidence=rows.filter(r=>r.evidenceTarget.staleWrongTargetEvidence).map(r=>r.evidenceFile);
  const currentSourcesCorrect=sourceMismatches.length===0;
  const priorNegativeEvidenceValid=currentSourcesCorrect&&invalidatedEvidence.length===0;
  return {
    rows,
    sourceMismatches,
    invalidatedEvidence,
    currentSourcesCorrect,
    priorNegativeEvidenceValid,
    correctedRerunRequired:!priorNegativeEvidenceValid,
    exactLiveIdVerified:false,
    identityPromotionAllowed:false,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
  };
}

// Compatibility helper retained for existing deterministic callers.
export function auditSources(entries){
  const rows=entries.map(({file,source})=>({file,...classifyTargetConfig(source)}));
  const invalidated=rows.filter(r=>r.targetMismatch).map(r=>r.file);
  return {rows,invalidated,negativeClosureValid:invalidated.length===0,exactLiveIdVerified:false,identityPromotionAllowed:false,economicPromotionAllowed:false,realMoneyAllowed:false};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const entries=PROBES.map(p=>({
    sourceFile:p.source,
    source:fs.readFileSync(p.source,'utf8'),
    evidenceFile:p.evidence,
    evidence:fs.existsSync(p.evidence)?JSON.parse(fs.readFileSync(p.evidence,'utf8')):null,
  }));
  const audit=auditProbes(entries);
  const out={
    version:'winfall-shared-target-audit-v1.1-evidence-custody',
    generatedAt:new Date().toISOString(),
    operator:'botemania-es',
    target:'winfall-wishes-jackpot',
    expectedOfficialSharedTargets:['winfall-wishes-jackpot','wonderland',EXPECTED_SHARED_TIKI_SLUG],
    wrongTarget:WRONG_SHARED_TIKI_SLUG,
    audit,
    decision:{
      priorNegativeSharedNetworkClosureValid:audit.priorNegativeEvidenceValid,
      correctedProbeRequired:audit.correctedRerunRequired,
      exactLiveIdVerified:false,
      identityPromotionAllowed:false,
      economicPromotionAllowed:false,
      realMoneyAllowed:false,
      reason:audit.priorNegativeEvidenceValid?'ALL_CORRECTED_PROBES_HAVE_FRESH_CORRECT_TARGET_EVIDENCE':'OLD_WRONG_TARGET_EVIDENCE_REMAINS_INVALID_UNTIL_CORRECTED_RERUNS_PERSIST',
    },
    guards:{
      sourceCorrectionNeverRehabilitatesHistoricalEvidence:true,
      wrongTargetNeverCountsAsNegativeEvidence:true,
      invalidatedNegativeNeverPromotesOrKillsIdentity:true,
      correctedTargetMustBeProspectivelyFrozenBeforeRerun:true,
      correctedEvidenceMustNameResolvedSlug:true,
      noAmountEqualityIdentityInference:true,
      noBetting:true,
      realMoneyAllowed:false,
    },
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out,null,2));
}
