#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const IN='loterias-ai/casino/specialists/pokerstars-seeded-official-games-v1.json';
const OUT='loterias-ai/casino/specialists/pokerstars-validated-specialists-v1.json';
const d=JSON.parse(fs.readFileSync(IN,'utf8'));
const specialists=[];
for(const g of d.games||[]){
  try{
    const r=await fetch(g.url,{headers:{accept:'text/html','user-agent':'loterias-ai-pokerstars-specialist-validator/1.0'}});
    const html=await r.text();
    const host=new URL(r.url).hostname;
    const officialHost=host==='www.pokerstars.es'||host==='pokerstars.es';
    const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    const nameSignals=g.name.toLowerCase().split(/[: -]+/).filter(x=>x.length>2).slice(0,4);
    const gamePageSignals=nameSignals.some(t=>text.toLowerCase().includes(t))&&/jugar|slot|jackpot|premio|rodillo|casino/i.test(text);
    specialists.push({specialistId:'ps-'+crypto.createHash('sha256').update(g.url).digest('hex').slice(0,16),operator:'pokerstars-es',game:g.name,class:g.class,network:g.network,officialGameUrl:g.url,httpStatus:r.status,officialHost,gamePageSignals,pageSha256:crypto.createHash('sha256').update(html).digest('hex'),state:r.ok&&officialHost&&gamePageSignals?'OFFICIAL_GAME_PAGE_VALIDATED':'REJECTED',researchMandate:{observeOnly:true,noRealMoney:true,measureSpinOrRoundCadence:true,testTemporalPatterns:true,testStateDependence:true,testRegimeChanges:true,testRngIndependence:true,jackpotHazardStudy:true,progressivePotGrowthStudy:true,requireOutOfSampleConfirmation:true,requireOfficialRulesForEconomics:true}});
  }catch(e){specialists.push({operator:'pokerstars-es',game:g.name,class:g.class,network:g.network,officialGameUrl:g.url,state:'READ_FAILED',error:String(e?.message||e)});}
}
const valid=specialists.filter(x=>x.state==='OFFICIAL_GAME_PAGE_VALIDATED');
const payload={version:'pokerstars-validated-specialists-v1',generatedAt:new Date().toISOString(),summary:{seeded:specialists.length,validated:valid.length,rejected:specialists.length-valid.length,byNetwork:Object.fromEntries([...new Set(valid.map(x=>x.network))].map(n=>[n,valid.filter(x=>x.network===n).length]))},specialists,guards:{individualOfficialGamePageRequired:true,thirdPartyUrlsForbidden:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload.summary,null,2));