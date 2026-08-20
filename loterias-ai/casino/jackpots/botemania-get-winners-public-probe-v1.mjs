#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-get-winners-public-probe-v1.json';
const QUERY=`query getWinners($venture: String) {
  winners(venture: $venture) {
    LocaleName
    WinAmount
    GameProductSkinName
    ProductType
    PrimaryHardwareType
    WinTimestamp
  }
}`;
const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-get-winners-public-probe/1.0','cache-control':'no-cache'},body:JSON.stringify({operationName:'getWinners',variables:{venture:'botemania_es'},query:QUERY})});
const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
const rows=Array.isArray(body?.data?.winners)?body.data.winners:[];
const normalized=rows.map(x=>({localeName:x?.LocaleName??null,winAmount:Number(x?.WinAmount),gameProductSkinName:x?.GameProductSkinName??null,productType:x?.ProductType??null,primaryHardwareType:x?.PrimaryHardwareType??null,winTimestamp:x?.WinTimestamp??null}));
const jpk=normalized.filter(x=>/jackpot\s*king|jackpotking|royal|regal|fishin|mega bars/i.test(String(x.gameProductSkinName||'')+' '+String(x.localeName||'')));
const out={version:'botemania-get-winners-public-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',source:{endpoint:ENDPOINT,operationName:'getWinners',venture:'botemania_es',querySha256:crypto.createHash('sha256').update(QUERY).digest('hex'),querySource:'PUBLIC_BOTEMANIA_WINNERS_CONTAINER_BUNDLE'},response:{httpStatus:r.status,ok:r.ok,contentType:r.headers.get('content-type'),bytes:text.length,hasGraphqlErrors:Array.isArray(body?.errors)&&body.errors.length>0,errors:(body?.errors||[]).map(e=>({message:e?.message||null})).slice(0,10),winnerRows:normalized.length},rows:normalized,jackpotKingCandidates:jpk,decision:{publicWinnerFeedReadable:r.ok&&normalized.length>0,jackpotKingWinnerRowsRecovered:jpk.length>0,usableRoyalRegalHitLevelsRecovered:false,discoveryOnly:true,realMoneyAllowed:false,reason:jpk.length?'JPK_CANDIDATE_WIN_ROWS_REQUIRE_TIER_AND_POT_LEVEL_LINKAGE':'NO_JPK_WINNER_ROWS_IN_CURRENT_PUBLIC_WINNERS_RESPONSE'},guards:{exactBundleQueryOnly:true,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({response:out.response,jackpotKingCandidates:jpk,decision:out.decision},null,2));
