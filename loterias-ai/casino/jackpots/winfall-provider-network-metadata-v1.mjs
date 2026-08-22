#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/winfall-provider-network-metadata-v1.json';
export const TARGETS=['winfall-wishes-jackpot','wonderland','tiki-templo'];
export const CONTROLS=['paper-wins-jackpot','bote-de-secretos-del-fenix'];
const ALL=[...TARGETS,...CONTROLS];
const UA='loterias-ai-winfall-provider-network-metadata/1.1-correct-tiki-templo';
const STRONG_KEY_RE=/(network|pool|group|resource|game.?code|provider.?game|product.?id|progressive.?id|jackpot.?id)/i;
const SEMANTIC_KEY_RE=/(network|pool|group|resource|game.?code|provider.?game|product|progressive|jackpot|provider|game.?id)/i;
const STOP_VALUES=new Set(['true','false','null','undefined','roxor-gaming','roxor gaming','jackpot','progressive','game','games']);
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');
const normalize=v=>String(v??'').trim().toLowerCase();

async function request(url,opts={}){
  try{const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(10000)});const text=await r.text();return{status:r.status,text,sha256:sha(text),error:null};}
  catch(e){return{status:null,text:'',sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gql(referer,query,variables){
  const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({query,variables})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  return{httpStatus:r.status,body,error:r.error,responseSha256:r.sha256};
}

export function findStateObjects(html){
  const markers=['__NEXT_DATA__','__APOLLO_STATE__','__INITIAL_STATE__','__PRELOADED_STATE__'];
  const hits=[];
  for(const marker of markers){
    let from=0;
    while(hits.length<12){
      const idx=String(html||'').indexOf(marker,from);if(idx<0)break;from=idx+marker.length;
      const look=html.slice(idx,Math.min(html.length,idx+300));const brace=look.indexOf('{');if(brace<0)continue;
      const start=idx+brace;let depth=0,inString=false,escape=false,end=-1;
      for(let i=start;i<html.length&&i-start<400000;i++){
        const ch=html[i];
        if(inString){if(escape){escape=false;continue;}if(ch==='\\'){escape=true;continue;}if(ch==='"')inString=false;continue;}
        if(ch==='"'){inString=true;continue;}if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
      }
      if(end<0)continue;const raw=html.slice(start,end);let parsed=null;try{parsed=JSON.parse(raw)}catch{};hits.push({marker,index:idx,bytes:raw.length,parsed});
    }
  }
  return hits;
}

export function extractSemanticPrimitives(value,p='$',out=[],depth=0){
  if(depth>18||out.length>=1000)return out;
  if(Array.isArray(value)){value.forEach((x,i)=>extractSemanticPrimitives(x,`${p}[${i}]`,out,depth+1));return out;}
  if(value&&typeof value==='object')for(const [k,x] of Object.entries(value)){
    const next=`${p}.${k}`;
    if(x&&typeof x==='object')extractSemanticPrimitives(x,next,out,depth+1);
    else if(SEMANTIC_KEY_RE.test(next)&&x!==null&&x!==undefined){const raw=String(x);if(raw.length<=500)out.push({path:next,key:k,value:raw,strongKey:STRONG_KEY_RE.test(k)||STRONG_KEY_RE.test(next)});}
  }
  return out;
}

function metadataPrimitives(g={}){
  const out=[];
  for(const k of ['id','link','providerId','authorName','categoryId','subCategoryId','imageSlug','customRegistrationUrl']){const v=g?.[k];if(v!==null&&v!==undefined&&String(v).trim())out.push({path:`$.metadata.${k}`,key:k,value:String(v),strongKey:STRONG_KEY_RE.test(k)});}
  for(const [i,v] of (Array.isArray(g?.imageVariants)?g.imageVariants:[]).entries())if(typeof v==='string'&&v)out.push({path:`$.metadata.imageVariants[${i}]`,key:'imageVariants',value:v,strongKey:false});
  return out;
}

export function compareSharedSemantic(rows,{targets=TARGETS,controls=CONTROLS}={}){
  const bySlug=new Map(rows.map(r=>[r.slug,r]));
  const targetSets=targets.map(s=>new Set((bySlug.get(s)?.semantic||[]).map(x=>normalize(x.value)).filter(Boolean)));
  if(targetSets.some(s=>s.size===0))return[];
  const common=[...targetSets[0]].filter(v=>targetSets.slice(1).every(s=>s.has(v)));
  const controlValues=new Set(controls.flatMap(s=>(bySlug.get(s)?.semantic||[]).map(x=>normalize(x.value))));
  const candidates=[];
  for(const v of common){
    if(controlValues.has(v)||v.length<4||STOP_VALUES.has(v))continue;
    const evidence=targets.map(slug=>({slug,matches:(bySlug.get(slug)?.semantic||[]).filter(x=>normalize(x.value)===v).map(x=>({path:x.path,key:x.key,strongKey:x.strongKey}))}));
    if(evidence.every(e=>e.matches.some(m=>m.strongKey)))candidates.push({value:v,evidence});
  }
  return candidates;
}

export async function runProbe(){
  const rows=[];
  const fields='id title link providerId authorName categoryId subCategoryId imageSlug imageVariants customRegistrationUrl jackpot { id amount }';
  for(const slug of ALL){
    const pageUrl=`${ORIGIN}/juegos/slots-online/${slug}`;
    const [page,c,p]=await Promise.all([
      request(pageUrl,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}}),
      gql(pageUrl,`query M($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:slug}),
      gql(pageUrl,`query P($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:`/juegos/slots-online/${slug}`})
    ]);
    const cg=c.body?.data?.contentfulGame||null,pg=p.body?.data?.pageOrGame?.game||null,metadata=cg||pg||{};
    const blobs=findStateObjects(page.text),semantic=[...metadataPrimitives(metadata)];
    for(const b of blobs)if(b.parsed)semantic.push(...extractSemanticPrimitives(b.parsed).map(x=>({...x,sourceMarker:b.marker})));
    rows.push({slug,role:TARGETS.includes(slug)?'TARGET':'CONTROL',page:{httpStatus:page.status,sha256:page.sha256,bytes:page.text.length},graphql:{contentfulHttpStatus:c.httpStatus,pageOrGameHttpStatus:p.httpStatus,contentfulErrors:(c.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),pageOrGameErrors:(p.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5)},metadata:{id:metadata.id??null,title:metadata.title??null,link:metadata.link??null,providerId:metadata.providerId??null,authorName:metadata.authorName??null,categoryId:metadata.categoryId??null,subCategoryId:metadata.subCategoryId??null,imageSlug:metadata.imageSlug??null,imageVariants:Array.isArray(metadata.imageVariants)?metadata.imageVariants:[],customRegistrationUrl:metadata.customRegistrationUrl??null,jackpot:metadata.jackpot??null},hydration:{blobCount:blobs.length,parsedBlobCount:blobs.filter(b=>b.parsed).length,markers:blobs.map(b=>b.marker),semanticPrimitiveCount:semantic.length},semantic});
  }
  const targetProviders=[...new Set(rows.filter(r=>r.role==='TARGET').map(r=>r.metadata.providerId).filter(Boolean))],controlsProviders=[...new Set(rows.filter(r=>r.role==='CONTROL').map(r=>r.metadata.providerId).filter(Boolean))];
  const sharedStrongCandidates=compareSharedSemantic(rows),coverage={expectedPages:ALL.length,http200Pages:rows.filter(r=>r.page.httpStatus===200).length,metadataRecovered:rows.filter(r=>r.metadata.id||r.metadata.providerId).length,allComplete:rows.every(r=>r.page.httpStatus===200&&r.graphql.contentfulHttpStatus===200&&r.graphql.pageOrGameHttpStatus===200)};
  const out={version:'winfall-provider-network-metadata-v1.1-correct-tiki-templo',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:{targets:TARGETS,controls:CONTROLS,operatorRuleTextNamesPartner:'La Isla de Tiki Templo',resolvedBotemaniaSlug:'tiki-templo'},coverage,providerComparison:{targetProviders,controlsProviders,providerExclusiveToTargets:targetProviders.filter(x=>!controlsProviders.includes(x))},rows,comparison:{sharedStrongTargetOnlySemanticCandidates:sharedStrongCandidates},decision:{providerFamilyVerified:targetProviders.length===1&&targetProviders[0]==='roxor-gaming',sharedNetworkConfigCandidate:sharedStrongCandidates.length===1?sharedStrongCandidates[0].value:null,sharedNetworkConfigVerified:false,exactLiveIdVerified:false,nextStep:sharedStrongCandidates.length===1?'REPLICATE_SHARED_METADATA_SIGNATURE_AND_CONNECT_TO_LIVE_FEED_WITH_INDEPENDENT_EVIDENCE':coverage.allComplete?'NO_EXCLUSIVE_STRONG_NETWORK_METADATA_VALUE_WITH_CORRECT_TIKI_TEMPLO_TARGET; MOVE_TO_CORRECTED_PASSIVE_NETWORK_OR_PROSPECTIVE_RESET_CORRELATION':'INCOMPLETE_METADATA_COVERAGE_RETRY_WITHOUT_NEGATIVE',economicPromotionAllowed:false,realMoneyAllowed:false},guards:{correctTikiTemploSlugFrozenBeforeRun:true,laIslaDeTikiNeverUsedAsSharedPartner:true,knownGraphqlFieldsOnly:true,noIntrospection:true,noAuthentication:true,noCookies:true,noMutation:true,noGameLaunch:true,noBetting:true,providerIdAloneNeverIdentity:true,controlProviderOverlapExcluded:true,onlyStrongSemanticKeysEligibleForNetworkCandidate:true,singleRunNeverVerifiesNetworkConfig:true,noLiveIdFromMetadataWithoutIndependentBinding:true,realMoneyAllowed:false}};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({coverage,providerComparison:out.providerComparison,candidates:sharedStrongCandidates,decision:out.decision},null,2));return out;
}

const isEntrypoint=Boolean(process.argv[1])&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isEntrypoint)await runProbe();
