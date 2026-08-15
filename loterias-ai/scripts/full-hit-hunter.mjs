import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/data/archive';
const OUT='loterias-ai/data/research/full-hit-hunter.json';
const EXCLUDED=new Set(['_meta']);

const cleanNum=x=>String(x??'').replace(/\D/g,'');
const sortedNums=a=>(a||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
const stable=x=>JSON.stringify(x);

function canonical(rec,mode='main'){
  const r=rec?.result||{};
  if(Array.isArray(r.main)&&r.main.length){
    const base={main:sortedNums(r.main)};
    if(mode==='full'){
      if(Array.isArray(r.stars))base.stars=sortedNums(r.stars);
      if(r.dream!=null)base.dream=Number(r.dream);
      if(r.key!=null)base.key=Number(r.key);
      if(r.reintegro!=null)base.reintegro=Number(r.reintegro);
      if(r.complementary!=null)base.complementary=Number(r.complementary);
    }
    return stable(base);
  }
  if(r.firstPrize!=null){const n=cleanNum(r.firstPrize).slice(-5).padStart(5,'0');if(/^\d{5}$/.test(n))return stable({firstPrize:n});}
  const legacyOutcomes=Array.isArray(r.outcomes)?r.outcomes.map(x=>String(x||'').trim()):null;
  if(legacyOutcomes?.length>=14){if(mode==='main')return stable({signs:legacyOutcomes.slice(0,14)});return stable({signs:legacyOutcomes.slice(0,14),pleno15:legacyOutcomes[14]??null});}
  if(Array.isArray(r.matches)&&r.matches.length){const signs=r.matches.map(m=>String(m?.sign??m?.result??m?.outcome??'').trim());if(signs.filter(Boolean).length>=Math.min(14,r.matches.length)){if(mode==='main')return stable({signs:signs.slice(0,14)});const m15=r.matches[14]||{};return stable({signs:signs.slice(0,14),pleno15:{sign:signs[14]||null,score:String(m15.score??m15.resultado??'')||null}});}}
  if(Array.isArray(r.results)&&r.results.length){const vals=r.results.map(x=>String(x?.result??x?.sign??x?.outcome??x??'').trim());if(vals.some(Boolean))return stable({results:mode==='main'?vals.slice(0,6):vals});}
  return null;
}
function ticketCost(rec){const x=Number(rec?.economics?.ticketCost);return x>0?x:null;}
function readGame(dir){const base=path.join(ROOT,dir);if(!fs.existsSync(base))return [];let rows=[];for(const f of fs.readdirSync(base).filter(x=>/^\d{4}\.json$/.test(x)).sort()){try{const j=JSON.parse(fs.readFileSync(path.join(base,f),'utf8'));rows.push(...(j.records||[]));}catch{}}return rows.filter(r=>r?.drawDate).sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));}
function analyzeMode(rows,mode){
 const seq=rows.map(r=>({date:r.drawDate,key:canonical(r,mode),cost:ticketCost(r)})).filter(x=>x.key).map((x,pos)=>({...x,pos})),occurrences=new Map();for(const x of seq){if(!occurrences.has(x.key))occurrences.set(x.key,[]);occurrences.get(x.key).push(x)}
 const repeated=[...occurrences.entries()].filter(([,a])=>a.length>1).map(([key,a])=>({signature:key,occurrences:a.length,firstDate:a[0].date,repeatDates:a.slice(1).map(x=>x.date),firstRepeatAfterDraws:a[1].pos-a[0].pos,replayFirstOccurrenceUntilFirstRepeat:{tickets:a[1].pos-a[0].pos,knownStakeEUR:(()=>{let s=0,known=true;for(let k=a[0].pos+1;k<=a[1].pos;k++){const c=seq[k]?.cost;if(!(c>0)){known=false;break}s+=c}return known?Number(s.toFixed(2)):null})()}})).sort((a,b)=>b.occurrences-a.occurrences||a.firstDate.localeCompare(b.firstDate));
 const windows=[1,2,5,10,25,50,100,250,500,1000,2500,5000,Infinity];
 const replayWindows=windows.map(w=>{let hits=0,played=0,knownStake=0,stakeComplete=true;const samples=[];for(let i=1;i<seq.length;i++){const start=Number.isFinite(w)?Math.max(0,i-w):0,prior=new Set(seq.slice(start,i).map(x=>x.key));played+=prior.size;if(prior.has(seq[i].key)){hits++;if(samples.length<50)samples.push({date:seq[i].date,signature:seq[i].key,activeTickets:prior.size})}const c=seq[i].cost;if(c>0)knownStake+=c*prior.size;else stakeComplete=false}return{windowPreviousDraws:Number.isFinite(w)?w:'ALL_PRIOR',fullHits:hits,ticketsPlayed:played,knownStakeEUR:stakeComplete?Number(knownStake.toFixed(2)):null,samples}});
 return{drawsWithSignature:seq.length,uniqueSignatures:occurrences.size,repeatedSignatures:repeated.length,totalLaterRepeatEvents:repeated.reduce((s,x)=>s+x.occurrences-1,0),repeated:repeated.slice(0,200),replayWindows};
}
const games=fs.existsSync(ROOT)?fs.readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&!EXCLUDED.has(d.name)).map(d=>d.name).sort():[];
const report={generatedAt:new Date().toISOString(),methodology:'historical-full-hit-hunter-v3',warning:'A historical full hit or repeated winning signature is not evidence of predictive edge. Long replay horizons can guarantee eventual retrospective repeats only by accumulating very large ticket counts; cost must be compared with prize economics before promotion.',games:{}};
for(const game of games){const rows=readGame(game);if(!rows.length)continue;const main=analyzeMode(rows,'main'),full=analyzeMode(rows,'full');if(main.drawsWithSignature||full.drawsWithSignature)report.games[game]={draws:rows.length,mainCombination:main,fullCombination:full};}
report.summary={gamesAnalyzed:Object.keys(report.games).length,totalDraws:Object.values(report.games).reduce((s,g)=>s+g.draws,0),gamesWithAnyMainRepeat:Object.entries(report.games).filter(([,g])=>g.mainCombination.repeatedSignatures>0).map(([k])=>k),gamesWithAnyFullRepeat:Object.entries(report.games).filter(([,g])=>g.fullCombination.repeatedSignatures>0).map(([k])=>k)};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,byGame:Object.fromEntries(Object.entries(report.games).map(([k,g])=>[k,{draws:g.draws,mainRepeats:g.mainCombination.repeatedSignatures,fullRepeats:g.fullCombination.repeatedSignatures,allPrior:g.mainCombination.replayWindows.at(-1)}]))},null,2));
