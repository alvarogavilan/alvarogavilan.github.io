#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const sources=[
  {operator:'pokerstars-es',host:'www.pokerstars.es',url:'https://www.pokerstars.es/all-games-list/',kind:'FULL_CATALOG'},
  {operator:'pokerstars-es',host:'www.pokerstars.es',url:'https://www.pokerstars.es/casino/slots/jackpot/',kind:'JACKPOT_CATALOG'},
  {operator:'playuzu-es',host:'www.playuzu.es',url:'https://www.playuzu.es/slots/',kind:'SLOTS_CATALOG'},
  {operator:'playuzu-es',host:'www.playuzu.es',url:'https://www.playuzu.es/jackpots/',kind:'JACKPOT_CATALOG'},
  {operator:'playuzu-es',host:'www.playuzu.es',url:'https://www.playuzu.es/crash-games/',kind:'CRASH_CATALOG'},
  {operator:'playuzu-es',host:'www.playuzu.es',url:'https://www.playuzu.es/ruleta/',kind:'LIVE_OR_TABLE_CATALOG'}
];
const OUT='loterias-ai/casino/specialists/official-game-specialists-v1.json';
const clean=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const anchorRx=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const badName=/^(jugar|juega ahora|más|nuevo|popular|slots|casino|inicio|ayuda|promociones|crear cuenta|iniciar sesión|ver|todos|botes|jackpots|casino en vivo|juegos de mesa|premio instantáneo|la casa del juego presenta|volver|siguiente|anterior)$/i;
const looksName=s=>s.length>=3&&s.length<=120&&!badName.test(s)&&!/must be located|real money sign up|cookie|privacidad|t[eé]rminos|juego responsable|copyright|aviso legal/i.test(s)&&/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(s);
const canonicalUrl=(href,base)=>{try{const u=new URL(href,base);u.hash='';u.search='';return u.href;}catch{return null;}};
const isGamePath=(operator,u,sourceUrl)=>{
  const p=u.pathname.toLowerCase();
  if(operator==='pokerstars-es')return p.startsWith('/casino/game/');
  if(operator==='playuzu-es'){
    const sourcePath=new URL(sourceUrl).pathname.replace(/\/$/,'');
    if(p.replace(/\/$/,'')===sourcePath)return false;
    return /^\/(?:slots|jackpots|crash-games|ruleta-en-vivo|blackjack-en-vivo|baccarat-en-vivo|casino-en-vivo)\//.test(p)&&p.split('/').filter(Boolean).length>=2;
  }
  return false;
};
const classify=(name,sourceKind,pageText='')=>{
  const s=`${name} ${pageText.slice(0,3000)}`;
  const jackpot=/jackpot|\bjpk\b|bote|premio especial|age of the gods/i.test(s)||sourceKind==='JACKPOT_CATALOG';
  const crash=/crash|aviator|spaceman|jetx/i.test(s)||sourceKind==='CRASH_CATALOG';
  const live=/live|roulette|ruleta|blackjack|baccarat|casino en vivo|crupier/i.test(s)||sourceKind==='LIVE_OR_TABLE_CATALOG';
  return jackpot?'JACKPOT':crash?'CRASH':live?'LIVE_TABLE':'SLOT_OR_RNG';
};

const candidates=new Map();const sourceDiagnostics=[];
for(const src of sources){
  try{
    const r=await fetch(src.url,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-official-catalog-factory/2.0'}});const html=await r.text();
    let anchors=0,gameLinks=0;
    for(const m of html.matchAll(anchorRx)){
      anchors++;const href=canonicalUrl(m[1],src.url);if(!href)continue;const u=new URL(href);if(u.hostname!==src.host||!isGamePath(src.operator,u,src.url))continue;
      const name=clean(m[2]);if(!looksName(name))continue;gameLinks++;
      const key=`${src.operator}|${href}`;const old=candidates.get(key);if(!old||name.length<old.name.length)candidates.set(key,{operator:src.operator,name,url:href,sourceUrl:src.url,sourceKind:src.kind});
    }
    sourceDiagnostics.push({operator:src.operator,sourceUrl:src.url,httpStatus:r.status,anchors,gameLinks,sourceSha256:crypto.createHash('sha256').update(html).digest('hex')});
  }catch(e){sourceDiagnostics.push({operator:src.operator,sourceUrl:src.url,error:String(e?.message||e),anchors:0,gameLinks:0});}
}

// Validate every candidate against its own official game page. No loose catalogue text survives.
const specialists=[];const rejected=[];
for(const c of [...candidates.values()].slice(0,1000)){
  try{
    const r=await fetch(c.url,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-official-game-validator/1.0'}});const html=await r.text();const txt=clean(html);const final=new URL(r.url);
    const expectedHost=c.operator==='pokerstars-es'?'www.pokerstars.es':'www.playuzu.es';
    const officialHost=final.hostname===expectedHost;
    const gameSignals=c.operator==='pokerstars-es'?/jugar ahora|play now|detalles del juego|líneas de premio|paylines|rtp/i.test(txt):/juega ahora|desarrollador|rtp|apuesta mínima|premio máximo|líneas de premio|rodillos|funciones/i.test(txt);
    if(!r.ok||!officialHost||!gameSignals){rejected.push({...c,httpStatus:r.status,finalUrl:r.url,reason:!r.ok?'HTTP':!officialHost?'HOST':'NO_GAME_PAGE_SIGNALS'});continue;}
    const og=(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)||html.match(/<title>([^<]+)<\/title>/i)||[])[1];
    let game=clean(og||c.name).replace(/,?\s*(?:ju[eé]galo|play it).*$/i,'').replace(/\s*\|\s*PokerStars.*$/i,'').trim();if(!looksName(game))game=c.name;
    const classId=classify(game,c.sourceKind,txt);const id=crypto.createHash('sha256').update(`${c.operator}|${r.url}`).digest('hex').slice(0,16);
    const rtpMatch=txt.match(/RTP(?:\s+(?:del|of))?\s*[:\-]?\s*(\d{2}(?:[.,]\d{1,2})?)\s*%/i);
    specialists.push({specialistId:`spec-${id}`,operator:c.operator,game,class:classId,officialGameUrl:r.url,catalogSource:c.sourceUrl,sourceKind:c.sourceKind,validation:{httpStatus:r.status,officialHost:true,gamePageSignals:true,pageSha256:crypto.createHash('sha256').update(html).digest('hex'),rtpText:rtpMatch?.[1]??null},researchMandate:{observeOnly:true,noRealMoney:true,measureSpinOrRoundCadence:true,testTemporalPatterns:true,testStateDependence:true,testRegimeChanges:true,testRngIndependence:true,jackpotHazardStudy:classId==='JACKPOT',progressivePotGrowthStudy:classId==='JACKPOT',requireOutOfSampleConfirmation:true,requireOfficialRulesForEconomics:true},state:'OFFICIAL_GAME_PAGE_VALIDATED'});
  }catch(e){rejected.push({...c,reason:'FETCH_ERROR',error:String(e?.message||e)});}
}
const dedup=new Map();for(const s of specialists){const key=`${s.operator}|${s.officialGameUrl}`;if(!dedup.has(key))dedup.set(key,s);}const cleanSpecialists=[...dedup.values()];
const summary={totalSpecialists:cleanSpecialists.length,byOperator:Object.fromEntries(['pokerstars-es','playuzu-es'].map(o=>[o,cleanSpecialists.filter(x=>x.operator===o).length])),byClass:Object.fromEntries(['JACKPOT','CRASH','LIVE_TABLE','SLOT_OR_RNG'].map(c=>[c,cleanSpecialists.filter(x=>x.class===c).length])),candidateLinks:candidates.size,rejectedCandidates:rejected.length};
const out={version:'official-game-specialists-v2',generatedAt:new Date().toISOString(),sourcePolicy:{allowedOperators:['pokerstars-es','playuzu-es'],individualOfficialGamePageRequired:true,thirdPartyCatalogsForbidden:true,officialProviderRulesAllowedForMechanics:true},summary,sourceDiagnostics,rejectedSample:rejected.slice(0,50),specialists:cleanSpecialists,globalGuards:{automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0,retrospectiveDiscoveryCannotPromote:true,prospectiveReplicationRequired:true}};
fs.mkdirSync('loterias-ai/casino/specialists',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
