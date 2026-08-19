#!/usr/bin/env node
import fs from 'node:fs';

const CERT='loterias-ai/data/archive/_meta/bonoloto-official-payouts-recent-v1.json';
const DIR='loterias-ai/data/archive/bonoloto';
const cert=JSON.parse(fs.readFileSync(CERT,'utf8'));
if(cert.version!=='bonoloto-official-payouts-recent-v1'||cert.sourcePolicy!=='SELAE_ONLY'||cert.summary?.complete!==true||Number(cert.summary?.failed)!==0)throw new Error('official payout certification incomplete');
const byDate=new Map(cert.rows.map(r=>[r.date,r]));
let updated=0,unchanged=0;
for(const file of fs.readdirSync(DIR).filter(f=>/^\d{4}\.json$/.test(f))){
  const path=`${DIR}/${file}`,doc=JSON.parse(fs.readFileSync(path,'utf8'));let changed=false;
  for(const rec of doc.records||[]){
    const c=byDate.get(rec.drawDate);if(!c)continue;
    if(rec?.verification?.officialCrossCheck?.provider!=='SELAE'||rec?.verification?.officialCrossCheck?.complete!==true||rec?.verification?.status!=='OFFICIAL_SELAE_VALIDATED')throw new Error(`result custody not official for ${rec.drawDate}`);
    const officialPayouts={six:Number(c.payouts.six.prizeEUR),fiveC:Number(c.payouts.fiveC.prizeEUR),five:Number(c.payouts.five.prizeEUR),four:Number(c.payouts.four.prizeEUR),three:Number(c.payouts.three.prizeEUR),reintegro:Number(c.payouts.reintegro.prizeEUR)};
    const next={ticketCost:0.5,currency:'EUR',payouts:officialPayouts,source:{provider:'SELAE',url:c.url,capturedAt:cert.generatedAt},validation:{status:'OFFICIAL_SELAE_CERTIFIED',certificationVersion:cert.version,bodySha256:c.bodySha256,resultAlsoSELAEValidated:true}};
    if(JSON.stringify(rec.economics)!==JSON.stringify(next)){rec.economics=next;changed=true;updated++;}else unchanged++;
  }
  if(changed)fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
}
if(updated+unchanged!==Number(cert.summary.certified))throw new Error(`merge coverage drift ${updated+unchanged}/${cert.summary.certified}`);
console.log(JSON.stringify({certified:Number(cert.summary.certified),updated,unchanged,sourcePolicy:'SELAE_ONLY'},null,2));
