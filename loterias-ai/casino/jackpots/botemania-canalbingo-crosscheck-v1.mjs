#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-canalbingo-crosscheck-v1.json';
const ventures=[
  {id:'canalbingo_es',kind:'CANAL_BINGO_CANDIDATE'},
  {id:'canalbingo',kind:'CANAL_BINGO_CANDIDATE'},
  {id:'canal_bingo_es',kind:'CANAL_BINGO_CANDIDATE'},
  {id:'monopolycasino_es',kind:'KNOWN_SPANISH_VENTURE'}
];
const jackpotQuery=`query SharedBlueprintJackpots { blueprintJackpots { id amount } }`;
const gameQuery=`query SharedFishin($gameId:String!){ contentfulGame(gameId:$gameId){ id title providerId howToPlay jackpot { id amount } } }`;

async function gql(venture, operationName, query, variables={}) {
  const r=await fetch(ENDPOINT,{
    method:'POST',
    headers:{
      accept:'application/json','content-type':'application/json',venture,
      origin:'https://www.botemania.es',referer:'https://www.botemania.es/',
      'user-agent':'loterias-ai-spanish-jpk-network-crosscheck/1.1'
    },
    body:JSON.stringify({operationName,query,variables})
  });
  const text=await r.text();
  let body=null; try{body=JSON.parse(text);}catch{}
  return {httpStatus:r.status,body,sha256:crypto.createHash('sha256').update(text).digest('hex'),rawPreview:body?null:text.slice(0,300)};
}

const probes=[];
for (const cfg of ventures) {
  const venture=cfg.id;
  const item={venture,kind:cfg.kind,jackpots:null,game:null};
  try {
    const j=await gql(venture,'SharedBlueprintJackpots',jackpotQuery);
    item.jackpots={httpStatus:j.httpStatus,rows:j.body?.data?.blueprintJackpots||null,errors:(j.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,10),responseSha256:j.sha256};
  } catch(e) { item.jackpots={httpStatus:null,rows:null,errors:[String(e?.message||e)]}; }
  try {
    const g=await gql(venture,'SharedFishin',gameQuery,{gameId:'fishin-frenzy-jackpot-king'});
    const game=g.body?.data?.contentfulGame||null;
    const how=typeof game?.howToPlay==='string'?game.howToPlay:'';
    const numeric=[...how.matchAll(/(?:€|&euro;|\bEUR\b)?\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{3,6})(?:\s*(?:€|EUR))?/gi)].map(m=>m[0]).slice(0,50);
    item.game={httpStatus:g.httpStatus,data:game?{id:game.id,title:game.title,providerId:game.providerId,jackpot:game.jackpot,numericMentions:numeric,howToPlaySha256:crypto.createHash('sha256').update(how).digest('hex')}:null,errors:(g.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,10),responseSha256:g.sha256};
  } catch(e) { item.game={httpStatus:null,data:null,errors:[String(e?.message||e)]}; }
  probes.push(item);
}

const botemaniaObsPath='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
let botemaniaRows=[];
try {
  const obs=JSON.parse(fs.readFileSync(botemaniaObsPath,'utf8'));
  botemaniaRows=obs?.latest?.graphql?.rows?.map(x=>({id:x.id,amount:String(x.amountEUR)}))||[];
} catch {}
const normalize=rows=>(rows||[]).map(x=>({id:String(x.id),amount:Number(x.amount)})).filter(x=>Number.isFinite(x.amount)).sort((a,b)=>a.id.localeCompare(b.id));
const base=normalize(botemaniaRows);
for(const p of probes){
  const rows=normalize(p.jackpots?.rows);
  p.normalizedRows=rows;
  p.sameAsBotemania=base.length===3&&rows.length===3&&base.every((x,i)=>x.id===rows[i].id&&Math.abs(x.amount-rows[i].amount)<0.05);
}
const canalSuccessful=probes.filter(p=>p.kind==='CANAL_BINGO_CANDIDATE'&&p.normalizedRows?.length===3);
const monopoly=probes.find(p=>p.venture==='monopolycasino_es');
const out={
  version:'botemania-canalbingo-crosscheck-v1.1',generatedAt:new Date().toISOString(),endpoint:ENDPOINT,
  scope:'BOUNDED_PUBLIC_SPANISH_VENTURE_CROSSCHECK_NO_AUTH_NO_MUTATION',venturesTried:ventures,botemaniaReference:base,probes,
  decision:{
    canalBingoVentureResolved:canalSuccessful.length===1,
    resolvedCanalBingoVenture:canalSuccessful.length===1?canalSuccessful[0].venture:null,
    canalBingoSharedPotCorroborated:canalSuccessful.length===1&&canalSuccessful[0].sameAsBotemania===true,
    monopolyCasinoVentureResolved:monopoly?.normalizedRows?.length===3,
    monopolyCasinoSameAsBotemania:monopoly?.sameAsBotemania===true,
    monopolyCasinoIndependentSpanishNetwork:monopoly?.normalizedRows?.length===3&&monopoly?.sameAsBotemania===false,
    exactSpainMbwbRecovered:false,
    realMoneyAllowed:false
  },
  guards:{boundedCandidateList:true,noBruteForce:true,noAuthentication:true,noCookies:true,noMutation:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.decision,null,2));
