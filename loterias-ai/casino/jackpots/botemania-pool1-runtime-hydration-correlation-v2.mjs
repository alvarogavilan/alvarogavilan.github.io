#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-runtime-hydration-correlation-v2.json';
const RESET_FILE='loterias-ai/casino/jackpots/evidence/botemania-pool1-reset-confirm-v1.json';
const CMS_FILE='loterias-ai/casino/jackpots/evidence/botemania-pool1-zero-reset-game-map-v1.json';
const UA='loterias-ai-pool1-runtime-hydration-correlation/2.0';
const TARGET_ID='pool1';
const FEED_QUERY='query loadJackpots { jackpots { id amount } }';
const WINNERS_QUERY=`query getWinners($venture: String) { winners(venture: $venture) { LocaleName WinAmount GameProductSkinName ProductType PrimaryHardwareType WinTimestamp } }`;
const WINNER_VENTURES=['botemania_es','botemania','BOTEMANIA','BOTEMANIA_ES'];
const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki','boteman','paper-wins-jackpot','la-isla-de-tiki-bote','winstones-bote','la-isla-de-tiki-tropico-dorado','bote-de-secretos-del-fenix','duble-buble-bote-triple'];
const AMBIGUOUS_IDS=['JACKPOT','JackpotPool','progressive_id1'];
const RELATED_SPECIFIC_IDS=['bouncy_bubbles_id','classicwildsprogressive','diamondbonanza25BTM','DealOrNoDealStateful3','tikitemple2_1','progressivealice1','WAGER_BET'];
const STRONG_RUNTIME_KEYS=['resourceId','resourceID','gameCode','gameSkin','productSkin','launchUrl','launchURL','launchGame','gameLaunch','iframeUrl','iframeURL','playUrl','playURL','realPlay','demoPlay','gameSession','sessionToken','jackpotId','jackpotsParams'];
const WEAK_CMS_KEYS=['gameId','gameID','providerId','providerID','gameFeatures'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const finiteOrNull=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

async function request(url,opts={}){
  try{
    const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,sha256:sha(text),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gql(query,variables={},operationName=null,referer=`${ORIGIN}/`){
  const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName,variables,query})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  return {httpStatus:r.status,ok:r.ok,body,error:r.error,bytes:r.text.length,sha256:r.sha256};
}
function feedRows(body){return (body?.data?.jackpots||[]).map(x=>({id:String(x?.id??'').trim(),amountEUR:finiteOrNull(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);}
function distinctAmounts(rows,id){return [...new Set(rows.filter(x=>x.id===id).map(x=>x.amountEUR))];}
function contextHits(text,needle,limit=5,before=180,after=320){
  const out=[],raw=String(text||''),lower=raw.toLowerCase(),n=needle.toLowerCase();let p=0;
  while(out.length<limit){const i=lower.indexOf(n,p);if(i<0)break;out.push({needle,index:i,context:raw.slice(Math.max(0,i-before),Math.min(raw.length,i+n.length+after))});p=i+n.length;}
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
function normalizeName(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function nameTokens(s){return normalizeName(s).split(/\s+/).filter(x=>x.length>=4&&!['bote','jackpot','online','juego','slots'].includes(x));}
function titleMatchesTarget(name,targetMeta){
  const n=normalizeName(name);if(!n)return false;
  return targetMeta.some(t=>[t.slug,t.title].filter(Boolean).some(c=>{const toks=nameTokens(c);return toks.length>=1&&toks.filter(x=>n.includes(x)).length>=Math.min(2,toks.length);}));
}
function normalizeResetEvidence(reset){
  const baselineAt=reset?.baseline?.observedAt||null;
  const baselineEUR=finiteOrNull(reset?.baseline?.amountEUR);
  const samples=Array.isArray(reset?.confirmationSamples)?reset.confirmationSamples:[];
  const validSampleTimes=samples.map(s=>Date.parse(s?.observedAt||'')).filter(Number.isFinite);
  const confirmedAt=validSampleTimes.length?new Date(Math.max(...validSampleTimes)).toISOString():null;
  const postResetUpperBoundEUR=finiteOrNull(reset?.transition?.currentMaxEUR);
  let dropEUR=finiteOrNull(reset?.transition?.dropEUR);
  if(dropEUR===null&&baselineEUR!==null&&postResetUpperBoundEUR!==null)dropEUR=baselineEUR-postResetUpperBoundEUR;
  const dropFraction=finiteOrNull(reset?.transition?.dropFraction);
  const valid=Boolean(
    reset?.inference?.meterResetConfirmed===true &&
    reset?.transition?.classification==='CONFIRMED_RESET_OF_STABLE_FEED_ID' &&
    reset?.baseline?.identityExact===true &&
    baselineAt && confirmedAt && baselineEUR!==null && dropEUR!==null && dropEUR>0 &&
    samples.length>=2 && samples.every(s=>s?.uniqueIdentityInSnapshot===true)
  );
  return {valid,baselineAt,confirmedAt,baselineEUR,postResetUpperBoundEUR,dropEUR,dropFraction,confirmationSampleCount:samples.length,sourceClassification:reset?.transition?.classification||null};
}
function jackpotRefs(text){
  const refs=[...String(text||'').matchAll(/JackPotType:([^"\\,}]*)/g)].map(m=>String(m[1]||'').trim());
  return [...new Set(refs)];
}

const reset=fs.existsSync(RESET_FILE)?JSON.parse(fs.readFileSync(RESET_FILE,'utf8')):null;
const resetMeta=normalizeResetEvidence(reset);
if(!resetMeta.valid)throw new Error('confirmed pool1 reset evidence did not normalize to a valid bounded window');
const cms=fs.existsSync(CMS_FILE)?JSON.parse(fs.readFileSync(CMS_FILE,'utf8')):null;
const targetMeta=TARGETS.map(slug=>{const g=(cms?.games||[]).find(x=>x.slug===slug)||{};return {slug,title:g?.graphql?.contentfulGame?.title||g?.graphql?.pageOrGame?.title||null};});

const feedSnapshots=[];
for(let i=0;i<3;i++){
  const q=await gql(FEED_QUERY,{},'loadJackpots');
  const rows=feedRows(q.body),pool=distinctAmounts(rows,TARGET_ID),tracked={};
  for(const id of [TARGET_ID,...AMBIGUOUS_IDS,...RELATED_SPECIFIC_IDS])tracked[id]=distinctAmounts(rows,id);
  const poolUnique=pool.length===1;
  const coAmountIds=poolUnique?[...AMBIGUOUS_IDS,...RELATED_SPECIFIC_IDS].filter(id=>(tracked[id]||[]).some(v=>Math.round(v*100)===Math.round(pool[0]*100))):[];
  feedSnapshots.push({observedAt:new Date().toISOString(),httpStatus:q.httpStatus,pool1DistinctAmountsEUR:pool,pool1UniqueInSnapshot:poolUnique,tracked,coAmountIds});
  if(i<2)await sleep(1500);
}
const persistentCoAmountAliases=[...AMBIGUOUS_IDS,...RELATED_SPECIFIC_IDS].filter(id=>feedSnapshots.every(s=>s.pool1UniqueInSnapshot&&s.coAmountIds.includes(id)));

const winners=[];
for(const venture of WINNER_VENTURES){
  const q=await gql(WINNERS_QUERY,{venture},'getWinners');
  const rows=Array.isArray(q.body?.data?.winners)?q.body.data.winners:[];
  winners.push({venture,httpStatus:q.httpStatus,errors:(q.body?.errors||[]).map(e=>e?.message||null).slice(0,5),rows:rows.slice(0,100)});
}
const allWinnerRows=winners.flatMap(x=>x.rows.map(r=>({...r,_venture:x.venture})));
const baselineMs=Date.parse(resetMeta.baselineAt),confirmedMs=Date.parse(resetMeta.confirmedAt);
const correlationStart=baselineMs-30*60*1000,correlationEnd=confirmedMs+90*60*1000;
const winnerCorrelationRows=allWinnerRows.filter(r=>{
  const ts=Date.parse(r?.WinTimestamp||'');if(!Number.isFinite(ts)||ts<correlationStart||ts>correlationEnd)return false;
  const amount=finiteOrNull(r?.WinAmount);
  return titleMatchesTarget(r?.GameProductSkinName,targetMeta)||(amount!==null&&Math.abs(amount-resetMeta.dropEUR)<=Math.max(1,resetMeta.dropEUR*0.05));
}).map(r=>({...r,discoveryOnly:true}));

const pages=[];
for(const t of targetMeta){
  const pageUrl=`${ORIGIN}/juegos/slots-online/${t.slug}`;
  const p=await request(pageUrl,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const html=p.text||'',inline=inlineScripts(html),inlineRows=[];
  for(const s of inline){
    const slugPresent=s.body.toLowerCase().includes(t.slug.toLowerCase());
    const strongKeys=STRONG_RUNTIME_KEYS.filter(k=>s.body.toLowerCase().includes(k.toLowerCase()));
    const weakKeys=WEAK_CMS_KEYS.filter(k=>s.body.toLowerCase().includes(k.toLowerCase()));
    const refs=jackpotRefs(s.body);
    const exactPool1Literal=s.body.includes(TARGET_ID);
    if(slugPresent||strongKeys.length||exactPool1Literal){
      inlineRows.push({index:s.index,type:s.type,id:s.id,bytes:s.bytes,sha256:s.sha256,slugPresent,strongKeys,weakKeys,jackpotEntitySuffixes:refs,exactPool1Literal,strongContexts:[...strongKeys.flatMap(k=>contextHits(s.body,k,2)),...contextHits(s.body,TARGET_ID,2)].slice(0,16)});
    }
  }
  const pageJackpotRefs=[...new Set(inlineRows.flatMap(x=>x.jackpotEntitySuffixes))];
  const strongInlineSignals=inlineRows.filter(x=>x.slugPresent&&(x.strongKeys.length>0||x.exactPool1Literal));
  pages.push({slug:t.slug,title:t.title,pageUrl,httpStatus:p.status,pageBytes:html.length,pageSha256:p.sha256,scripts:scriptSrcs(html),pageJackpotEntitySuffixes:pageJackpotRefs,allJackpotEntityRefsNullOrEmpty:pageJackpotRefs.length===0||pageJackpotRefs.every(x=>x===''||x==='null'),exactPool1LiteralInHydration:inlineRows.some(x=>x.exactPool1Literal),strongInlineSignals});
}

const scriptFrequency=new Map();for(const p of pages)for(const u of p.scripts)scriptFrequency.set(u,(scriptFrequency.get(u)||0)+1);
const commonScripts=[...scriptFrequency].filter(([,n])=>n===pages.length).map(([u])=>u);
const pageSpecific=[...scriptFrequency].filter(([,n])=>n<pages.length).map(([url,pageCount])=>({url,pageCount})).filter(x=>{try{return new URL(x.url).host==='www.botemania.es'}catch{return false}}).slice(0,30);
const strongExternalSignals=[];
for(const x of pageSpecific){
  const r=await request(x.url,{headers:{accept:'application/javascript,text/javascript,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}}),text=r.text||'';
  const matchedTargets=targetMeta.filter(t=>text.toLowerCase().includes(t.slug.toLowerCase())).map(t=>t.slug);
  const strongKeys=STRONG_RUNTIME_KEYS.filter(k=>text.toLowerCase().includes(k.toLowerCase()));
  const exactPool1Literal=text.includes(TARGET_ID);
  if(matchedTargets.length&&(strongKeys.length||exactPool1Literal))strongExternalSignals.push({url:x.url,pageCount:x.pageCount,httpStatus:r.status,bytes:text.length,sha256:r.sha256,matchedTargets,strongKeys,exactPool1Literal,contexts:[...strongKeys.flatMap(k=>contextHits(text,k,2)),...contextHits(text,TARGET_ID,2)].slice(0,20)});
}
const strongInlineSignals=pages.flatMap(p=>p.strongInlineSignals.map(s=>({slug:p.slug,...s})));
const exactPool1InHydration=pages.some(p=>p.exactPool1LiteralInHydration);
const allTargetJackpotRefsNullOrEmpty=pages.every(p=>p.allJackpotEntityRefsNullOrEmpty);
const meaningfulRuntimeCandidateCount=strongInlineSignals.length+strongExternalSignals.length;
const staticHydrationLayerExhausted=!exactPool1InHydration&&allTargetJackpotRefsNullOrEmpty&&meaningfulRuntimeCandidateCount===0;

const out={
  version:'botemania-pool1-runtime-hydration-correlation-v2',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{network:'generic',id:TARGET_ID},
  priorEvidence:{resetFile:RESET_FILE,cmsClosureFile:CMS_FILE,resetMeta,cmsLayerClosed:cms?.interpretation?.noMatchMeansPublicKnownFieldsExhaustedForTheseTargets===true},
  feedCorrelation:{snapshots:feedSnapshots,persistentCoAmountAliases,interpretation:'Persistent same-cent co-amount is alias discovery only. Ambiguous IDs remain quarantined.'},
  winnerFeed:{venturesTested:WINNER_VENTURES,totalRows:allWinnerRows.length,results:winners.map(x=>({venture:x.venture,httpStatus:x.httpStatus,errors:x.errors,winnerRows:x.rows.length})),correlationWindow:{start:new Date(correlationStart).toISOString(),end:new Date(correlationEnd).toISOString()},correlationRows:winnerCorrelationRows,winnerFeedCanConfirmResetCause:false},
  hydration:{targetCount:pages.length,pages,commonScriptCount:commonScripts.length,pageSpecificScriptCount:pageSpecific.length,pageSpecificScriptsScanned:pageSpecific.length,strongInlineSignals,strongExternalSignals,exactPool1InHydration,allTargetJackpotRefsNullOrEmpty,meaningfulRuntimeCandidateCount,staticHydrationLayerExhausted},
  decision:{exactRuntimeGameIdentityRecovered:false,exactRuntimeGameIdentity:null,persistentCoAmountAliasCandidateCount:persistentCoAmountAliases.length,winnerCorrelationCandidateCount:winnerCorrelationRows.length,meaningfulRuntimeCandidateCount,staticHydrationLayerExhausted,nextStep:staticHydrationLayerExhausted?'BOUNDED_HEADLESS_RENDERED_DOM_ON_SAME_10_PUBLIC_PAGES':'REVIEW_ONLY_STRONG_RUNTIME_CONTEXTS_BEFORE_ANY_NEW_READ_ONLY_QUERY',economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{resetWindowMustNormalize:true,publicNoAuthOnly:true,noCookies:true,noGraphqlIntrospection:true,exactRecoveredWinnerQueryOnly:true,noCmsJackpotQueryRepeat:true,noGameLaunch:true,noSessionCreation:true,noMutation:true,noBetting:true,noRankBasedIdentity:true,ambiguousIdsRemainQuarantined:true,coAmountNeverAutoVerifiesIdentity:true,winnerCorrelationNeverAutoVerifiesIdentity:true,weakCmsHydrationNeverCountsAsRuntimeCandidate:true,nullNeverCoercedToZero:true,economicPromotionAllowed:false,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({priorEvidence:out.priorEvidence,feedCorrelation:{snapshots:feedSnapshots.map(s=>({observedAt:s.observedAt,pool1:s.pool1DistinctAmountsEUR,coAmountIds:s.coAmountIds})),persistentCoAmountAliases},winnerFeed:out.winnerFeed,hydration:{targetCount:pages.length,commonScriptCount:commonScripts.length,pageSpecificScriptCount:pageSpecific.length,strongInlineSignals,strongExternalSignals,exactPool1InHydration,allTargetJackpotRefsNullOrEmpty,meaningfulRuntimeCandidateCount,staticHydrationLayerExhausted},decision:out.decision},null,2));
