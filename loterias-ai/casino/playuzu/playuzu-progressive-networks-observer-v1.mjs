#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const DISC='loterias-ai/casino/playuzu/evidence/shared-jackpot-networks-v1.json';
const PLAN='loterias-ai/casino/playuzu/evidence/progressive-network-monitor-plan-v1.json';
const PROTOCOL='loterias-ai/casino/playuzu/evidence/progressive-network-observation-protocol-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/progressive-network-observations-v1.json';
const disc=JSON.parse(fs.readFileSync(DISC,'utf8')),plan=JSON.parse(fs.readFileSync(PLAN,'utf8')),protocol=JSON.parse(fs.readFileSync(PROTOCOL,'utf8'));
if(disc.version!=='shared-jackpot-networks-v1'||plan.version!=='progressive-network-monitor-plan-v1'||protocol.version!=='progressive-network-observation-protocol-v1')throw new Error('progressive network evidence version drift');
if(protocol.guards?.immutable!==true||protocol.guards?.realMoneyAllowed!==false||plan.guards?.futureGrowthOrResetNotUsed!==true||plan.guards?.currencyTrusted!==false)throw new Error('progressive protocol safety drift');
const prior=fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):{version:'progressive-network-observations-v1',observations:[],networkTotals:{},guards:{}};
const now=new Date().toISOString();
const last=(prior.observations||[]).at(-1);
if(last?.observedAt&&Date.now()-Date.parse(last.observedAt)<3600000){console.log(JSON.stringify({skipped:true,reason:'HOURLY_THROTTLE',lastObservedAt:last.observedAt,realMoneyAllowed:false},null,2));process.exit(0)}
const membership=new Map();
for(const n of disc.sharedNetworks||[])membership.set(n.networkId,new Set((n.titles||[]).map(t=>Number(t.internalGameId)).filter(Number.isFinite)));
const pages=[];const entries=[];
for(const page of plan.selectedPages||[]){
 const url=`${disc.backendPath}?page=${Number(page)}&appName=${encodeURIComponent(disc.appName)}`;
 try{
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-progressive-networks-observer/1.0','referer':disc.sourcePage,'origin':'https://www.playuzu.es','cache-control':'no-cache, no-store, max-age=0'}});
  const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}
  const data=Array.isArray(j?.data)?j.data:[];
  pages.push({page:Number(page),url,httpStatus:r.status,itemCount:data.length,responseSha256:crypto.createHash('sha256').update(text).digest('hex')});
  if(!r.ok)continue;
  for(const g of data){const id=Number(g.internal_game_id),raw=Number(g?.jackpot?.amount);if(!Number.isFinite(id)||!Number.isFinite(raw)||raw<=0)continue;entries.push({page:Number(page),internalGameId:id,name:String(g.application_name||g.item_title||''),rawNetworkCounter:raw,reportedCurrency:g?.jackpot?.currency??null,reportedSymbol:g?.jackpot?.symbol??null,rtpMaxPct:Number.isFinite(Number(g.rtp_max))?Number(g.rtp_max):null,provider:g.game_provider??null});}
 }catch(e){pages.push({page:Number(page),url,error:String(e?.message||e)});}
}
const networkRows=[];
for(const n of plan.networks||[]){
 const ids=membership.get(n.networkId)||new Set();
 const members=entries.filter(e=>ids.has(e.internalGameId));
 const buckets=new Map();
 for(const m of members){const k=m.rawNetworkCounter.toFixed(6),b=buckets.get(k)||{rawNetworkCounter:m.rawNetworkCounter,titles:new Map(),currencies:new Set()};b.titles.set(m.internalGameId,m.name);if(m.reportedCurrency)b.currencies.add(String(m.reportedCurrency));buckets.set(k,b)}
 const ranked=[...buckets.values()].map(b=>({rawNetworkCounter:b.rawNetworkCounter,distinctTitles:b.titles.size,titles:[...b.titles.values()].sort(),reportedCurrencies:[...b.currencies].sort()})).sort((a,b)=>b.distinctTitles-a.distinctTitles||b.rawNetworkCounter-a.rawNetworkCounter);
 const match=ranked.find(b=>b.distinctTitles>=2)||null;
 const prev=(prior.observations||[]).slice().reverse().map(o=>(o.networks||[]).find(x=>x.networkId===n.networkId&&x.corroborated===true&&Number.isFinite(Number(x.rawNetworkCounter)))).find(Boolean)||null;
 const deltaRaw=match&&prev?Number((match.rawNetworkCounter-Number(prev.rawNetworkCounter)).toFixed(6)):null;
 networkRows.push({networkId:n.networkId,corroborated:Boolean(match),rawNetworkCounter:match?.rawNetworkCounter??null,distinctTitles:match?.distinctTitles??0,titles:match?.titles??[],reportedCurrencies:match?.reportedCurrencies??[],currencyTrusted:false,deltaRaw,possibleReset:Boolean(deltaRaw!==null&&deltaRaw<0),discoveryDistinctTitles:Number(n.distinctTitlesAtDiscovery||0),providers:n.providers||[],selectedPages:n.selectedPages||[]});
}
const obs={observedAt:now,sourcePages:pages,allRequiredPagesHttp200:pages.length===Number(plan.pageCount)&&pages.every(p=>p.httpStatus===200),networks:networkRows};
const observations=[...(prior.observations||[]),obs].slice(-720);
const networkTotals={...(prior.networkTotals||{})};
for(const r of networkRows){const t=networkTotals[r.networkId]||{validObservations:0,resets:0,lastRawNetworkCounter:null};if(r.corroborated){t.validObservations++;if(r.possibleReset)t.resets++;t.lastRawNetworkCounter=r.rawNetworkCounter;t.lastObservedAt=now;}networkTotals[r.networkId]=t;}
const payload={version:'progressive-network-observations-v1',generatedAt:now,protocolVersion:protocol.version,monitorPlanVersion:plan.version,discoveryVersion:disc.version,summary:{selectedPages:Number(plan.pageCount||0),networksPlanned:Number(plan.networkCount||0),networksCorroboratedThisObservation:networkRows.filter(r=>r.corroborated).length,minimumObservationsBeforeStateSummary:Number(protocol.observation?.minimumObservationCountBeforeStateSummary||168),allRequiredPagesHttp200:obs.allRequiredPagesHttp200},networkTotals,observations,guards:{networkMembershipFrozenFromDiscoverySnapshot:true,futureGrowthCannotChangeMembership:true,currencyTrusted:false,noInterpolationAcrossMissingSnapshots:true,noOptionalStopping:true,counterSizeAloneCanNeverPass:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,networks:networkRows.map(x=>({id:x.networkId,ok:x.corroborated,raw:x.rawNetworkCounter,reset:x.possibleReset}))},null,2));
