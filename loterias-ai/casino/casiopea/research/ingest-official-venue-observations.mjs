#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai/casino/casiopea';
const protocol=JSON.parse(fs.readFileSync(`${ROOT}/evidence/official-dual-venue-protocol-v1.json`,'utf8'));
if(protocol.version!=='casiopea-official-dual-venue-protocol-v1'||protocol.evidenceRequirements?.thirdPartyOutcomeFeedForbiddenForScoring!==true||protocol.safety?.realMoneyAllowed!==false)throw new Error('Casiopea official protocol drift');
const allowed=new Map(protocol.allowedOperators.map(x=>[x.id,x]));
const file=process.argv[2];
if(!file)throw new Error('usage: node ingest-official-venue-observations.mjs <official-observations.jsonl>');
const lines=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean);
const rows=lines.map((line,i)=>{let x;try{x=JSON.parse(line)}catch{throw new Error(`invalid JSON line ${i+1}`)};const op=allowed.get(x.operatorId);if(!op)throw new Error(`line ${i+1}: operator must be pokerstars-es or playuzu-es`);if(x.operatorHost!==op.host)throw new Error(`line ${i+1}: operator host mismatch`);if(x.game!==protocol.game)throw new Error(`line ${i+1}: game must be ${protocol.game}`);if(!protocol.evidenceRequirements.allowedEvidenceKinds.includes(x.evidenceKind))throw new Error(`line ${i+1}: evidence kind not allowed`);const winner=Number(x.winner);if(!Number.isInteger(winner)||winner<0||winner>36)throw new Error(`line ${i+1}: invalid winner`);if(!x.roundOrder&&!x.timestamp)throw new Error(`line ${i+1}: roundOrder or timestamp required`);if(x.timestamp&&!Number.isFinite(Date.parse(x.timestamp)))throw new Error(`line ${i+1}: invalid timestamp`);if(!/^[a-f0-9]{64}$/i.test(String(x.evidenceSha256||'')))throw new Error(`line ${i+1}: evidenceSha256 required`);if(x.sourceHost&&x.sourceHost!==op.host)throw new Error(`line ${i+1}: third-party source forbidden`);return{operatorId:x.operatorId,operatorHost:x.operatorHost,game:x.game,evidenceKind:x.evidenceKind,roundOrder:x.roundOrder??null,timestamp:x.timestamp??null,winner,evidenceSha256:String(x.evidenceSha256).toLowerCase(),capturedAt:x.capturedAt??null,realMoney:false};});

for(const operatorId of allowed.keys()){
  const incoming=rows.filter(x=>x.operatorId===operatorId);
  if(!incoming.length)continue;
  const out=`${ROOT}/data/${operatorId}-official-observations.jsonl`;
  fs.mkdirSync(`${ROOT}/data`,{recursive:true});
  const existing=fs.existsSync(out)?fs.readFileSync(out,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
  const key=x=>`${x.operatorId}|${x.timestamp??''}|${x.roundOrder??''}|${x.winner}|${x.evidenceSha256}`;
  const seen=new Set(existing.map(key));
  const fresh=incoming.filter(x=>!seen.has(key(x)));
  const merged=[...existing,...fresh];
  merged.sort((a,b)=>{if(a.timestamp&&b.timestamp)return a.timestamp.localeCompare(b.timestamp);return Number(a.roundOrder||0)-Number(b.roundOrder||0)});
  fs.writeFileSync(out,merged.map(x=>JSON.stringify(x)).join('\n')+(merged.length?'\n':''));
  console.log(JSON.stringify({operatorId,existing:existing.length,accepted:fresh.length,total:merged.length,output:out},null,2));
}

const manifest={version:'casiopea-official-observation-ingest-v1',generatedAt:new Date().toISOString(),protocolVersion:protocol.version,inputFileSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),inputRows:rows.length,operators:[...new Set(rows.map(x=>x.operatorId))],thirdPartyRowsAccepted:0,realMoneyAllowed:false};
fs.writeFileSync(`${ROOT}/evidence/latest-official-ingest-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
