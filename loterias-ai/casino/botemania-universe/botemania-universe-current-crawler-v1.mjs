#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const INDEX='https://www.botemania.es/juegos/todos-los-juegos';
const OUT='loterias-ai/casino/botemania-universe/evidence/botemania-universe-current-v1.json';
const LEDGER='loterias-ai/casino/botemania-universe/evidence/botemania-universe-change-ledger-v1.json';
const UA='loterias-ai-botemania-universe-crawler/1.0 (+public research; no auth; no betting)';
const now=new Date().toISOString();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&#x27;|&#39;/gi,"'").replace(/&quot;/gi,'"').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const textify=h=>decode(String(h||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};

async function get(url){
  const r=await fetch(url,{headers:{accept:'text/html,application/xhtml+xml','user-agent':UA,'cache-control':'no-cache'},redirect:'follow'});
  const body=await r.text();return {status:r.status,ok:r.ok,finalUrl:r.url,body};
}

const idx=await get(INDEX);
if(!idx.ok) throw new Error(`Botemania all-games index HTTP ${idx.status}`);
const links=new Map();
for(const m of idx.body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  let href=m[1];try{href=new URL(href,INDEX).href}catch{continue}
  const u=new URL(href);if(u.hostname!=='www.botemania.es')continue;
  const parts=u.pathname.split('/').filter(Boolean);
  if(parts[0]!=='juegos'||parts.length<3||parts[1]==='todos-los-juegos')continue;
  u.search='';u.hash='';
  const label=textify(m[2]);if(!links.has(u.href))links.set(u.href,label||null);
}
const urls=[...links.keys()].sort();
const previous=read(OUT);const prevBy=new Map((previous?.games||[]).map(x=>[x.url,x]));
const providerTerms=['Blueprint','Red Tiger','Evolution','NetEnt','Pragmatic Play','Playtech','Microgaming','Games Global','Light & Wonder','Big Time Gaming','MGA','Play’n GO','Play n GO','Inspired','IGT','Amusnet','EGT','Novomatic'];

async function inspect(url){
  try{
    const r=await get(url);const text=textify(r.body);
    const h1=(r.body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||[])[1];
    const title=textify(h1)||(textify((r.body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1])||links.get(url)||null);
    const pcts=[...text.matchAll(/(\d{1,3}(?:[.,]\d{1,3})?)\s*%/g)].map(x=>Number(x[1].replace(',','.'))).filter(Number.isFinite);
    const rtpContexts=[];for(const needle of ['Porcentaje de Retorno','RTP']){let p=0;while(rtpContexts.length<8){const i=text.toLowerCase().indexOf(needle.toLowerCase(),p);if(i<0)break;rtpContexts.push(text.slice(Math.max(0,i-180),Math.min(text.length,i+600)));p=i+needle.length;}}
    const coin=(text.match(/valor moneda[^.]{0,180}?(?:va|es)?\s*de\s*([^,.]{1,24})\s+a\s+([^,.]{1,24})/i)||null);
    const path=new URL(url).pathname.split('/').filter(Boolean);
    const providerHints=providerTerms.filter(x=>text.toLowerCase().includes(x.toLowerCase()));
    const progressive=/bote progresivo|jackpot progresivo|progressive jackpot/i.test(text);
    const jackpotKing=/jackpot\s*king/i.test(text);
    const mustDrop=/debe ganarse|debe ganarse en|caen antes de alcanzar|antes de alcanzar un valor|must\s*(?:be)?\s*won|must\s*drop/i.test(text);
    const probabilityRises=/probabilidades?[^.]{0,160}(?:aumentan|crecen)[^.]{0,160}(?:valor|bote|jackpot)|(?:aumentan|crecen)[^.]{0,160}probabilidades?/i.test(text);
    const anyStake=/cualquier apuesta|cualquier jugada|cualquier giro/i.test(text);
    const prior=prevBy.get(url);
    return {url,httpStatus:r.status,finalUrl:r.finalUrl,title,category:path[1]||null,slug:path.slice(2).join('/'),bytes:r.body.length,htmlSha256:sha(r.body),firstSeenAt:prior?.firstSeenAt||now,lastSeenAt:now,indexLabel:links.get(url)||null,providerHints,percentages:[...new Set(pcts)].slice(0,40),rtpContexts,coinRangeRaw:coin?{from:coin[1].trim(),to:coin[2].trim()}:null,flags:{progressive,jackpotKing,mustDrop,stateDependentProbability:probabilityRises,anyStake},sourceType:'PUBLIC_OPERATOR_PAGE'};
  }catch(e){return {url,httpStatus:null,error:String(e?.message||e),firstSeenAt:prevBy.get(url)?.firstSeenAt||now,lastSeenAt:now,sourceType:'PUBLIC_OPERATOR_PAGE'};}
}

const games=[];let cursor=0;const workers=Array.from({length:6},async()=>{while(true){const i=cursor++;if(i>=urls.length)return;games[i]=await inspect(urls[i]);await sleep(75);}});await Promise.all(workers);
const byCategory={};for(const g of games)byCategory[g.category]=(byCategory[g.category]||0)+1;
const prevUrls=new Set((previous?.games||[]).map(x=>x.url)),curUrls=new Set(games.map(x=>x.url));
const added=[...curUrls].filter(x=>!prevUrls.has(x));const removed=[...prevUrls].filter(x=>!curUrls.has(x));
const changed=games.filter(g=>prevBy.has(g.url)&&prevBy.get(g.url)?.htmlSha256!==g.htmlSha256).map(g=>({url:g.url,previousSha256:prevBy.get(g.url)?.htmlSha256||null,currentSha256:g.htmlSha256||null}));
const out={version:'botemania-universe-current-v1',generatedAt:now,operator:'botemania-es',index:{url:INDEX,httpStatus:idx.status,bytes:idx.body.length,sha256:sha(idx.body)},summary:{gamesDiscovered:games.length,successfulPages:games.filter(x=>x.httpStatus===200).length,byCategory,progressiveGames:games.filter(x=>x.flags?.progressive).length,jackpotKingGames:games.filter(x=>x.flags?.jackpotKing).length,mustDropGames:games.filter(x=>x.flags?.mustDrop).length,stateDependentGames:games.filter(x=>x.flags?.stateDependentProbability).length},games,guards:{publicPagesOnly:true,noAuthentication:true,noCookies:true,noPrivateEndpoints:true,noBetting:true,realMoneyAllowed:false}};
const priorLedger=read(LEDGER)||{version:'botemania-universe-change-ledger-v1',createdAt:now,events:[]};
if(!previous||added.length||removed.length||changed.length)priorLedger.events.push({observedAt:now,indexSha256:out.index.sha256,counts:out.summary,added,removed,changed});
priorLedger.updatedAt=now;priorLedger.events=priorLedger.events.slice(-250);
fs.mkdirSync('loterias-ai/casino/botemania-universe/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');fs.writeFileSync(LEDGER,JSON.stringify(priorLedger,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,changes:{added:added.length,removed:removed.length,changed:changed.length}},null,2));
