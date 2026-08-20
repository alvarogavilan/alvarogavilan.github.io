#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const PAGE='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-frontend-feed-discovery-v1.json';
const headers={accept:'text/html,application/javascript,*/*','user-agent':'loterias-ai-jpk-frontend-feed-discovery/1.0','cache-control':'no-cache'};
const pageRes=await fetch(PAGE,{headers,redirect:'follow'}),html=await pageRes.text();
const srcs=[];for(const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){try{const u=new URL(m[1],PAGE);if(u.hostname==='www.botemania.es'||u.hostname==='botemania.es')srcs.push(u.href);}catch{}}
const scripts=[...new Set(srcs)].slice(0,18);
const terms=['blueprintJackpots','jackpotWinners','jackpotWinner','winnerHistory','recentWinners','jackpotHistory','loadJackpots','jackpotWins','jackpotWin','winners'];
const operationNames=new Set(),queryNames=new Set(),contexts=[];
const evidence=[];
for(const url of scripts){
 try{
  const r=await fetch(url,{headers,redirect:'follow'}),text=await r.text();
  const hitTerms=terms.filter(t=>text.toLowerCase().includes(t.toLowerCase()));
  if(hitTerms.length){
    for(const re of [/operationName\s*[:=]\s*["']([A-Za-z0-9_]*Jackpot[A-Za-z0-9_]*)["']/gi,/query\s+([A-Za-z0-9_]*Jackpot[A-Za-z0-9_]*)\s*[({]/gi,/([A-Za-z0-9_]*(?:Winner|Winners|History|Jackpot)[A-Za-z0-9_]*)\s*[:=]/gi])for(const m of text.matchAll(re)){const n=m[1];if(/winner|history|jackpot/i.test(n)){if(/query/i.test(re.source))queryNames.add(n);else operationNames.add(n);}}
    for(const term of hitTerms){let p=0;while(contexts.length<80){const i=text.toLowerCase().indexOf(term.toLowerCase(),p);if(i<0)break;contexts.push({script:url,term,context:text.slice(Math.max(0,i-220),Math.min(text.length,i+520))});p=i+term.length;}}
  }
  evidence.push({url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),hitTerms});
 }catch(e){evidence.push({url,error:String(e?.message||e)});}
}
const candidates=[...new Set([...operationNames,...queryNames])].filter(x=>/winner|history|jackpot/i.test(x));
const out={version:'botemania-jpk-frontend-feed-discovery-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'PUBLIC_STATIC_FRONTEND_BUNDLES_ONLY_NO_AUTH_NO_INTROSPECTION',page:{url:PAGE,httpStatus:pageRes.status,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex')},scriptsDiscovered:srcs.length,scriptsScanned:scripts.length,evidence,candidateOperationNames:candidates,contexts,decision:{candidateHistoryFeedNamesRecovered:candidates.some(x=>/winner|history/i.test(x)),candidateJackpotOperationsRecovered:candidates.length>0,realMoneyAllowed:false},guards:{publicStaticAssetsOnly:true,sameOperatorHostOnly:true,maxScripts:18,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({scriptsScanned:out.scriptsScanned,candidateOperationNames:out.candidateOperationNames,decision:out.decision},null,2));
