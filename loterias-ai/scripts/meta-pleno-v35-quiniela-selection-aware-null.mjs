import fs from 'node:fs';
const SRC='loterias-ai/data/shadow/quiniela-meta-pleno-ledger.json';
const OUT='loterias-ai/data/research/meta-pleno-v35-quiniela-selection-aware-null.json';
const ledger=JSON.parse(fs.readFileSync(SRC,'utf8'));
const f=ledger.frozen;if(!f?.spec)throw new Error('Missing frozen Quiniela champion');
const draws={discovery:f.evidence.discovery.draws,validation:f.evidence.validation.draws,holdout:f.evidence.holdout.draws};
const observed={discoveryFull14:f.evidence.discovery.full14,validationFull14:f.evidence.validation.full14,holdoutFull14:f.evidence.holdout.full14};
const columns=f.spec.columns;
const pPerDraw=columns/(3**14);
const atLeastOne=n=>1-Math.pow(1-pPerDraw,n);
const phaseNull={discovery:atLeastOne(draws.discovery),validation:atLeastOne(draws.validation),holdout:atLeastOne(draws.holdout)};
const oneOrMoreEachPhase=phaseNull.discovery*phaseNull.validation*phaseNull.holdout;
const candidatePool=f.candidatesTested;
const selectionAwareAtLeastOneCandidate=1-Math.pow(1-oneOrMoreEachPhase,candidatePool);
const bonferroniUpper=Math.min(1,oneOrMoreEachPhase*candidatePool);
// A deliberately simple Monte Carlo validates the exact Bernoulli calculation under the same equiprobable-sign null.
const RUNS=Math.max(100000,Number(process.env.RUNS||1000000));
let seed=0x35aa7711;function rnd(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}
let triplePhase=0;for(let r=0;r<RUNS;r++){let ok=true;for(const n of [draws.discovery,draws.validation,draws.holdout]){let hit=false;for(let i=0;i<n;i++){if(rnd()<pPerDraw){hit=true;break}}if(!hit){ok=false;break}}if(ok)triplePhase++}
const mcSingleCandidate=triplePhase/RUNS;
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v35-quiniela-selection-aware-null',purpose:'Quantify how surprising the frozen 216-column Quiniela champion pattern is under an equiprobable-sign matched-column null, explicitly accounting for the 500,000-candidate search. This is not a proof of predictive edge because candidate dependence, non-equiprobable real match probabilities, and adaptive research choices remain.',frozenSpec:f.spec,candidatePool,observed,draws,nullModel:{assumption:'Each of 14 signs equiprobable and the 216-column system has per-draw full14 probability columns/3^14. Phase events are treated independent for the analytic single-candidate calculation.',perDrawFull14Probability:pPerDraw,phaseAtLeastOneFull14:phaseNull,singleCandidateAtLeastOneFull14InEachOfThreePhases:oneOrMoreEachPhase,selectionAwareAtLeastOneOfCandidatePoolShowsTriplePhasePattern:selectionAwareAtLeastOneCandidate,bonferroniUpperBound:bonferroniUpper},monteCarlo:{runs:RUNS,singleCandidateTriplePhaseCount:triplePhase,singleCandidateTriplePhaseRate:mcSingleCandidate},limitations:['500,000 searched systems are not statistically independent.','Actual football 1/X/2 probabilities are not equiprobable.','The champion was selected using discovery and validation, while holdout was subsequently opened.','Multiple research families beyond this single search increase global selection bias.','Prospective results after 2026-08-16 remain the decisive evidence.'],classification:selectionAwareAtLeastOneCandidate<0.01?'EXTREME_RESEARCH_ANOMALY_REQUIRES_PROSPECTIVE_REPLICATION':selectionAwareAtLeastOneCandidate<0.05?'NOTABLE_RESEARCH_ANOMALY_REQUIRES_PROSPECTIVE_REPLICATION':'CONSISTENT_WITH_MASS_SEARCH_NULL',realMoneyPass:false};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));