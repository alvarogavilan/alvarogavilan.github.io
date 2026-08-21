#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-provider-public-assets-v1.json';
const TARGET_ID='pool1';
const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki','boteman','paper-wins-jackpot','la-isla-de-tiki-bote','winstones-bote','la-isla-de-tiki-tropico-dorado','bote-de-secretos-del-fenix','duble-buble-bote-triple'];
const UA='loterias-ai-pool1-provider-public-assets/1.0';
const SAFE_ASSET_RE=/(rule|rules|help|info|manual|paytable|pay-table|jackpot|progressive|how[-_ ]?to[-_ ]?play|terms|feature)/i;
const FORBIDDEN_RE=/(launch|session|token|auth|login|wallet|deposit|withdraw|realplay|real-play|playgame|game-launch)/i;
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

async function request(url,opts={}){
  try{
    const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,contentType:r.headers.get('content-type'),sha256:sha(text),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',contentType:null,sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gql(query,variables={},referer=`${ORIGIN}/juegos/todos-los-juegos`){
  const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({query,variables})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  return {httpStatus:r.status,body,error:r.error};
}
function urlsFrom(text,base){
  const out=new Set();
  for(const m of String(text||'').matchAll(/https?:\/\/[^\s"'<>]+|(?:href|src)=["']([^"']+)["']/gi)){
    const raw=m[1]||m[0];
    try{const u=new URL(raw.replace(/&amp;/g,'&'),base);u.hash='';out.add(u.href);}catch{}
  }
  return [...out];
}
function pctContexts(text){
  const raw=String(text||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),out=[];
  for(const m of raw.matchAll(/\b\d{1,3}(?:[.,]\d{1,4})?\s*%/g)){
    out.push({value:m[0],context:raw.slice(Math.max(0,m.index-180),Math.min(raw.length,m.index+m[0].length+260))});
    if(out.length>=20)break;
  }
  return out;
}
function keywordContexts(text,terms){
  const raw=String(text||''),low=raw.toLowerCase(),out=[];
  for(const term of terms){let p=0;while(out.length<30){const i=low.indexOf(term.toLowerCase(),p);if(i<0)break;out.push({term,context:raw.slice(Math.max(0,i-180),Math.min(raw.length,i+term.length+300))});p=i+term.length;}}
  return out;
}
function sameGameSignal(text,slug,title){
  const n=norm(text),parts=[slug,title].filter(Boolean).map(norm).filter(Boolean);
  return parts.some(x=>x&&n.includes(x)) || (title?norm(title).split(' ').filter(x=>x.length>=5).filter(x=>n.includes(x)).length>=2:false);
}

const pages=[];
const providerCounts=new Map();
for(const slug of TARGETS){
  const pageUrl=`${ORIGIN}/juegos/slots-online/${slug}`;
  const fields='id title providerId howToPlay';
  const [content,pageOrGame,page]=await Promise.all([
    gql(`query G($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:slug},pageUrl),
    gql(`query P($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:`/juegos/slots-online/${slug}`},pageUrl),
    request(pageUrl,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}})
  ]);
  const a=content.body?.data?.contentfulGame||null,b=pageOrGame.body?.data?.pageOrGame?.game||null;
  const providerId=a?.providerId||b?.providerId||null,title=a?.title||b?.title||null;
  if(providerId)providerCounts.set(providerId,(providerCounts.get(providerId)||0)+1);
  const how=[a?.howToPlay,b?.howToPlay].filter(Boolean).join('\n');
  const allUrls=[...new Set([...urlsFrom(how,pageUrl),...urlsFrom(page.text,pageUrl)])];
  const candidateUrls=allUrls.filter(u=>SAFE_ASSET_RE.test(u)&&!FORBIDDEN_RE.test(u)).slice(0,20);
  pages.push({slug,title,providerId,pageUrl,httpStatus:page.status,contentfulHttpStatus:content.httpStatus,pageOrGameHttpStatus:pageOrGame.httpStatus,howToPlayPresent:Boolean(how.trim()),howToPlaySha256:how?sha(how):null,howToPlayPool1Literal:how.toLowerCase().includes(TARGET_ID),howToPlayPctContexts:pctContexts(how),howToPlayKeywordContexts:keywordContexts(how,['reinicia','restablece','compartido','progresivo','progressive','jackpot','bote','semilla','seed']).slice(0,20),candidateUrls});
}

const uniqueCandidates=[];
for(const p of pages)for(const u of p.candidateUrls)if(!uniqueCandidates.some(x=>x.url===u))uniqueCandidates.push({url:u,sourceSlugs:[p.slug]});else uniqueCandidates.find(x=>x.url===u).sourceSlugs.push(p.slug);
const fetched=[];
for(const c of uniqueCandidates.slice(0,40)){
  if(FORBIDDEN_RE.test(c.url))continue;
  const r=await request(c.url,{headers:{accept:'text/html,application/pdf,text/plain,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const body=String(r.text||'');
  const relatedPages=pages.filter(p=>c.sourceSlugs.includes(p.slug));
  const exactPool1Literal=body.toLowerCase().includes(TARGET_ID);
  const gameSignals=relatedPages.filter(p=>sameGameSignal(body,p.slug,p.title)).map(p=>p.slug);
  fetched.push({url:c.url,sourceSlugs:c.sourceSlugs,httpStatus:r.status,finalUrl:r.url,contentType:r.contentType,bytes:body.length,sha256:r.sha256,exactPool1Literal,gameSignals,pctContexts:pctContexts(body).slice(0,12),keywordContexts:keywordContexts(body,['pool1','reset','reinicia','restablece','seed','semilla','jackpot','progressive','progresivo']).slice(0,16)});
}
const exactPool1Assets=fetched.filter(x=>x.exactPool1Literal);
const pool1AndGameAssets=exactPool1Assets.filter(x=>x.gameSignals.length>0);
const providerSummary=[...providerCounts.entries()].map(([providerId,gameCount])=>({providerId,gameCount,slugs:pages.filter(p=>p.providerId===providerId).map(p=>p.slug)}));
const out={version:'botemania-pool1-provider-public-assets-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{network:'generic',id:TARGET_ID},coverage:{targetCount:TARGETS.length,pageMetadataHttp200Count:pages.filter(p=>p.httpStatus===200&&p.contentfulHttpStatus===200&&p.pageOrGameHttpStatus===200).length,providerResolvedCount:pages.filter(p=>p.providerId).length,uniqueProviderCount:providerSummary.length,candidatePublicAssetCount:uniqueCandidates.length,fetchedPublicAssetCount:fetched.length},providerSummary,pages,assets:fetched,discovery:{exactPool1AssetCount:exactPool1Assets.length,pool1AndSameGameAssetCount:pool1AndGameAssets.length,pool1AndSameGameAssets:pool1AndGameAssets.map(x=>({url:x.url,sourceSlugs:x.sourceSlugs,gameSignals:x.gameSignals}))},decision:{exactGameIdentityRecovered:false,providerAssetIdentityVerified:false,providerAssetDiscoveryFound:pool1AndGameAssets.length>0,nextStep:pool1AndGameAssets.length?'REPLICATE_ONLY_POOL1_PLUS_GAME_PROVIDER_ASSETS_AND_VERIFY_SEMANTICS':'NO_PUBLIC_PROVIDER_RULE_HELP_ASSET_BINDS_POOL1_TO_THESE_10_GAMES; RETURN_POOL1_TO_UNMAPPED_WATCH_AND_PRIORITIZE_OTHER_LANES',economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicNoAuthOnly:true,noClosedJackpotCmsFieldsRepeated:true,noLogin:true,noCookies:true,noMutation:true,noGameLaunch:true,noSessionCreation:true,noForbiddenLaunchLikeUrlsFetched:true,providerIdIsMetadataNotIdentity:true,ruleKeywordNeverVerifiesIdentity:true,pool1LiteralAloneNeverVerifiesIdentity:true,pool1PlusGameAssetRequiresIndependentReplication:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({coverage:out.coverage,providerSummary,discovery:out.discovery,decision:out.decision,pages:pages.map(p=>({slug:p.slug,title:p.title,providerId:p.providerId,candidateUrls:p.candidateUrls})),assets:fetched.map(x=>({url:x.url,sourceSlugs:x.sourceSlugs,httpStatus:x.httpStatus,contentType:x.contentType,bytes:x.bytes,exactPool1Literal:x.exactPool1Literal,gameSignals:x.gameSignals}))},null,2));
