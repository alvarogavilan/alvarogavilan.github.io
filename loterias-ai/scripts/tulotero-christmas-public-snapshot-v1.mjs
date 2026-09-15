#!/usr/bin/env node

const VERSION='tulotero-christmas-public-snapshot-v1';
const BASE='https://tulotero.es/comprar/loteria-navidad';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function normalizeNumber(x){const s=String(x??'').replace(/\D/g,'');return /^\d{1,5}$/.test(s)?s.padStart(5,'0'):null;}
function parseNumbers(html){
  const text=String(html||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
  const out=[];
  for(const m of text.matchAll(/Comprar\s+(\d{1,5})\b/g)){const n=normalizeNumber(m[1]);if(n&&!out.includes(n))out.push(n);}
  return out;
}
async function fetchText(url){const r=await fetch(url,{headers:{accept:'text/html','user-agent':'LoteriasAI-public-research/1.0'}});const t=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status} ${url}`);return t;}
async function captureEnding(ending){
  if(!/^\d{1,2}$/.test(ending))throw new Error('Ending must be 0-99');
  const e=ending.padStart(ending.length===1?1:2,'0');
  const url=`${BASE}/loteria-navidad-acabada-en/${e}/`;
  const html=await fetchText(url);
  const numbers=parseNumbers(html);
  return {ending:e,url,numbers,count:numbers.length};
}
async function main(){
  const endings=(process.argv.slice(2).length?process.argv.slice(2):['0','1','2','3','4','5','6','7','8','9']).map(String);
  const snapshots=[];
  for(const e of endings){snapshots.push(await captureEnding(e));await sleep(500);}
  const all=[...new Set(snapshots.flatMap(x=>x.numbers))].sort();
  const payload={
    version:VERSION,
    capturedAt:new Date().toISOString(),
    provider:'TuLotero',
    game:'Loteria de Navidad 2026',
    drawDate:'2026-12-22',
    sourceMode:'PUBLIC_WEB_ONLY',
    snapshots,
    uniqueNumbers:all.length,
    numbers:all,
    execution:execution(),
    hardGuards:{publicPagesOnly:true,noLoginAutomation:true,noPurchaseAutomation:true,noAvailabilityEqualsProbabilityInference:true,noFutureInformation:true},
    caveat:'Public termination pages may show a subset/paginated sample. Absence is not global unavailability unless exact-number search evidence is captured separately.'
  };
  process.stdout.write(JSON.stringify(payload,null,2)+'\n');
}

main().catch(e=>{console.error(e?.stack||String(e));process.exitCode=1;});
