#!/usr/bin/env node
import fs from 'node:fs';

const CERT='loterias-ai/data/archive/_meta/bonoloto-official-payouts-recent-v1.json';
const DIR='loterias-ai/data/archive/bonoloto';
const cert=JSON.parse(fs.readFileSync(CERT,'utf8'));
if(cert.version!=='bonoloto-official-payouts-recent-v1'||cert.sourcePolicy!=='SELAE_ONLY'||cert.summary?.complete!==true||Number(cert.summary?.failed)!==0)throw new Error('SELAE payout certification incomplete');
const byDate=new Map(cert.rows.map(r=>[r.date,r]));
const labels={six:'1ª (6 Aciertos)',fiveC:'2ª (5 Aciertos + C)',five:'3ª (5 Aciertos)',four:'4ª (4 Aciertos)',three:'5ª (3 Aciertos)',reintegro:'Reintegro'};
const categoryIds={six:1,fiveC:2,five:3,four:4,three:5,reintegro:6};
let updated=0,unchanged=0,seen=0;
for(const file of fs.readdirSync(DIR).filter(f=>/^\d{4}\.json$/.test(f))){
  const path=`${DIR}/${file}`,doc=JSON.parse(fs.readFileSync(path,'utf8'));let changed=false;
  for(const rec of doc.records||[]){
    const c=byDate.get(rec.drawDate);if(!c)continue;seen++;
    if(rec?.verification?.officialCrossCheck?.provider!=='SELAE'||rec?.verification?.officialCrossCheck?.complete!==true||rec?.verification?.status!=='OFFICIAL_SELAE_VALIDATED')throw new Error(`result custody not SELAE validated ${rec.drawDate}`);
    const categories=Object.entries(labels).map(([key,label])=>({category:categoryIds[key],label,winners:Number(c.payouts[key].winners),prize:Number(c.payouts[key].prizeEUR)}));
    const prior=rec.economics&&typeof rec.economics==='object'?rec.economics:{};
    const next={
      ...prior,
      currency:'EUR',
      ticketCost:0.5,
      categories,
      payouts:{six:Number(c.payouts.six.prizeEUR),fiveC:Number(c.payouts.fiveC.prizeEUR),five:Number(c.payouts.five.prizeEUR),four:Number(c.payouts.four.prizeEUR),three:Number(c.payouts.three.prizeEUR),reintegro:Number(c.payouts.reintegro.prizeEUR)},
      source:{provider:'SELAE',url:c.url,capturedAt:cert.generatedAt},
      validation:{...(prior.validation||{}),status:'OFFICIAL_SELAE_CERTIFIED',officialSELAE:true,certificationVersion:cert.version,bodySha256:c.bodySha256,resultAlsoSELAEValidated:true}
    };
    if(JSON.stringify(prior)!==JSON.stringify(next)){rec.economics=next;updated++;changed=true;}else unchanged++;
  }
  if(changed)fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
}
if(seen!==Number(cert.summary.certified))throw new Error(`normalization coverage drift ${seen}/${cert.summary.certified}`);
console.log(JSON.stringify({certified:Number(cert.summary.certified),seen,updated,unchanged,canonicalEligibilityRestored:true,sourcePolicy:'SELAE_ONLY'},null,2));
