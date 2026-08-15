import fs from 'node:fs';

const ROOT='loterias-ai/data/research';
const GAMES=['bonoloto','primitiva','euromillones','eurodreams','gordo-primitiva'];
const COST={bonoloto:0.5,primitiva:1,euromillones:2.5,eurodreams:2.5,'gordo-primitiva':1.5};
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const finite=x=>Number.isFinite(Number(x))?Number(x):null;

const v14=read(`${ROOT}/meta-pleno-v14-adaptive-ranker-precomputed.json`);
const novelty=read(`${ROOT}/novelty-pair-triple-search.json`);
const v20=read(`${ROOT}/meta-pleno-v20-bonoloto-structural-portfolio.json`);
const gordoAudit=read(`${ROOT}/gordo-v14-complete-ticket-audit.json`);
const gordoMC=read(`${ROOT}/gordo-v14-matched-cost-baseline.json`);

function addEvidence(arr,label,obj){if(obj)arr.push({label,...obj});}
function gameRow(game){
  const ev=[];
  const g14=v14?.games?.[game];
  if(g14){
    const h=g14.bestHoldout||g14.bestResearch||g14.holdout||null;
    addEvidence(ev,'v14',{
      full:finite(h?.full),near:finite(h?.near),high:finite(h?.high),meanHits:finite(h?.meanHits),
      source:'meta-pleno-v14-adaptive-ranker-precomputed.json'
    });
  }
  const nov=novelty?.games?.[game];
  if(nov) addEvidence(ev,'pairTripleNovelty',{
    full:finite(nov.champion?.holdout?.exactMain),near:finite(nov.champion?.holdout?.nearFull),meanHits:finite(nov.champion?.holdout?.meanHits),
    randomMeanHits:finite(nov.matchedRandomBaseline?.averageMeanHits),source:'novelty-pair-triple-search.json'
  });
  if(game==='bonoloto'&&v20?.selected?.research2023_2026){const h=v20.selected.research2023_2026;addEvidence(ev,'v20Structural',{full:finite(h.six),near:finite(h.high),roi:finite(h.roi),source:'meta-pleno-v20-bonoloto-structural-portfolio.json'});}

  let score=0, rationale=[];
  for(const e of ev){
    if((e.full||0)>0){score+=20*e.full;rationale.push(`${e.label}: full=${e.full}`)}
    if((e.near||0)>0){score+=4*e.near;rationale.push(`${e.label}: near/high=${e.near}`)}
    if(e.meanHits!=null&&e.randomMeanHits!=null){const d=e.meanHits-e.randomMeanHits;score+=Math.max(-2,Math.min(2,d*20));}
    if(e.roi!=null)score+=Math.max(-5,Math.min(5,e.roi*5));
  }
  if(game==='gordo-primitiva'){
    const roi=finite(gordoAudit?.holdout?.roiNet);
    const high=Array.isArray(gordoAudit?.holdout?.highEvents)?gordoAudit.holdout.highEvents.length:0;
    const p=finite(gordoMC?.random?.pROI);
    const pHigh=finite(gordoMC?.random?.pHigh);
    addEvidence(ev,'gordoV14Audited',{
      roiNet:roi,highEvents:high,pROI:p,pHigh,
      source:'gordo-v14-complete-ticket-audit.json + gordo-v14-matched-cost-baseline.json'
    });
    if(roi!=null){score+=Math.max(-5,Math.min(8,roi*20));rationale.push(`audited v14 ROI=${roi}`)}
    if(high>0){score+=3*Math.min(2,high);rationale.push(`audited v14 highEvents=${high}`)}
    if(p!=null&&p>0&&p<0.05){score+=Math.min(8,-Math.log10(p)*2);rationale.push(`matched-cost pROI=${p}`)}
    if(pHigh!=null&&pHigh>0&&pHigh<0.05){score+=Math.min(4,-Math.log10(pHigh));rationale.push(`matched-cost pHigh=${pHigh}`)}
  }
  score+=Math.max(0,2-Math.log2(1+COST[game]));
  return {game,unitCostEUR:COST[game],researchScore:Number(score.toFixed(4)),evidence:ev,rationale};
}

const rows=GAMES.map(gameRow).sort((a,b)=>b.researchScore-a.researchScore||a.unitCostEUR-b.unitCostEUR);
const out={
  generatedAt:new Date().toISOString(),
  engine:'MetaPleno-v23-multigame-opportunity-selector',
  purpose:'Research prioritization across games. This file cannot authorize real-money betting.',
  safeguards:{realMoneyPass:false,prospectiveSealRequired:true,noHistoricalScoreCanOverrideCentralGate:true,noPlayAllowed:true},
  ranking:rows,
  researchPriority:rows[0]?.game||null,
  decision:'RESEARCH_ONLY',
  note:'Scores compare heterogeneous research evidence and cost only to allocate compute. They are not probabilities of winning and must never be shown as such.'
};
fs.mkdirSync(ROOT,{recursive:true});
fs.writeFileSync(`${ROOT}/meta-pleno-v23-multigame-opportunity-selector.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
