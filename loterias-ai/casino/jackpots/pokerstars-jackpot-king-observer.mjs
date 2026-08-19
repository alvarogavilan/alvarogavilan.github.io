#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const HAZARD_FREEZE='loterias-ai/casino/jackpots/evidence/jackpot-king-hazard-freeze-v1.json';
const URLS=[
  {id:'jpk-hub',url:'https://www.pokerstars.es/casino/jackpotking/'},
  {id:'jackpot-list',url:'https://www.pokerstars.es/casino/slots/jackpot/'},
  {id:'king-kong-cash-jpk',url:'https://www.pokerstars.es/casino/game/king-kong-cash-jpk/1017/100/'},
  {id:'eye-of-horus-megaways-jpk',url:'https://www.pokerstars.es/casino/game/eye-of-horus-megaways-jpk/1017/160/'},
  {id:'ted-jpk',url:'https://www.pokerstars.es/casino/game/ted-jpk/1017/59/'},
  {id:'gold-strike-bonanza-jpk',url:'https://www.pokerstars.es/casino/game/gold-strike-bonanza-jpk/1017/191/'}
];
const freeze=JSON.parse(fs.readFileSync(HAZARD_FREEZE,'utf8'));
if(freeze.version!=='jackpot-king-hazard-freeze-v1'||freeze.guards?.immutable!==true||freeze.guards?.futureOnly!==true||freeze.guards?.realMoneyAllowed!==false)throw new Error('Jackpot King hazard freeze drift');
const now=new Date().toISOString();
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};
const ledger=read(OUT);
const prev=ledger.jackpotKingOfficialMonitor||{observations:[],resets:[]};
const priorHazard=ledger.jackpotKingHazardProspectiveV1||{version:'jackpot-king-hazard-prospective-v1',observations:[],hardResets:[],anomalies:[]};

function parseNumber(raw){
  const s=String(raw).replace(/\s/g,'');
  if(s.includes(',')&&s.includes('.'))return Number(s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,''));
  if(s.includes(','))return Number(s.replace(/\./g,'').replace(',','.'));
  return Number(s.replace(/,/g,''));
}
function amounts(html){
  const txt=html.replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/gi,'€').replace(/\u20ac/gi,'€');
  const found=[];
  for(const re of [/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/g,/€\s*(\d{1,3}(?:,\d{3})*\.\d{2})/g,/(\d{3,}(?:[.,]\d{2})?)\s*€/g])for(const m of txt.matchAll(re)){const x=parseNumber(m[1]);if(Number.isFinite(x)&&x>=1000)found.push(x);}
  return found;
}
const pages=[];
for(const src of URLS){
  try{
    const r=await fetch(src.url,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-official-jackpot-observer/3.0','cache-control':'no-cache, no-store, max-age=0'}});
    const html=await r.text(); const vals=amounts(html);
    pages.push({id:src.id,url:src.url,httpStatus:r.status,finalUrl:r.url,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),amounts:[...new Set(vals)].sort((a,b)=>b-a).slice(0,30),officialSpainHost:new URL(r.url).hostname.endsWith('pokerstars.es')});
  }catch(e){pages.push({id:src.id,url:src.url,error:String(e?.message||e),amounts:[],officialSpainHost:false});}
}

// Legacy discovery monitor remains for UI continuity, but its old reset labels are NOT scientific reset evidence.
const jpkCandidateValues=[];
for(const p of pages){for(const a of p.amounts){if(a>=10000&&a<=10000000)jpkCandidateValues.push({page:p.id,value:a});}}
const buckets=new Map();
for(const x of jpkCandidateValues){const key=x.value.toFixed(2);const b=buckets.get(key)||{value:x.value,pages:new Set(),occurrences:0};b.pages.add(x.page);b.occurrences++;buckets.set(key,b);}
const ranked=[...buckets.values()].map(x=>({value:x.value,pageCount:x.pages.size,occurrences:x.occurrences,pages:[...x.pages]})).sort((a,b)=>b.pageCount-a.pageCount||b.occurrences-a.occurrences||b.value-a.value);
const corroborated=ranked.find(x=>x.pageCount>=2)||null;
const amount=corroborated?.value??null;
const priorObs=(prev.observations||[]).filter(x=>Number.isFinite(Number(x.networkPotEUR))).at(-1)||null;
let deltaEUR=null,hours=null,growthEURPerHour=null,possibleReset=false;
if(Number.isFinite(amount)&&priorObs){deltaEUR=Number((amount-Number(priorObs.networkPotEUR)).toFixed(2));hours=(Date.parse(now)-Date.parse(priorObs.observedAt))/36e5;if(hours>0)growthEURPerHour=Number((deltaEUR/hours).toFixed(2));possibleReset=deltaEUR<0;}
const observation={observedAt:now,networkPotEUR:amount,corroborated:Boolean(corroborated),corroboratingOfficialPages:corroborated?.pages??[],pageCount:corroborated?.pageCount??0,candidateNetworkValues:ranked.slice(0,10),pages,deltaEUR,growthEURPerHour,possibleReset,scientificResetEvidence:false};
const observations=[...(prev.observations||[]),observation].slice(-288);
const legacyResets=[...(prev.resets||[])];if(possibleReset)legacyResets.push({observedAt:now,fromEUR:Number(priorObs.networkPotEUR),toEUR:amount,dropEUR:Number((-deltaEUR).toFixed(2)),scientificResetEvidence:false});
const status={generatedAt:now,source:'PokerStars Spain official pages only',operator:'pokerstars-es',operatorOfficial:true,mode:'OBSERVATION_ONLY_NO_WAGERING',sourceReadable:Number.isFinite(amount),latest:observation,observations,observationCountTotal:Number(prev.observationCountTotal||0)+1,resets:legacyResets.slice(-100),resetCountTotal:Number(prev.resetCountTotal||0)+(possibleReset?1:0),structuralResearch:{providerMechanic:'Jackpot probability increases with jackpot value; Royal/Regal MBWB confirmed by Blueprint rules.',exactMbwbValuesKnown:false,jackpotProbabilityKnown:false,totalRTPAtCurrentPotKnown:false,positiveEVClaimAllowed:false,nextEvidenceNeeded:['exact PokerStars Royal/Regal MBWB values','pot identity mapping Royal vs Regal vs Jackpot King','10+ future-only hard resets for discovery','20+ future-only hard resets before economic replication']},guards:{officialPokerStarsPagesOnly:true,minimumTwoPageCorroboration:true,legacyResetLabelsNotScientificEvidence:true,noSpinPlaced:true,noAutoplay:true,noBetting:true,noEconomicPromotionFromPotSizeAlone:true,realMoneyAllowed:false},realMoneyAllowed:false};
ledger.jackpotKingOfficialMonitor=status;

// Clean future-only hazard custody uses one frozen canonical page to avoid pair-switch noise.
const canonical=pages.find(p=>p.id==='king-kong-cash-jpk');
const control=pages.find(p=>p.id==='ted-jpk');
const canonicalPot=canonical?.officialSpainHost&&canonical?.httpStatus===200&&canonical.amounts.length?canonical.amounts.find(x=>x>=10000&&x<=10000000)??null:null;
const controlReadable=Boolean(control?.officialSpainHost&&control?.httpStatus===200&&control.amounts.some(x=>x>=10000&&x<=10000000));
const startMs=Date.parse(freeze.prospectiveStartsStrictlyAfter),lastHazard=(priorHazard.observations||[]).at(-1)||null,minIntervalMs=Number(freeze.observation.minimumIntervalSeconds||3600)*1000;
let hazardUpdated=false;
let hazardObservations=[...(priorHazard.observations||[])],hardResets=[...(priorHazard.hardResets||[])],anomalies=[...(priorHazard.anomalies||[])];
if(Date.parse(now)>startMs&&(!lastHazard||Date.parse(now)-Date.parse(lastHazard.observedAt)>=minIntervalMs)){
  const valid=Number.isFinite(canonicalPot)&&controlReadable;
  const previous=hazardObservations.filter(x=>x.valid&&Number.isFinite(Number(x.canonicalPotEUR))).at(-1)||null;
  const changeEUR=valid&&previous?Number((canonicalPot-Number(previous.canonicalPotEUR)).toFixed(2)):null;
  const changeRatio=valid&&previous&&Number(previous.canonicalPotEUR)>0?changeEUR/Number(previous.canonicalPotEUR):null;
  const hardReset=Boolean(changeRatio!==null&&changeRatio<=-0.10);
  const smallDecrease=Boolean(changeEUR!==null&&changeEUR<0&&!hardReset);
  const hoursSincePrevious=valid&&previous?(Date.parse(now)-Date.parse(previous.observedAt))/36e5:null;
  const growthEURPerHour=changeEUR!==null&&changeEUR>=0&&hoursSincePrevious>0?Number((changeEUR/hoursSincePrevious).toFixed(4)):null;
  const fullContributionStakeLowerBoundEUR=changeEUR!==null&&changeEUR>=0?Number((changeEUR/0.0038).toFixed(2)):null;
  const row={observedAt:now,valid,canonicalPotEUR:valid?canonicalPot:null,canonicalPageId:'king-kong-cash-jpk',identityControlReadable:controlReadable,canonicalResponseSha256:canonical?.responseSha256??null,controlResponseSha256:control?.responseSha256??null,changeEUR,changeRatio,hardReset,smallDecreaseAnomaly:smallDecrease,growthEURPerHour,fullContributionStakeLowerBoundEUR,allocationAssumptionForLowerBound:'ONLY_IF_DISPLAYED_POT_RECEIVED_FULL_0.38_PERCENT; OTHERWISE TRUE_NETWORK_STAKE_IS_HIGHER',currency:'EUR'};
  hazardObservations.push(row);hazardObservations=hazardObservations.slice(-1000);hazardUpdated=true;
  if(hardReset&&previous)hardResets.push({observedAt:now,fromEUR:Number(previous.canonicalPotEUR),toEUR:canonicalPot,dropEUR:Number((Number(previous.canonicalPotEUR)-canonicalPot).toFixed(2)),dropRatio:Number((-changeRatio).toFixed(6))});
  if(smallDecrease&&previous)anomalies.push({observedAt:now,fromEUR:Number(previous.canonicalPotEUR),toEUR:canonicalPot,changeEUR,classification:'SUB_10_PERCENT_DECLINE_NOT_RESET'});
}
ledger.jackpotKingHazardProspectiveV1={version:'jackpot-king-hazard-prospective-v1',generatedAt:now,freezeVersion:freeze.version,prospectiveStartsStrictlyAfter:freeze.prospectiveStartsStrictlyAfter,economics:freeze.frozenEconomics,progress:{validObservations:hazardObservations.filter(x=>x.valid).length,hardResets:hardResets.length,minimumHardResetsBeforeHazardDiscovery:Number(freeze.observation.minimumHardResetsBeforeHazardDiscovery),minimumIndependentHardResetsBeforeAnyEconomicReplication:Number(freeze.observation.minimumIndependentHardResetsBeforeAnyEconomicReplication),hazardDiscoveryAllowed:hardResets.length>=Number(freeze.observation.minimumHardResetsBeforeHazardDiscovery),economicReplicationAllowed:false},observations:hazardObservations,hardResets:hardResets.slice(-100),anomalies:anomalies.slice(-200),latestObservationAddedThisRun:hazardUpdated,interpretation:{totalRtpAtCurrentPotKnown:false,displayedPotContributionMappingKnown:false,positiveEVKnown:false},guards:{futureOnly:true,canonicalPageFixed:true,identityControlRequired:true,sub10PercentDeclinesNeverCountAsReset:true,noOptionalStopping:true,noBetting:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};

fs.writeFileSync(OUT,JSON.stringify(ledger,null,2)+'\n');
console.log(JSON.stringify({jackpotKingOfficialMonitor:{sourceReadable:status.sourceReadable,networkPotEUR:amount,observationCountTotal:status.observationCountTotal,legacyResetCountTotal:status.resetCountTotal},hazardProspective:{updated:hazardUpdated,validObservations:ledger.jackpotKingHazardProspectiveV1.progress.validObservations,hardResets:ledger.jackpotKingHazardProspectiveV1.progress.hardResets,canonicalPotEUR:hazardObservations.at(-1)?.canonicalPotEUR??null,realMoneyAllowed:false}},null,2));
