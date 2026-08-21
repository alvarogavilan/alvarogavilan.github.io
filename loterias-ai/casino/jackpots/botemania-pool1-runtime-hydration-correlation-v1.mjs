#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-runtime-hydration-correlation-v1.json';
const RESET_FILE='loterias-ai/casino/jackpots/evidence/botemania-pool1-reset-confirm-v1.json';
const CMS_FILE='loterias-ai/casino/jackpots/evidence/botemania-pool1-zero-reset-game-map-v1.json';
const UA='loterias-ai-pool1-runtime-hydration-correlation/1.0';
const TARGET_ID='pool1';
const FEED_QUERY='query loadJackpots { jackpots { id amount } }';
const WINNERS_QUERY=`query getWinners($venture: String) { winners(venture: $venture) { LocaleName WinAmount GameProductSkinName ProductType PrimaryHardwareType WinTimestamp } }`;
const WINNER_VENTURES=['botemania_es','botemania','BOTEMANIA','BOTEMANIA_ES'];
const TARGETS=[
  'winfall-wishes-jackpot','wonderland','la-isla-de-tiki','boteman','paper-wins-jackpot',
  'la-isla-de-tiki-bote','winstones-bote','la-isla-de-tiki-tropico-dorado',
  'bote-de-secretos-del-fenix','duble-buble-bote-triple'
];
const DISCOVERY_KEYS=['resourceId','resourceID','gameId','gameID','gameCode','gameSkin','productSkin','providerId','providerID','launchUrl','launchURL','launchGame','gameLaunch','iframeUrl','iframeURL','playUrl','playURL','realPlay','demoPlay','gameSession','sessionToken','jackpotId','jackpotsParams','gameFeatures'];
const AMBIGUOUS_IDS=['JACKPOT','JackpotPool','progressive_id1'];
const RELATED_SPECIFIC_IDS=['bouncy_bubbles_id','classicwildsprogressive','diamondbonanza25BTM','DealOrNoDealStateful3','tikitemple2_1','progressivealice1','WAGER_BET'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const finiteOrNull=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

async function request(url,opts={}){
  try{
    const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,contentType:r.headers.get('content-type'),sha256:sha(text),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',contentType:null,sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gql(query,variables={},operationName=null,referer=`${ORIGIN}/`){
  const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName,variables,query})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  return {httpStatus:r.status,ok:r.ok,body,error:r.error,bytes:r.text.length,sha256:r.sha256};
}
function feedRows(body){return (body?.data?.jackpots||[]).map(x=>({id:String(x?.id??'').trim(),amountEUR:finiteOrNull(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);}
function distinctAmounts(rows,id){return [...new Set(rows.filter(x=>x.id===id).map(x=>x.amountEUR))];}
function contextHits(text,needle,limit=8,before=220,after=420){
  const out=[],lower=String(text||'').toLowerCase(),n=needle.toLowerCase();let p=0;
  while(out.length<limit){const i=lower.indexOf(n,p);if(i<0)break;out.push({needle,index:i,context:text.slice(Math.max(0,i-before),Math.min(text.length,i+n.length+after))});p=i+n.length;}
  return out;
}
function scriptSrcs(html){return [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],ORIGIN).href))];}
function inlineScripts(html){
  const out=[];let idx=0;
  for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){
    const attrs=m[1]||'',body=m[2]||'';
    if(/\bsrc\s*=/.test(attrs)||!body.trim())continue;
    const type=(attrs.match(/\btype=["']([^"']+)["']/i)||[])[1]||null;
    const id=(attrs.match(/\bid=["']([^"']+)["']/i)||[])[1]||null;
    out.push({index:idx++,type,id,bytes:body.length,sha256:sha(body),body});
  }
  return out;
}
function hrefs(html){return [...new Set([...html.matchAll(/<(?:link|a)[^>]+href=["']([^"']+)["']/gi)].map(m=>{try{return new URL(m[1],ORIGIN).href}catch{return m[1]}}))];}
function normalizeName(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function nameTokens(s){return normalizeName(s).split(/\s+/).filter(x=>x.length>=4&&!['bote','jackpot','online','juego','slots'].includes(x));}
function titleMatchesTarget(name,targetMeta){
  const n=normalizeName(name);if(!n)return false;
  return targetMeta.some(t=>{
    const candidates=[t.slug,t.title].filter(Boolean);
    return candidates.some(c=>{const toks=nameTokens(c);return toks.length>=1&&toks.filter(x=>n.includes(x)).length>=Math.min(2,toks.length);});
  });
}

const reset=fs.existsSync(RESET_FILE)?JSON.parse(fs.readFileSync(RESET_FILE,'utf8')):null;
const cms=fs.existsSync(CMS_FILE)?JSON.parse(fs.readFileSync(CMS_FILE,'utf8')):null;
const targetMeta=TARGETS.map(slug=>{
  const g=(cms?.games||[]).find(x=>x.slug===slug)||{};
  return {slug,title:g?.graphql?.contentfulGame?.title||g?.graphql?.pageOrGame?.title||null};
});

// Three close public snapshots are used only to test persistent co-amount aliases.
// They do not infer a game/tier and do not use rank-based identity.
const feedSnapshots=[];
for(let i=0;i<3;i++){
  const q=await gql(FEED_QUERY,{},'loadJackpots');
  const rows=feedRows(q.body);
  const pool=distinctAmounts(rows,TARGET_ID);
  const tracked={};
  for(const id of [TARGET_ID,...AMBIGUOUS_IDS,...RELATED_SPECIFIC_IDS])tracked[id]=distinctAmounts(rows,id);
  const poolUnique=pool.length===1;
  const coAmountIds=poolUnique?[...AMBIGUOUS_IDS,...RELATED_SPECIFIC_IDS].filter(id=>(tracked[id]||[]).some(v=>Math.round(v*100)===Math.round(pool[0]*100))):[];
  feedSnapshots.push({observedAt:new Date().toISOString(),httpStatus:q.httpStatus,pool1DistinctAmountsEUR:pool,pool1UniqueInSnapshot:poolUnique,tracked,coAmountIds});
  if(i<2)await sleep(1500);
}
const persistentCoAmountAliases=[...AMBIGUOUS_IDS,...RELATED_SPECIFIC_IDS].filter(id=>feedSnapshots.every(s=>s.pool1UniqueInSnapshot&&s.coAmountIds.includes(id)));

// Query only the exact public winners operation already recovered from Botemania's bundle.
const winners=[];
for(const venture of WINNER_VENTURES){
  const q=await gql(WINNERS_QUERY,{venture},'getWinners');
  const rows=Array.isArray(q.body?.data?.winners)?q.body.data.winners:[];
  winners.push({venture,httpStatus:q.httpStatus,errors:(q.body?.errors||[]).map(e=>e?.message||null).slice(0,5),winnerRows:rows.length,rows:rows.slice(0,100)});
}
const allWinnerRows=winners.flatMap(x=>x.rows.map(r=>({...r,_venture:x.venture})));
const baselineAt=reset?.baseline?.observedAt||reset?.baselineObservedAt||null;
const confirmedAt=reset?.confirmation?.confirmedAt||reset?.confirmedAt||null;
const baselineMs=baselineAt?Date.parse(baselineAt):NaN,confirmedMs=confirmedAt?Date.parse(confirmedAt):NaN;
const correlationStart=Number.isFinite(baselineMs)?baselineMs-30*60*1000:null;
const correlationEnd=Number.isFinite(confirmedMs)?confirmedMs+90*60*1000:null;
const resetDropEUR=finiteOrNull(reset?.confirmation?.dropEUR??reset?.dropEUR);
const winnerCorrelationRows=allWinnerRows.filter(r=>{
  const ts=Date.parse(r?.WinTimestamp||'');
  const inWindow=correlationStart!==null&&correlationEnd!==null&&Number.isFinite(ts)&&ts>=correlationStart&&ts<=correlationEnd;
  if(!inWindow)return false;
  const nameMatch=titleMatchesTarget(r?.GameProductSkinName,targetMeta);
  const amount=finiteOrNull(r?.WinAmount);
  const amountNearResetDrop=amount!==null&&resetDropEUR!==null&&Math.abs(amount-resetDropEUR)<=Math.max(1,resetDropEUR*0.05);
  return nameMatch||amountNearResetDrop;
}).map(r=>({...r,discoverySignals:{targetNameMatch:titleMatchesTarget(r?.GameProductSkinName,targetMeta),amountNearResetDrop:(finiteOrNull(r?.WinAmount)!==null&&resetDropEUR!==null&&Math.abs(finiteOrNull(r.WinAmount)-resetDropEUR)<=Math.max(1,resetDropEUR*0.05))}}));

// Hydration/bootstrap pass: same public pages as the closed CMS layer, but this time
// only configuration/runtime metadata are inspected. We do not repeat the old
// jackpot{id,amount} CMS queries and we never launch a game.
const pages=[];
for(const t of targetMeta){
  const pageUrl=`${ORIGIN}/juegos/slots-online/${t.slug}`;
  const p=await request(pageUrl,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const html=p.text||'';
  const inline=inlineScripts(html);
  const bootstrapContexts=[];
  for(const key of DISCOVERY_KEYS){
    const hits=contextHits(html,key,5);
    if(hits.length)bootstrapContexts.push(...hits);
  }
  const slugContexts=contextHits(html,t.slug,8);
  const inlineSignals=[];
  for(const s of inline){
    const keys=DISCOVERY_KEYS.filter(k=>s.body.toLowerCase().includes(k.toLowerCase()));
    const slugPresent=s.body.toLowerCase().includes(t.slug.toLowerCase());
    const providerPresent=/roxor-gaming|roxor/i.test(s.body);
    if(keys.length||slugPresent||providerPresent){
      inlineSignals.push({index:s.index,type:s.type,id:s.id,bytes:s.bytes,sha256:s.sha256,keys,slugPresent,providerPresent,contexts:[...keys.slice(0,6).flatMap(k=>contextHits(s.body,k,2)),...contextHits(s.body,t.slug,2)].slice(0,12)});
    }
  }
  pages.push({slug:t.slug,title:t.title,pageUrl,httpStatus:p.status,pageBytes:html.length,pageSha256:p.sha256,scripts:scriptSrcs(html),hrefs:hrefs(html),inlineScriptCount:inline.length,inlineSignals,bootstrapContexts:bootstrapContexts.slice(0,40),slugContexts:slugContexts.slice(0,8)});
}

const scriptFrequency=new Map();
for(const p of pages)for(const u of p.scripts)scriptFrequency.set(u,(scriptFrequency.get(u)||0)+1);
const commonScripts=[...scriptFrequency].filter(([,n])=>n===pages.length).map(([u])=>u);
const pageSpecificScriptUrls=[...scriptFrequency].filter(([,n])=>n<pages.length).map(([u,n])=>({url:u,pageCount:n})).filter(x=>{try{return new URL(x.url).host==='www.botemania.es'}catch{return false}}).slice(0,30);
const scriptEvidence=[];
for(const x of pageSpecificScriptUrls){
  const r=await request(x.url,{headers:{accept:'application/javascript,text/javascript,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const text=r.text||'';
  const matchedTargets=targetMeta.filter(t=>text.toLowerCase().includes(t.slug.toLowerCase())).map(t=>t.slug);
  const keys=DISCOVERY_KEYS.filter(k=>text.toLowerCase().includes(k.toLowerCase()));
  const exactPool1Literal=text.includes(TARGET_ID);
  const relevant=matchedTargets.length>0||keys.length>0||exactPool1Literal;
  scriptEvidence.push({url:x.url,pageCount:x.pageCount,httpStatus:r.status,bytes:text.length,sha256:r.sha256,matchedTargets,keys,exactPool1Literal,relevant,contexts:relevant?[...matchedTargets.slice(0,5).flatMap(t=>contextHits(text,t,2)),...keys.slice(0,8).flatMap(k=>contextHits(text,k,2)),...contextHits(text,TARGET_ID,3)].slice(0,25):[]});
}

const hydrationCandidates=[];
for(const p of pages){
  const strong=p.inlineSignals.filter(s=>s.slugPresent&&(s.keys.length>0||s.providerPresent));
  for(const s of strong)hydrationCandidates.push({slug:p.slug,source:'INLINE_SCRIPT',scriptIndex:s.index,keys:s.keys,providerPresent:s.providerPresent,contexts:s.contexts});
}
for(const s of scriptEvidence.filter(x=>x.matchedTargets.length&&x.keys.length))hydrationCandidates.push({source:'PAGE_SPECIFIC_EXTERNAL_SCRIPT',url:s.url,matchedTargets:s.matchedTargets,keys:s.keys,contexts:s.contexts});

const exactRuntimeGameIdentityRecovered=false; // no keyword/config context is allowed to auto-promote identity
const out={
  version:'botemania-pool1-runtime-hydration-correlation-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{network:'generic',id:TARGET_ID},
  priorEvidence:{resetFile:RESET_FILE,cmsClosureFile:CMS_FILE,baselineAt,confirmedAt,resetDropEUR,cmsLayerClosed:cms?.interpretation?.noMatchMeansPublicKnownFieldsExhaustedForTheseTargets===true},
  feedCorrelation:{snapshots:feedSnapshots,persistentCoAmountAliases,interpretation:'Persistent same-cent co-amount is alias-discovery evidence only. Ambiguous IDs remain quarantined and never become game/tier identity.'},
  winnerFeed:{venturesTested:WINNER_VENTURES,totalRows:allWinnerRows.length,results:winners.map(x=>({venture:x.venture,httpStatus:x.httpStatus,errors:x.errors,winnerRows:x.winnerRows})),correlationWindow:{start:correlationStart===null?null:new Date(correlationStart).toISOString(),end:correlationEnd===null?null:new Date(correlationEnd).toISOString()},correlationRows:winnerCorrelationRows,winnerFeedCanConfirmResetCause:false},
  hydration:{targetCount:pages.length,pages,commonScriptCount:commonScripts.length,commonScripts,pageSpecificScriptCount:pageSpecificScriptUrls.length,pageSpecificScriptsScanned:scriptEvidence.length,scriptEvidence,hydrationCandidates},
  decision:{exactRuntimeGameIdentityRecovered,exactRuntimeGameIdentity:null,persistentCoAmountAliasCandidateCount:persistentCoAmountAliases.length,winnerCorrelationCandidateCount:winnerCorrelationRows.length,hydrationCandidateCount:hydrationCandidates.length,nextStep:hydrationCandidates.length?'MANUAL_REVIEW_OF_EXACT_CONFIG_CONTEXTS_THEN_QUERY_ONLY_EXPLICITLY_RECOVERED_READ_ONLY_FIELDS':'RUNTIME_HYDRATION_LAYER_EXHAUSTED_FOR_PUBLIC_PAGE_BOOTSTRAP; MOVE_TO_PROVIDER_PUBLIC_HELP_OR_CONFIG_ASSET_DISCOVERY',economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicNoAuthOnly:true,noCookies:true,noGraphqlIntrospection:true,exactRecoveredWinnerQueryOnly:true,noCmsJackpotQueryRepeat:true,noGameLaunch:true,noSessionCreation:true,noMutation:true,noBetting:true,noRankBasedIdentity:true,ambiguousIdsRemainQuarantined:true,coAmountNeverAutoVerifiesIdentity:true,winnerCorrelationNeverAutoVerifiesIdentity:true,configKeywordHitNeverAutoVerifiesIdentity:true,nullNeverCoercedToZero:true,economicPromotionAllowed:false,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({priorEvidence:out.priorEvidence,feedCorrelation:{snapshots:feedSnapshots.map(s=>({observedAt:s.observedAt,pool1:s.pool1DistinctAmountsEUR,coAmountIds:s.coAmountIds})),persistentCoAmountAliases},winnerFeed:out.winnerFeed,hydration:{targetCount:pages.length,commonScriptCount:commonScripts.length,pageSpecificScriptCount:pageSpecificScriptUrls.length,pageSpecificScriptsScanned:scriptEvidence.length,hydrationCandidates},decision:out.decision,guards:out.guards},null,2));
