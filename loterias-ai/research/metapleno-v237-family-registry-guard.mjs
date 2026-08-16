#!/usr/bin/env node
/** v237 — Research Family Registry Guard.
 * Builds a conservative family index from all fetched research branches.
 * Purpose: prevent cosmetic/duplicate lanes from being counted as new science.
 */
import {execSync} from 'node:child_process';
import fs from 'node:fs';
const raw=execSync("git for-each-ref --format='%(refname:short)' refs/remotes/origin/research",{encoding:'utf8'});
const branches=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const rules=[
 ['gaussian_process',/\bgp\b|gaussian|sparse-gp|compact-gp|kernel-gp/i],
 ['recurrence',/recurrence|repeat|near-repeat/i],
 ['graph_hypergraph',/graph|hypergraph|johnson|topolog/i],
 ['bayesian_nonparametric',/dp-mixture|dp-means|dirichlet|crp/i],
 ['change_point',/bocpd|changepoint|change-point/i],
 ['survival_hazard',/survival|hazard/i],
 ['symbolic_sat',/symbolic|grammar|sat-|smt/i],
 ['spectral_multiscale',/spectral|haar|ssa|hankel/i],
 ['ensemble_consensus',/stacker|consensus|expert|hybrid|anti-consensus/i],
 ['completion_cooccurrence',/completion|cooccurrence|motif/i],
 ['positional_dependence',/positional|copula/i],
 ['combinadic_rank',/combinadic|rank-dynamics/i],
 ['budget_coverage',/budget|pool9|coverage|compression|ticket-ranker/i],
 ['conformal',/conformal/i]
];
const families={};
for(const [name,re] of rules) families[name]=branches.filter(b=>re.test(b));
const duplicates=Object.entries(families).filter(([,v])=>v.length>1).map(([family,v])=>({family,count:v.length,branches:v}));
const out={version:'v237',generatedAt:new Date().toISOString(),purpose:'duplicate-family guard; not a predictive signal',researchBranches:branches.length,families:Object.fromEntries(Object.entries(families).map(([k,v])=>[k,{count:v.length,branches:v}])),duplicateFamilies:duplicates,policy:{newLaneMustCheckRegistry:true,cosmeticVariantDoesNotCountAsNewFamily:true,negativeFamiliesRequireMethodologicalChange:true,realMoneyPass:false,realStakeEUR:0}};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});
fs.writeFileSync('loterias-ai/data/research/metapleno-v237-family-registry-guard.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({researchBranches:out.researchBranches,duplicateFamilies:duplicates.map(x=>({family:x.family,count:x.count})),realMoneyPass:false},null,2));