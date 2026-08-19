#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const streams=[
  {id:'lightning',game:'Lightning Roulette',url:'https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette'},
  {id:'xxxtreme',game:'XXXtreme Lightning Roulette',url:'https://api-cs.casino.org/svc-evolution-game-events/api/xxxtremelightningroulette'}
];
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const out=[];
for(const s of streams){
  const r=await fetch(s.url,{headers:{accept:'application/json','user-agent':'loterias-ai-evolution-table-identity/1.0','cache-control':'no-cache'}});
  const text=await r.text();if(!r.ok)throw new Error(`${s.id} HTTP ${r.status}`);const body=JSON.parse(text);const rows=Array.isArray(body)?body:body?.data||[];
  const normalized=rows.slice(0,30).map(x=>{const d=x?.data||x;const table=d?.table??null;return{roundId:String(x?.id??d?.id??''),startedAt:d?.startedAt??null,settledAt:d?.settledAt??null,winner:Number(d?.result?.outcome?.number),gameType:d?.gameType??null,table,tableFingerprint:table?sha(table):null,rawRoundSha256:sha(x)}}).filter(x=>x.roundId);
  const fingerprints=[...new Set(normalized.map(x=>x.tableFingerprint).filter(Boolean))];
  const tableSamples=[];const seen=new Set();for(const x of normalized){if(x.tableFingerprint&&!seen.has(x.tableFingerprint)){seen.add(x.tableFingerprint);tableSamples.push({fingerprint:x.tableFingerprint,table:x.table});}}
  out.push({id:s.id,game:s.game,endpoint:s.url,httpStatus:r.status,rounds:normalized.length,gameTypes:[...new Set(normalized.map(x=>x.gameType).filter(Boolean))],tableFingerprints:fingerprints,tableSamples,latestRounds:normalized.slice(0,10),responseSha256:sha(text)});
}
const lightning=out.find(x=>x.id==='lightning'),xxx=out.find(x=>x.id==='xxxtreme');
const crossRoundOverlap=lightning.latestRounds.map(x=>x.roundId).filter(id=>xxx.latestRounds.some(y=>y.roundId===id));
const payload={version:'evolution-table-identity-probe-v1',generatedAt:new Date().toISOString(),mode:'IDENTITY_AUDIT_ONLY',streams:out,crossGame:{sameGameExpected:false,roundIdOverlap:crossRoundOverlap,roundIdOverlapCount:crossRoundOverlap.length,note:'Lightning and XXXtreme are different games; this probe captures provider table identity so an operator-visible round/table can later be matched exactly. Do not infer PokerStars/PlayUZU table identity without an operator observation.'},operatorVerificationContract:{allowedOperators:['pokerstars-es','playuzu-es'],samePhysicalStreamRequires:['same game','matching provider table identity or exact operator/provider table mapping','matching roundId when exposed OR timestamp+winner+lucky payload corroboration'],dedicatedTablePossibilityMustRemainOpen:true},guards:{doesNotModifyProspectiveDatasets:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});fs.writeFileSync('loterias-ai/casino/evidence/evolution-table-identity-probe-v1.json',JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({generatedAt:payload.generatedAt,streams:out.map(x=>({id:x.id,gameTypes:x.gameTypes,tableFingerprints:x.tableFingerprints,tableSamples:x.tableSamples})),realMoneyAllowed:false},null,2));
