#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const VENTURE='botemania_es';
const SLUG='irish-riches-megaways-jackpot-king';
const REFERER=`https://www.botemania.es/juegos/slots-online/${SLUG}`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-irish-metadata-probe-v1.json';
const headers={accept:'application/json','content-type':'application/json',venture:VENTURE,referer:REFERER,origin:'https://www.botemania.es','user-agent':'loterias-ai-botemania-irish-metadata-probe/1.0'};
async function gql(operationName,query,variables){const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName,query,variables})});const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{};return{httpStatus:r.status,body,sha256:crypto.createHash('sha256').update(text).digest('hex'),rawPreview:body?null:text.slice(0,500)}}
const fields=`id title link providerId authorName categoryId subCategoryId imageSlug imageVariants customRegistrationUrl howToPlay jackpot { id amount }`;
const specs=[
 ['contentfulGame',`query BotemaniaIrishContentful($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:SLUG}],
 ['pageOrGameFullPath',`query BotemaniaIrishPage($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:`/juegos/slots-online/${SLUG}`}],
 ['pageOrGameRelativePath',`query BotemaniaIrishPageRel($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:`slots-online/${SLUG}`}]
];
const probes=[];for(const [name,query,variables] of specs){try{const x=await gql(query.match(/query\s+(\w+)/)?.[1]||name,query,variables);probes.push({name,httpStatus:x.httpStatus,data:x.body?.data||null,errors:(x.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,10),responseSha256:x.sha256});}catch(e){probes.push({name,httpStatus:null,data:null,errors:[String(e?.message||e)]});}}
const games=[];for(const p of probes){const g=p.data?.contentfulGame||p.data?.pageOrGame?.game;if(g&&typeof g==='object')games.push({source:p.name,...g});}
const page=await fetch(REFERER,{headers:{accept:'text/html,*/*','user-agent':'loterias-ai-botemania-irish-metadata-probe/1.0','cache-control':'no-cache'},redirect:'follow'});const html=await page.text();
const urls=[...new Set([...html.matchAll(/https?:\\?\/?\\?\/?[^"'<>\s]+/g)].map(m=>m[0].replace(/\\u0026/g,'&').replace(/\\\//g,'/')).filter(x=>/blueprint|fileservice|game|launch/i.test(x)))].slice(0,100);
const paramHints=[];for(const re of [/(?:gameEngineID|gameEngineId|profile|customer|providerId|gameId)["'\\\s:=]+([A-Za-z0-9_.-]{2,100})/gi]){for(const m of html.matchAll(re))paramHints.push({term:m[0].slice(0,80),value:m[1]});}
const out={version:'botemania-irish-metadata-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',gameSlug:SLUG,probes,games,page:{url:REFERER,httpStatus:page.status,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex')},publicUrlCandidates:urls,paramHints:[...new Map(paramHints.map(x=>[`${x.term}|${x.value}`,x])).values()].slice(0,100),decision:{metadataRecovered:games.length>0,launchLinkRecovered:games.some(g=>typeof g.link==='string'&&g.link.length>0),providerIdRecovered:games.some(g=>typeof g.providerId==='string'&&g.providerId.length>0),fileserviceParamsRecovered:paramHints.some(x=>/gameEngine/i.test(x.term)),exactStakeLadderRecovered:false,realMoneyAllowed:false},guards:{publicGraphqlOnly:true,knownWebsiteFieldsOnly:true,noIntrospection:true,noAuthentication:true,noCookies:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({games:games.map(g=>({source:g.source,id:g.id,title:g.title,link:g.link,providerId:g.providerId,jackpot:g.jackpot})),paramHints:out.paramHints,decision:out.decision},null,2));
