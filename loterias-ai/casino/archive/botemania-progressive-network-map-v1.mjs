#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const IN='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const OUT='loterias-ai/casino/archive/evidence/botemania-progressive-network-map-v1.json';
const db=JSON.parse(fs.readFileSync(IN,'utf8'));
const UA='loterias-ai-progressive-network-map/1.1';
const strip=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const dec=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const candidates=(db.games||[]).filter(g=>g.mechanics?.includes('PROGRESSIVE')||g.mechanics?.includes('JACKPOT')||g.jackpotKing||g.stateDependentProbability);
const zeroPatterns=[
 /valor (?:del )?bote progresivo[^.]{0,220}(?:0\s*€|cero)/i,
 /(?:reinicia|reinici[oó]|reiniciado|restablece|restableci[oó])[^.]{0,220}(?:desde|a|en)\s*(?:los?\s*)?0\s*€/i,
 /(?:parti[oó]|parte|comienza|empieza)[^.]{0,180}(?:desde|en)\s*(?:los?\s*)?0\s*€/i,
 /(?:desde que|cuando)[^.]{0,160}(?:importe|valor)[^.]{0,120}(?:reinici[oó]|restableci[oó])[^.]{0,120}0\s*€/i,
 /valor inicial[^.]{0,100}(?:0\s*€|cero)/i
];
let cursor=0;const rows=[];
async function worker(){while(true){const i=cursor++;if(i>=candidates.length)return;const g=candidates[i];try{
 const r=await fetch(g.url,{headers:{accept:'text/html,*/*','user-agent':UA,'cache-control':'no-cache'},redirect:'follow'}),html=await r.text(),text=strip(html);
 const h1Raw=(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||null;const canonicalTitle=h1Raw?strip(h1Raw):g.title||null;
 const shareContexts=[];for(const re of [/(?:compartid[oa]|comparte)[^.]{0,700}/gi,/(?:reiniciar[aá]n?|reinici[oó]|restablece|restableci[oó]|valor inicial|parti[oó] de 0|desde 0)[^.]{0,480}/gi,/(?:contribuye|contribuci[oó]n al bote)[^.]{0,320}/gi,/(?:probabilidades?|posibilidades?)[^.]{0,350}/gi])for(const m of text.matchAll(re))shareContexts.push(m[0].slice(0,900));
 const contribution=[...text.matchAll(/(?:contribuci[oó]n al bote|contribuye al bote[^\d]{0,80})(\d+(?:[.,]\d+)?)\s*%/gi)].map(m=>dec(m[1])).filter(Number.isFinite);
 const resetZero=zeroPatterns.some(re=>re.test(text));
 const zeroResetContexts=[];if(resetZero)for(const re of [/(?:reinicia|reinici[oó]|reiniciado|restablece|restableci[oó]|parti[oó]|comienza|empieza)[^.]{0,260}0\s*€/gi,/(?:desde que|cuando)[^.]{0,180}(?:importe|valor)[^.]{0,180}0\s*€/gi])for(const m of text.matchAll(re))zeroResetContexts.push(m[0].slice(0,500));
 const anyStake=/cualquier(?:a de las)? apuestas?|cualquier jugada|cualquier giro/i.test(text);
 const proportionalToBet=/(?:posibilidades?|probabilidades?)[^.]{0,220}proporcional(?:es)?[^.]{0,160}(?:apuesta|valor de tu apuesta)/i.test(text);
 const increasesWithPot=/(?:posibilidades?|probabilidades?)[^.]{0,260}(?:aumentan|aumenta|crecen|crece|incrementan|incrementa)[^.]{0,200}(?:valor|cantidad)[^.]{0,160}(?:bote|jackpot)/i.test(text);
 const namedGames=[...new Set(shareContexts.flatMap(c=>[...c.matchAll(/(?:con el de|con|,|y)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñ'’0-9 :\-]{2,70}?)(?=,| y | en Boteman| en Canal| y MONOPOLY|\.|$)/g)].map(m=>m[1].trim())).filter(x=>x.length>2))].slice(0,30);
 rows[i]={slug:g.slug,title:canonicalTitle,url:g.url,httpStatus:r.status,sha256:crypto.createHash('sha256').update(html).digest('hex'),providerHints:g.providerHints||[],jackpotKing:Boolean(g.jackpotKing),stateDependentProbability:Boolean(g.stateDependentProbability),contributionPct:[...new Set(contribution)],resetZero,zeroResetContexts:[...new Set(zeroResetContexts)].slice(0,10),anyStake,proportionalToBet,increasesWithPot,sharedGameNameCandidates:namedGames,contexts:[...new Set(shareContexts)].slice(0,20)};
 }catch(e){rows[i]={slug:g.slug,url:g.url,error:String(e?.message||e)};}}}
await Promise.all(Array.from({length:6},()=>worker()));
const clean=rows.filter(Boolean);const networkLike=clean.filter(x=>x.sharedGameNameCandidates?.length||x.contexts?.some(c=>/compartid/i.test(c)));const statePot=clean.filter(x=>x.increasesWithPot);const zeroReset=clean.filter(x=>x.resetZero);
const out={version:'botemania-progressive-network-map-v1.1-zero-reset-and-title-fix',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceCensusGeneratedAt:db.generatedAt,summary:{candidatePages:candidates.length,successful:clean.filter(x=>x.httpStatus===200).length,networkSharingDetected:networkLike.length,resetToZeroDetected:zeroReset.length,probabilityIncreasesWithPotDetected:statePot.length,proportionalToBetDetected:clean.filter(x=>x.proportionalToBet).length},rows:clean,networkLike,statePot,zeroReset,guards:{publicOperatorPagesOnly:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,zeroReset:zeroReset.map(x=>({slug:x.slug,title:x.title,contributionPct:x.contributionPct,anyStake:x.anyStake,proportionalToBet:x.proportionalToBet,contexts:x.zeroResetContexts})),statePot:statePot.map(x=>x.slug)},null,2));
