#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const SLUG='classic-wilds';
const TARGET_ID='classicwildsprogressive';
const PAGE=`${ORIGIN}/juegos/slots-online/${SLUG}`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-classic-wilds-exact-live-map-v1.json';
const UA='loterias-ai-classic-wilds-exact-live-map/1.0';
const FEED_QUERY='query loadJackpots { jackpots { id amount } }';
const FIELDS='id title providerId categoryId imageSlug howToPlay jackpot { id amount }';
const finiteOrNull=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');

async function req(url,opts={}){try{const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});const text=await r.text();return{status:r.status,ok:r.ok,url:r.url,text,sha256:sha(text),error:null};}catch(e){return{status:null,ok:false,url,text:'',sha256:null,error:String(e?.name||e?.message||e)}}}
async function gql(query,variables={},operationName=null){const r=await req(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer:PAGE,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName,variables,query})});let body=null;try{body=JSON.parse(r.text)}catch{}return{httpStatus:r.status,body,error:r.error,sha256:r.sha256};}
function rows(body){return(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??'').trim(),amountEUR:finiteOrNull(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);}
function distinct(rs,id){return[...new Set(rs.filter(x=>x.id===id).map(x=>x.amountEUR))];}
function usableJackpot(j){if(!j||typeof j!=='object')return null;const id=j.id==null?null:String(j.id).trim();const amountEUR=finiteOrNull(j.amount);if(!id&&amountEUR===null)return null;return{id:id||null,amountEUR};}
function percentContexts(text){const raw=String(text||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');const out=[];for(const m of raw.matchAll(/\b\d{1,3}(?:[.,]\d+)?\s*%/g)){out.push({percent:m[0],context:raw.slice(Math.max(0,m.index-180),Math.min(raw.length,m.index+m[0].length+260))});if(out.length>=20)break;}return out;}
function moneyStrings(n){if(!Number.isFinite(n))return[];const f=n.toFixed(2),c=f.replace('.',','),es=new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);return[...new Set([f,c,es,`${f} €`,`${c} €`,`${es} €`])];}

const before=await gql(FEED_QUERY,{},'loadJackpots');
const beforeRows=rows(before.body),beforeAmounts=distinct(beforeRows,TARGET_ID);
const [content,pageOrGame,page]=await Promise.all([
  gql(`query G($gameId:String!){ contentfulGame(gameId:$gameId){ ${FIELDS} } }`,{gameId:SLUG},'G'),
  gql(`query P($path:String){ pageOrGame(path:$path){ game { ${FIELDS} } } }`,{path:`/juegos/slots-online/${SLUG}`},'P'),
  req(PAGE,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}})
]);
const after=await gql(FEED_QUERY,{},'loadJackpots');
const afterRows=rows(after.body),afterAmounts=distinct(afterRows,TARGET_ID);
const a=content.body?.data?.contentfulGame||null,b=pageOrGame.body?.data?.pageOrGame?.game||null;
const jackpots=[usableJackpot(a?.jackpot),usableJackpot(b?.jackpot)].filter(Boolean);
const exactIdObjects=jackpots.filter(j=>j.id===TARGET_ID);
const feedUniqueBefore=beforeAmounts.length===1,feedUniqueAfter=afterAmounts.length===1;
const feedBand=feedUniqueBefore&&feedUniqueAfter?{minEUR:Math.min(beforeAmounts[0],afterAmounts[0]),maxEUR:Math.max(beforeAmounts[0],afterAmounts[0])}:null;
const amountMatchedObjects=feedBand?jackpots.filter(j=>j.amountEUR!==null&&j.amountEUR>=feedBand.minEUR-0.01&&j.amountEUR<=feedBand.maxEUR+0.01):[];
const combined=[page.text||'',JSON.stringify(a||{}),JSON.stringify(b||{})].join('\n');
const literalTargetId=combined.includes(TARGET_ID);
const liveAmountTextHits=[];for(const v of[...new Set([...beforeAmounts,...afterAmounts])]){const hits=moneyStrings(v).filter(s=>combined.includes(s));if(hits.length)liveAmountTextHits.push({amountEUR:v,matchedStrings:hits});}
const howToPlay=[a?.howToPlay,b?.howToPlay].filter(Boolean).join('\n');
const out={
  version:'botemania-classic-wilds-exact-live-map-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{slug:SLUG,url:PAGE,liveMonitor:{network:'generic',id:TARGET_ID}},
  liveFeed:{before:{httpStatus:before.httpStatus,amountsEUR:beforeAmounts,unique:feedUniqueBefore},after:{httpStatus:after.httpStatus,amountsEUR:afterAmounts,unique:feedUniqueAfter},bandEUR:feedBand},
  graphql:{contentfulHttpStatus:content.httpStatus,pageOrGameHttpStatus:pageOrGame.httpStatus,contentfulGame:a?pageSafe(a):null,pageOrGame:b?pageSafe(b):null,usableJackpotObjects:jackpots,exactTargetIdObjects:exactIdObjects,amountMatchedObjects},
  page:{httpStatus:page.status,sha256:page.sha256,bytes:page.text.length,literalTargetId,liveAmountTextHits},
  economicsDiscovery:{percentContexts:percentContexts(howToPlay),semanticsVerified:false,baseRtpExcludingJackpotPct:null,jackpotContributionPct:null,breakEvenJackpotEUR:null},
  decision:{exactCounterIdentityVerified:exactIdObjects.length===1,identityEvidenceClass:exactIdObjects.length===1?'EXACT_OPERATOR_GRAPHQL_JACKPOT_ID':'UNVERIFIED',amountOnlyDiscovery:exactIdObjects.length===0&&amountMatchedObjects.length>0,publicLayerExhaustedWithoutExactId:exactIdObjects.length===0&&!literalTargetId&&amountMatchedObjects.length===0&&liveAmountTextHits.length===0,economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicNoAuthOnly:true,noCookies:true,noMutation:true,noGameLaunch:true,noBetting:true,nullNeverCoercedToZero:true,amountOnlyNeverVerifiesIdentity:true,htmlLiteralNeverVerifiesIdentity:true,percentageContextNeverDefinesEconomicSemantics:true,economicPromotionAllowed:false,realMoneyAllowed:false}
};
function pageSafe(x){return{id:x?.id??null,title:x?.title??null,providerId:x?.providerId??null,categoryId:x?.categoryId??null,imageSlug:x?.imageSlug??null,jackpot:x?.jackpot??null,howToPlayPresent:Boolean(x?.howToPlay),percentContexts:percentContexts(x?.howToPlay||'')};}
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({liveFeed:out.liveFeed,graphql:out.graphql,page:out.page,economicsDiscovery:out.economicsDiscovery,decision:out.decision},null,2));
