#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OPERATOR='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const PROVIDER='https://fileservice.blueprintgaming.com/?affiliate=&customer=BOTEMANIA&fileType=help&gameEngineID=fishingfrenzyjk&language=ES&profile=jackpotkingdeluxe3';
const OUT='loterias-ai/edge-live/evidence/botemania-fishin-public-stake-probe-v1.json';
const headers={accept:'text/html,*/*','user-agent':'loterias-ai-edge-live-stake-probe/1.0','cache-control':'no-cache'};
const normalize=s=>String(s||'').replace(/&nbsp;|&#160;/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const contexts=(text,needle,span=350)=>{const low=text.toLowerCase(),n=needle.toLowerCase(),out=[];let p=0;while(out.length<12){const i=low.indexOf(n,p);if(i<0)break;out.push(normalize(text.slice(Math.max(0,i-span),Math.min(text.length,i+n.length+span))));p=i+n.length;}return out;};
const sources=[];
for(const [name,url] of [['BOTEMANIA_GAME_PAGE',OPERATOR],['BLUEPRINT_BOTEMANIA_HELP',PROVIDER]]){
  try{const r=await fetch(url,{headers,redirect:'follow'}),text=await r.text();sources.push({name,url,httpStatus:r.status,ok:r.ok,contentType:r.headers.get('content-type'),bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),contexts:{totalBet:[...contexts(text,'APUESTA TOTAL'),...contexts(text,'TOTAL BET')],coinValue:[...contexts(text,'valor moneda'),...contexts(text,'coin value')],stake:[...contexts(text,'apuestas disponibles'),...contexts(text,'bet options')]}});}catch(e){sources.push({name,url,ok:false,error:String(e?.message||e)});}
}
const totalBetContexts=sources.flatMap(s=>s.contexts?.totalBet||[]);
const explicitLists=[];
for(const c of totalBetContexts){
  const listMatches=[...c.matchAll(/(?:APUESTA TOTAL|TOTAL BET)\s*(?:es|:|de|=)?\s*((?:€?\s*\d+(?:[.,]\d+)?\s*(?:€|EUR)?\s*[,;/|-]\s*){2,}€?\s*\d+(?:[.,]\d+)?\s*(?:€|EUR)?)/gi)];
  for(const m of listMatches){const values=[...m[1].matchAll(/\d+(?:[.,]\d+)?/g)].map(x=>Number(x[0].replace(',','.'))).filter(x=>Number.isFinite(x)&&x>0&&x<=1000);if(values.length>=3)explicitLists.push({context:c,values:[...new Set(values)]});}
}
const exactList=explicitLists.find(x=>x.values.length>=3)||null;
const exactStakePerSpinKnown=Boolean(exactList);
const minimumExactTotalBetEUR=exactList?Math.min(...exactList.values):null;
const out={version:'botemania-fishin-public-stake-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',game:"Fishin' Frenzy: Jackpot King",sources,decision:{exactTotalBetLadderRecovered:exactStakePerSpinKnown,exactStakePerSpinKnown,exactTotalBetOptionsEUR:exactList?.values||[],minimumExactTotalBetEUR,coinValueRangeMustNotBeTreatedAsTotalBet:true},interpretation:exactStakePerSpinKnown?'An explicit TOTAL BET ladder was recovered from an official Botemania/Blueprint-Botemania public source.':'Official public sources mention coin value and operator-configured TOTAL BET selection but do not expose an explicit Botemania Spain total-bet ladder. No stake amount is inferred.',guards:{officialSourcesOnly:true,noAuthentication:true,noCookies:true,noGuestSession:true,noCoinValueMultiplicationAssumption:true,noCrossOperatorStakeSubstitution:true,noBetting:true}};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.decision,null,2));
