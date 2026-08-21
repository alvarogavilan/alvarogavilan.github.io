#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/jackpots/evidence/deal-stateful3-current-game-discovery-v1.json';
const candidates=[
  'deal-or-no-deal','deal-or-no-deal-slot','deal-or-no-deal-jackpot','deal-or-no-deal-stateful3','deal-or-no-deal-stateful-3','deal-or-no-deal-5p','deal-no-deal','trato-o-no-trato','alla-tu','alla-tu-deal-or-no-deal'
];
const operators={
  botemania:{endpoint:'https://www.botemania.es/es/graphql',origin:'https://www.botemania.es',venture:'botemania_es'},
  monopoly:{endpoint:'https://www.monopolycasino.es/es/graphql',origin:'https://www.monopolycasino.es',ventures:['monopolycasino_es','monopoly_es','monopolycasino']}
};
const query=`query Game($gameId:String!){ contentfulGame(gameId:$gameId){ id title canonical introduction howToPlay providerId provider { name } gameFeatures { enabled value type } jackpot { id amount } } }`;
async function request(cfg,venture,gameId){
  try{
    const headers={accept:'application/json','content-type':'application/json',origin:cfg.origin,referer:cfg.origin+'/','user-agent':'edge-deal-stateful3-current-game-discovery/1.0'};if(venture)headers.venture=venture;
    const r=await fetch(cfg.endpoint,{method:'POST',headers,body:JSON.stringify({query,variables:{gameId}}),redirect:'follow',signal:AbortSignal.timeout(8000)});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    const g=body?.data?.contentfulGame||null;
    return {gameId,venture:venture||null,httpStatus:r.status,game:g?{id:g.id,title:g.title,canonical:g.canonical,introduction:g.introduction,howToPlay:g.howToPlay,providerId:g.providerId,providerName:g.provider?.name||null,gameFeatures:g.gameFeatures||[],jackpot:g.jackpot||null}:null,errors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,3)};
  }catch(e){return {gameId,venture:venture||null,httpStatus:null,game:null,errors:[String(e?.message||e)]};}
}
const results={botemania:[],monopoly:[]};
for(const gameId of candidates)results.botemania.push(await request(operators.botemania,operators.botemania.venture,gameId));
for(const gameId of candidates){
  let best=null;
  for(const venture of operators.monopoly.ventures){const r=await request(operators.monopoly,venture,gameId);best=r;if(r.game)break;}
  results.monopoly.push(best);
}
const hits=[];for(const [operator,rows] of Object.entries(results))for(const r of rows)if(r?.game)hits.push({operator,...r});
const likely=hits.filter(h=>/deal\s*or\s*no\s*deal|dealornodeal|all[aá]\s*t[uú]/i.test(`${h.game?.id||''} ${h.game?.title||''} ${h.game?.canonical||''}`));
const out={version:'deal-stateful3-current-game-discovery-v1',generatedAt:new Date().toISOString(),candidates,results,hits,likely,
  decision:{candidateGameRecovered:likely.length>0,currentStateful3ExactMappingVerified:false,currentPlayableGameIdentityVerified:false,currentProviderVerified:false,currentDenominationVerified:false,economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{boundedCandidateSlugsOnly:true,publicGraphqlOnly:true,noIntrospection:true,noLogin:true,noCookies:true,noLaunch:true,noBetting:true,slugHitDoesNotEqualStateful3Mapping:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({hits:hits.map(h=>({operator:h.operator,gameId:h.gameId,title:h.game.title,providerId:h.game.providerId,providerName:h.game.providerName,canonical:h.game.canonical,jackpot:h.game.jackpot})),decision:out.decision},null,2));
