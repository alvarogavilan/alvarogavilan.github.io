import fs from 'node:fs';
const OUT='loterias-ai/data/research/strategy-foundry-status.json';
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const defs=[
 ['numeric-single','loterias-ai/data/research/mass-numeric-strategy-search.json','research'],
 ['numeric-systems','loterias-ai/data/research/mass-system-strategy-search.json','research'],
 ['deterministic-formulas','loterias-ai/data/research/mass-formula-strategy-search.json','research'],
 ['diversified-portfolios','loterias-ai/data/research/mass-portfolio-strategy-search.json','research'],
 ['full-hit-hunter','loterias-ai/data/research/full-hit-hunter.json','research'],
 ['quiniela-systems','loterias-ai/data/research/quiniela-system-mass-search.json','research'],
 ['quiniela-system-financial','loterias-ai/data/backtests/quiniela-system-financial-audit.json','financial'],
 ['nacional-schema-financial','loterias-ai/data/backtests/loteria-nacional-schema-financial-tournament.json','financial'],
 ['nacional-replay','loterias-ai/data/backtests/loteria-nacional-first-prize-replay-audit.json','financial'],
 ['quinigol-mass-financial','loterias-ai/data/backtests/quinigol-mass-financial-search.json','financial'],
 ['lototurf-mass-financial','loterias-ai/data/backtests/lototurf-mass-financial-search.json','financial']
];
const families=[];let candidateTotal=0;for(const[id,p,kind]of defs){const j=read(p);if(!j){families.push({id,kind,status:'PENDING',path:p});continue}const tested=Number(j.candidatesActuallyTested??j.candidatesRequested??0)||0;candidateTotal+=tested;let signals=[];if(j.games)for(const[g,x]of Object.entries(j.games)){const signal=x.signal??x.researchPromotion??(x.realMoneyPass?'PASS':'NO_PROVEN_EDGE');signals.push({gameId:g,signal,realMoneyPass:x.realMoneyPass===true})}else if(j.gameId)signals.push({gameId:j.gameId,signal:j.status??j.researchPromotion??(j.realMoneyPass?'PASS':'NO_PROVEN_EDGE'),realMoneyPass:j.realMoneyPass===true});else if(j.summary)signals.push({gameId:'multi',signal:'CATALOGUE_ONLY',realMoneyPass:false});families.push({id,kind,status:'COMPLETE',path:p,generatedAt:j.generatedAt??null,candidatesActuallyTested:tested,signals})}
const directPasses=families.flatMap(f=>(f.signals||[]).filter(s=>s.realMoneyPass).map(s=>({family:f.id,gameId:s.gameId})));const quarantine=families.flatMap(f=>(f.signals||[]).filter(s=>String(s.signal).includes('SIGNAL')&&!s.realMoneyPass).map(s=>({family:f.id,gameId:s.gameId,signal:s.signal})));
const out={generatedAt:new Date().toISOString(),system:'Loterias AI Strategy Foundry',version:1,policy:{search:'Unlimited retrospective candidate generation is allowed.',promotion:'Retrospective exact hits never promote real money. Promotion requires frozen holdout, matched-cost baseline, official prize economics, positive ROI, statistical robustness and prospective shadow replication.',multipleTesting:'Candidate count is recorded so discoveries can be interpreted under multiple-testing risk.',defaultRealMoneyPass:false},summary:{registeredFamilies:families.length,completeFamilies:families.filter(x=>x.status==='COMPLETE').length,pendingFamilies:families.filter(x=>x.status==='PENDING').length,candidatesActuallyTested:candidateTotal,directRealMoneyPasses:directPasses.length,quarantinedResearchSignals:quarantine.length},directPasses,quarantine,families};fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary,null,2));