#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const VENTURE='botemania_es';
const REFERER='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-fishin-metadata-probe-v1.json';
const headers={accept:'application/json','content-type':'application/json',venture:VENTURE,referer:REFERER,origin:'https://www.botemania.es','user-agent':'loterias-ai-botemania-fishin-metadata-probe/1.0'};
async function gql(operationName,query,variables){
 const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName,query,variables})});
 const text=await r.text(); let body=null;try{body=JSON.parse(text);}catch{}
 return {httpStatus:r.status,sha256:crypto.createHash('sha256').update(text).digest('hex'),body,rawPreview:body?null:text.slice(0,500)};
}
const fields=`id title providerId customRegistrationUrl howToPlay jackpot { id amount }`;
const probes=[];
for(const [name,query,variables] of [
 ['contentfulGame',`query BotemaniaFishinContentful($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:'fishin-frenzy-jackpot-king'}],
 ['pageOrGameFullPath',`query BotemaniaFishinPage($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:'/juegos/slots-online/fishin-frenzy-jackpot-king'}],
 ['pageOrGameRelativePath',`query BotemaniaFishinPageRel($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:'slots-online/fishin-frenzy-jackpot-king'}]
]){
  try{const x=await gql(query.match(/query\s+(\w+)/)?.[1]||name,query,variables);probes.push({name,httpStatus:x.httpStatus,data:x.body?.data||null,errors:(x.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,10),responseSha256:x.sha256});}
  catch(e){probes.push({name,httpStatus:null,data:null,errors:[String(e?.message||e)]});}
}
const games=[];
for(const p of probes){const g=p.data?.contentfulGame||p.data?.pageOrGame?.game;if(g&&typeof g==='object')games.push({source:p.name,...g});}
const out={version:'botemania-fishin-metadata-probe-v1',generatedAt:new Date().toISOString(),endpoint:ENDPOINT,ventureHeader:VENTURE,gameSlug:'fishin-frenzy-jackpot-king',probes,games,decision:{metadataRecovered:games.length>0,exactSpainMbwbRecovered:false,realMoneyAllowed:false},guards:{publicGraphqlOnly:true,knownWebsiteFieldsOnly:true,noIntrospection:true,noAuthentication:true,noCookies:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({games,errors:probes.map(p=>({name:p.name,httpStatus:p.httpStatus,errors:p.errors})),decision:out.decision},null,2));