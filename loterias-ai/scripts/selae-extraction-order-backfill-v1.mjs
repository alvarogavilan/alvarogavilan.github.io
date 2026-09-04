#!/usr/bin/env node
import fs from 'node:fs';

const VERSION='selae-extraction-order-backfill-v1.1';
const BASE='https://www.loteriasyapuestas.es/es/resultados';
const CONFIG={primitiva:{label:'La Primitiva',pick:6,max:49},bonoloto:{label:'Bonoloto',pick:6,max:49},'gordo-primitiva':{label:'El Gordo',pick:5,max:54}};
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0});
const normGame=s=>String(s||'').trim().toLowerCase();
const uniq=a=>new Set(a).size===a.length;
const sameSet=(a,b)=>a.length===b.length&&[...a].sort((x,y)=>x-y).every((v,i)=>v===[...b].sort((x,y)=>x-y)[i]);
function numberTokens(s,max){return [...String(s||'').matchAll(/\b\d{1,2}\b/g)].map(m=>Number(m[0])).filter(n=>n>=1&&n<=max);}
function strip(html){return String(html||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,...extra,execution:execution(),hardGuards:{officialSELAEOnly:true,neverInferOrderFromSortedMain:true,permutationEqualityRequired:true,noPredictionFromOrderAlone:true}};}
export function parseOfficialExtractionOrder(html,{game,officialMain}={}){
  game=normGame(game); const cfg=CONFIG[game]; if(!cfg)return fail('UNSUPPORTED_GAME',{game});
  const main=(officialMain||[]).map(Number); if(main.length!==cfg.pick||!uniq(main)||main.some(n=>n<1||n>cfg.max))return fail('EXACT_OFFICIAL_MAIN_REQUIRED',{game,pick:cfg.pick,max:cfg.max});
  const text=strip(html);
  const at=text.toLowerCase().lastIndexOf(cfg.label.toLowerCase());
  const scope=at>=0?text.slice(at,at+2400):text;
  const marker=scope.toLowerCase().indexOf('ver por orden de aparición');
  if(marker<0)return fail('ORDER_MARKER_NOT_FOUND',{game});
  const tail=scope.slice(marker+'ver por orden de aparición'.length);
  const found=numberTokens(tail,cfg.max);
  if(found.length<cfg.pick*2)return fail('INSUFFICIENT_NUMBER_SEQUENCE',{game,foundCount:found.length,required:cfg.pick*2});
  const first=found.slice(0,cfg.pick),second=found.slice(cfg.pick,cfg.pick*2);
  const mainSorted=[...main].sort((a,b)=>a-b);
  const candidates=[first,second].filter(x=>x.length===cfg.pick&&uniq(x)&&sameSet(x,main));
  if(candidates.length!==2)return fail('EXPECTED_SORTED_AND_APPEARANCE_PERMUTATIONS_NOT_FOUND',{game,first,second,officialMain:main});
  const firstIsCanonical=first.every((v,i)=>v===mainSorted[i]);
  const secondIsCanonical=second.every((v,i)=>v===mainSorted[i]);
  if(firstIsCanonical===secondIsCanonical)return fail('AMBIGUOUS_CANONICAL_VS_EXTRACTION_ORDER',{game,first,second,officialMain:main});
  const extractionOrder=firstIsCanonical?second:first;
  return {version:VERSION,ok:true,game,officialMain:main,canonicalSorted:mainSorted,extractionOrder,permutationExact:sameSet(extractionOrder,main),positions:Object.fromEntries(extractionOrder.map((n,i)=>[`p${i+1}`,n])),execution:execution(),hardGuards:{officialSELAEOnly:true,neverInferOrderFromSortedMain:true,permutationEqualityRequired:true,noPredictionFromOrderAlone:true}};
}
async function main(){
  const [,,game,drawId,archivePath]=process.argv; const cfg=CONFIG[normGame(game)];
  if(!cfg||!/^\d+$/.test(String(drawId||''))||!archivePath){console.error('Usage: node loterias-ai/scripts/selae-extraction-order-backfill-v1.mjs <primitiva|bonoloto|gordo-primitiva> <drawId> <archive.json>');process.exitCode=2;return;}
  const doc=JSON.parse(fs.readFileSync(archivePath,'utf8')); const records=doc.records||[];
  const rec=records.find(r=>String(r?.verification?.officialCrossCheck?.officialDrawId||r?.drawId||'').includes(String(drawId)));
  if(!rec?.result?.main)throw new Error('Archive record with exact official main not found');
  const url=`${BASE}?drawId=${encodeURIComponent(drawId)}`;
  const res=await fetch(url,{headers:{accept:'text/html','user-agent':'LoteriasAI-extraction-order/1.1'}}); const html=await res.text();
  if(!res.ok)throw new Error(`SELAE HTTP ${res.status}`);
  const parsed=parseOfficialExtractionOrder(html,{game,officialMain:rec.result.main});
  process.stdout.write(JSON.stringify({...parsed,source:{provider:'SELAE',url,httpStatus:res.status}},null,2)+'\n');
  if(!parsed.ok)process.exitCode=1;
}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(e=>{console.error(String(e?.stack||e));process.exitCode=1;});
