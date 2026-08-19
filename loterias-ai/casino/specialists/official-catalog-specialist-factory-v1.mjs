#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const sources=[
  {operator:'pokerstars-es',url:'https://www.pokerstars.es/all-games-list/',kind:'FULL_CATALOG'},
  {operator:'pokerstars-es',url:'https://www.pokerstars.es/casino/slots/jackpot/',kind:'JACKPOT_CATALOG'},
  {operator:'playuzu-es',url:'https://www.playuzu.es/slots/',kind:'SLOTS_CATALOG'},
  {operator:'playuzu-es',url:'https://www.playuzu.es/jackpots/',kind:'JACKPOT_CATALOG'},
  {operator:'playuzu-es',url:'https://www.playuzu.es/crash-games/',kind:'CRASH_CATALOG'}
];
const OUT='loterias-ai/casino/specialists/official-game-specialists-v1.json';
const htmlText=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,'\n').replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
const bad=/^(jugar|más|nuevo|popular|slots|casino|inicio|ayuda|promociones|crear cuenta|iniciar sesión|juega|ver|todos|botes|jackpots|casino en vivo|juegos de mesa|premio instantáneo|la casa del juego presenta)$/i;
const gameish=s=>s.length>=3&&s.length<=90&&!bad.test(s)&&!/^(https?:|image|button|input|copyright|política|cookies|términos|juego responsable)/i.test(s)&&/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(s);
const rows=[];
for(const src of sources){
  try{
    const r=await fetch(src.url,{headers:{accept:'text/html','user-agent':'loterias-ai-official-catalog-factory/1.0'}});
    const html=await r.text(); const lines=htmlText(html); const names=[];
    for(const line of lines){if(!gameish(line))continue;if(/€|%|RTP|apuesta|premio máximo|líneas de premio|rodillos|funciones|desarrollador/i.test(line))continue;names.push(line);}
    const uniq=[...new Set(names)].slice(0,5000);
    for(const name of uniq){
      const lower=name.toLowerCase();
      const jackpot=/jackpot|jpk|bote|premio especial|age of the gods/i.test(name)||src.kind==='JACKPOT_CATALOG';
      const live=/live|roulette|ruleta|blackjack|baccarat|casino en vivo/i.test(name);
      const crash=/crash|aviator|spaceman|jetx/i.test(name)||src.kind==='CRASH_CATALOG';
      const classId=jackpot?'JACKPOT':crash?'CRASH':live?'LIVE_TABLE':'SLOT_OR_RNG';
      const id=crypto.createHash('sha256').update(`${src.operator}|${name}`).digest('hex').slice(0,16);
      rows.push({specialistId:`spec-${id}`,operator:src.operator,game:name,class:classId,sourceUrl:src.url,sourceKind:src.kind,researchMandate:{observeOnly:true,noRealMoney:true,measureSpinOrRoundCadence:true,testTemporalPatterns:true,testStateDependence:true,testRegimeChanges:true,testRngIndependence:true,jackpotHazardStudy:jackpot,progressivePotGrowthStudy:jackpot,requireOutOfSampleConfirmation:true,requireOfficialRulesForEconomics:true},state:'CATALOGUED_NOT_VALIDATED'});
    }
  }catch(e){rows.push({operator:src.operator,sourceUrl:src.url,sourceKind:src.kind,state:'SOURCE_READ_FAILED',error:String(e?.message||e)});}
}
const dedup=new Map();for(const r of rows){if(!r.specialistId)continue;const key=`${r.operator}|${r.game.toLowerCase()}`;if(!dedup.has(key))dedup.set(key,r);}
const specialists=[...dedup.values()];
const summary={totalSpecialists:specialists.length,byOperator:Object.fromEntries(['pokerstars-es','playuzu-es'].map(o=>[o,specialists.filter(x=>x.operator===o).length])),byClass:Object.fromEntries(['JACKPOT','CRASH','LIVE_TABLE','SLOT_OR_RNG'].map(c=>[c,specialists.filter(x=>x.class===c).length]))};
const out={version:'official-game-specialists-v1',generatedAt:new Date().toISOString(),sourcePolicy:{allowedOperators:['pokerstars-es','playuzu-es'],thirdPartyCatalogsForbidden:true,officialProviderRulesAllowedForMechanics:true},summary,specialists,globalGuards:{automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0,retrospectiveDiscoveryCannotPromote:true,prospectiveReplicationRequired:true}};
fs.mkdirSync('loterias-ai/casino/specialists',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
