import fs from 'node:fs';
const GAME=process.env.GAME||'bonoloto';
const MAX_BUDGET=Number(process.env.MAX_BUDGET_EUR||15);
const OUT=process.env.OUT||`loterias-ai/data/research/meta-pleno-v63-${GAME}-coverage-lab.json`;
const cfg={
  bonoloto:{mainK:6,starK:0,unitCost:.5,maxMain:49,maxStars:0},
  primitiva:{mainK:6,starK:0,unitCost:1,maxMain:49,maxStars:0},
  euromillones:{mainK:5,starK:2,unitCost:2.5,maxMain:50,maxStars:12}
}[GAME];
if(!cfg)throw new Error(`unsupported GAME ${GAME}`);
const parse=(s,d)=>s? [...new Set(s.split(',').map(Number).filter(Number.isFinite))]:d;
const mainPool=parse(process.env.MAIN_POOL, GAME==='euromillones'?[1,8,14,21,28,35,42,49]:[2,4,6,8,14,26,34,42]);
const starPool=cfg.starK?parse(process.env.STAR_POOL,[1,4,7,10]):[];
if(mainPool.length<cfg.mainK)throw new Error('MAIN_POOL too small');
if(mainPool.some(x=>x<1||x>cfg.maxMain))throw new Error('MAIN_POOL out of range');
if(cfg.starK&&(starPool.length<cfg.starK||starPool.some(x=>x<1||x>cfg.maxStars)))throw new Error('STAR_POOL invalid');
const comb=(a,k)=>{const out=[];function rec(i,b){if(b.length===k){out.push([...b]);return}for(let j=i;j<=a.length-(k-b.length);j++){b.push(a[j]);rec(j+1,b);b.pop()}}rec(0,[]);return out};
const mainTickets=comb(mainPool,cfg.mainK), starTickets=cfg.starK?comb(starPool,cfg.starK):[[]];
const candidates=[];for(const m of mainTickets)for(const s of starTickets)candidates.push({main:m,stars:s,key:`${m.join('-')}|${s.join('-')}`});
const maxTickets=Math.max(1,Math.floor(MAX_BUDGET/cfg.unitCost+1e-9));
const tMain=Math.max(1,cfg.mainK-1),tStars=cfg.starK?Math.max(1,cfg.starK-1):0;
const subkeys=(ticket)=>{const keys=[];for(const x of comb(ticket.main,tMain))keys.push(`M${tMain}:${x.join('-')}`);if(cfg.starK)for(const x of comb(ticket.stars,tStars))keys.push(`S${tStars}:${x.join('-')}`);if(cfg.starK)for(const m of comb(ticket.main,Math.max(1,cfg.mainK-2)))for(const s of comb(ticket.stars,cfg.starK))keys.push(`X:${m.join('-')}|${s.join('-')}`);return keys};
for(const c of candidates)c.cover=subkeys(c);
const selected=[],coverage=new Map();
function overlap(a,b){let z=0;for(const x of a.main)if(b.main.includes(x))z++;if(cfg.starK)for(const x of a.stars)if(b.stars.includes(x))z+=.5;return z}
while(selected.length<Math.min(maxTickets,candidates.length)){
  let best=null,bestScore=-Infinity;
  for(const c of candidates){if(selected.some(x=>x.key===c.key))continue;let novelty=0,balance=0;for(const k of c.cover){const n=coverage.get(k)||0;novelty+=1/(1+n);balance+=n===0?1:0}const diversity=selected.reduce((s,x)=>s+overlap(c,x),0);const score=1000*balance+100*novelty-3*diversity;if(score>bestScore||(score===bestScore&&c.key<(best?.key||'~'))){best=c;bestScore=score}}
  if(!best)break;selected.push(best);for(const k of best.cover)coverage.set(k,(coverage.get(k)||0)+1);
}
const universeMain=comb(mainPool,tMain).length,coveredMain=[...coverage.keys()].filter(k=>k.startsWith(`M${tMain}:`)).length;
const universeStars=cfg.starK?comb(starPool,tStars).length:0,coveredStars=cfg.starK?[...coverage.keys()].filter(k=>k.startsWith(`S${tStars}:`)).length:0;
const fullPoolEnumeration=candidates.length<=maxTickets;
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v63-coverage-lab',game:GAME,policy:{maxBudgetEUR:MAX_BUDGET,unitCostEUR:cfg.unitCost,maxTickets,predictionSeparatedFromCoverage:true},candidatePool:{main:mainPool,stars:starPool,mainPoolSize:mainPool.length,starPoolSize:starPool.length},enumeration:{candidateTickets:candidates.length,selectedTickets:selected.length,fullPoolEnumeration},coverage:{targetMainSubsetSize:tMain,mainSubsetsUniverse:universeMain,mainSubsetsCovered:coveredMain,mainCoverage:universeMain?coveredMain/universeMain:null,targetStarSubsetSize:tStars,starSubsetsUniverse:universeStars,starSubsetsCovered:coveredStars,starCoverage:universeStars?coveredStars/universeStars:null},tickets:selected.map((x,i)=>({index:i+1,main:x.main,stars:x.stars})),interpretation:fullPoolEnumeration?'FULL_ENUMERATION_OF_CANDIDATE_POOL_WITHIN_BUDGET':'GREEDY_PARTIAL_COVERING_DESIGN_UNDER_BUDGET',realMoneyPass:false,warning:'Coverage optimization cannot make a random draw predictable. It only allocates a fixed ticket budget more efficiently conditional on the candidate pool.'};
fs.mkdirSync(OUT.slice(0,OUT.lastIndexOf('/')),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({game:GAME,selected:out.enumeration.selectedTickets,coverage:out.coverage,interpretation:out.interpretation},null,2));
