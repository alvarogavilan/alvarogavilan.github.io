#!/usr/bin/env node
import fs from 'node:fs';

const VERSION='selae-extraction-order-backfill-v1';
const BASE='https://www.loteriasyapuestas.es/es/resultados';
const SUPPORTED=new Set(['primitiva','bonoloto']);
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0});
const normGame=s=>String(s||'').trim().toLowerCase();
const uniq=a=>new Set(a).size===a.length;
const sameSet=(a,b)=>a.length===b.length&&[...a].sort((x,y)=>x-y).every((v,i)=>v===[...b].sort((x,y)=>x-y)[i]);
const nums=s=>[...String(s||'').matchAll(/\b(?:0?[1-9]|[1-4][0-9])\b/g)].map(m=>Number(m[0])).filter(n=>n>=1&&n<=49);
function strip(html){return String(html||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,...extra,execution:execution(),hardGuards:{officialSELAEOnly:true,neverInferOrderFromSortedMain:true,permutationEqualityRequired:true,noPredictionFromOrderAlone:true}};}
export function parseOfficialExtractionOrder(html,{game,officialMain}={}){
  game=normGame(game); if(!SUPPORTED.has(game))return fail('UNSUPPORTED_GAME',{game});
  const main=(officialMain||[]).map(Number); if(main.length!==6||!uniq(main)||main.some(n=>n<1||n>49))return fail('EXACT_SIX_OFFICIAL_MAIN_REQUIRED',{game});
  const text=strip(html);
  const label=game==='primitiva'?'La Primitiva':'Bonoloto';
  const at=text.toLowerCase().lastIndexOf(label.toLowerCase());
  const scope=at>=0?text.slice(at,at+2400):text;
  const marker=scope.toLowerCase().indexOf('ver por orden de aparición');
  if(marker<0)return fail('ORDER_MARKER_NOT_FOUND',{game});
  const tail=scope.slice(marker+'ver por orden de aparición'.length);
  const found=nums(tail);
  if(found.length<12)return fail('INSUFFICIENT_NUMBER_SEQUENCE',{game,foundCount:found.length});
  const first=found.slice(0,6),second=found.slice(6,12);
  const mainSorted=[...main].sort((a,b)=>a-b);
  const candidates=[first,second].filter(x=>x.length===6&&uniq(x)&&sameSet(x,main));
  if(candidates.length!==2)return fail('EXPECTED_SORTED_AND_APPEARANCE_PERMUTATIONS_NOT_FOUND',{game,first,second,officialMain:main});
  const firstIsCanonical=first.every((v,i)=>v===mainSorted[i]);
  const secondIsCanonical=second.every((v,i)=>v===mainSorted[i]);
  if(firstIsCanonical===secondIsCanonical)return fail('AMBIGUOUS_CANONICAL_VS_EXTRACTION_ORDER',{game,first,second,officialMain:main});
  const extractionOrder=firstIsCanonical?second:first;
  return {version:VERSION,ok:true,game,officialMain:main,canonicalSorted:mainSorted,extractionOrder,permutationExact:sameSet(extractionOrder,main),positions:Object.fromEntries(extractionOrder.map((n,i)=>[`p${i+1}`,n])),execution:execution(),hardGuards:{officialSELAEOnly:true,neverInferOrderFromSortedMain:true,permutationEqualityRequired:true,noPredictionFromOrderAlone:true}};
}
async function main(){
  const [,,game,drawId,archivePath]=process.argv;
  if(!SUPPORTED.has(normGame(game))||!/^\d+$/.test(String(drawId||''))||!archivePath){console.error('Usage: node loterias-ai/scripts/selae-extraction-order-backfill-v1.mjs <primitiva|bonoloto> <drawId> <archive.json>');process.exitCode=2;return;}
  const doc=JSON.parse(fs.readFileSync(archivePath,'utf8')); const records=doc.records||[];
  const rec=records.find(r=>String(r?.verification?.officialCrossCheck?.officialDrawId||r?.drawId||'').includes(String(drawId)));
  if(!rec?.result?.main)throw new Error('Archive record with exact official main not found');
  const url=`${BASE}?drawId=${encodeURIComponent(drawId)}`;
  const res=await fetch(url,{headers:{accept:'text/html','user-agent':'LoteriasAI-extraction-order/1.0'}}); const html=await res.text();
  if(!res.ok)throw new Error(`SELAE HTTP ${res.status}`);
  const parsed=parseOfficialExtractionOrder(html,{game,officialMain:rec.result.main});
  process.stdout.write(JSON.stringify({...parsed,source:{provider:'SELAE',url,httpStatus:res.status}},null,2)+'\n');
  if(!parsed.ok)process.exitCode=1;
}
if(import.meta.url===`file://${process.argv[1]}`)main().catch(e=>{console.error(String(e?.stack||e));process.exitCode=1;});
