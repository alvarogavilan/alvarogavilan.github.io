#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const freezePath='loterias-ai/data/prospective/euromillones-v199-complete-5plus2-2026-08-18.json';
const adapterPath='loterias-ai/js/selae-adapter.js';
const endpointsPath='loterias-ai/data/selae-feed-endpoints.json';
const outPath='loterias-ai/data/research/euromillones-v199-complete-5plus2-evaluation.json';
const freeze=JSON.parse(fs.readFileSync(freezePath,'utf8'));
const cfg=JSON.parse(fs.readFileSync(endpointsPath,'utf8'));
const targetDate=freeze.config.target;
const ticket=freeze.tickets?.[0];
if(!ticket||ticket.numbers?.length!==5||ticket.stars?.length!==2)throw new Error('v199 frozen ticket is incomplete');
if(freeze.status!=='FROZEN_BEFORE_TARGET_RESULT'||freeze.realMoneyPass!==false||Number(freeze.realStakeEUR)!==0)throw new Error('v199 freeze safety regression');

const expectedFingerprint=crypto.createHash('sha256').update(JSON.stringify({target:targetDate,numbers:ticket.numbers.map(Number),stars:ticket.stars.map(Number),baseSeal:freeze.config.mainSourceSeal,starConfig:freeze.config.starSelection.config})).digest('hex');
if(expectedFingerprint!==freeze.fingerprintSha256)throw new Error('v199 freeze fingerprint mismatch');

const context={globalThis:{},window:undefined,console,Date,Math,JSON,Number,String,Array,Set,Object,Error};
vm.createContext(context);vm.runInContext(fs.readFileSync(adapterPath,'utf8'),context);
const adapter=context.globalThis.SELAEAdapter;
const feed=cfg.feeds.find(x=>x.gameId==='euromillones');
if(!feed)throw new Error('official Euromillones endpoint not registered');
const ymd=targetDate.replaceAll('-','');
const pageUrl=cfg.datedEndpointBase+feed.template.replace('{YYYYMMDD}',ymd);
const serviceUrl=cfg.dataServiceBase+cfg.dataServiceTemplate.replace('{GAME_ID}',feed.selaeGameId).replace('{YYYYMMDD}',ymd);

const base={
  version:'euromillones-v199-complete-5plus2-evaluation-v4',targetDrawDate:targetDate,freezeFingerprintSha256:freeze.fingerprintSha256,freezeFingerprintVerified:true,ticket,
  retuningPerformed:false,selectionUsedTargetResult:false,realMoneyPass:false,realStakeEUR:0,bettingRecommendation:false,
  custody:{freezeStatus:freeze.status,officialPageUrl:pageUrl,officialServiceUrl:serviceUrl,serviceSchemaContract:'loterias-ai/scripts/backfill-core-year.mjs::combo(euromillones)=5 main + 2 stars from fechav3.combinacion',officialPageValidated:false,officialPageCorroborated:false,officialServiceMainCrossCheck:false,officialServiceFull5plus2Validated:false,full5plus2OfficialCrossCheck:false,dualOfficialRouteCrossCheck:false,officialSourceSufficient:false}
};

async function fetchText(url){const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI immutable v199 settlement','accept':'*/*'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}
async function fetchJson(url){const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI immutable v199 settlement','accept':'application/json,*/*'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
function norm(a){return [...a].map(Number).sort((x,y)=>x-y)}
function same(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&norm(a).every((x,i)=>x===norm(b)[i])}
function validUniqueRange(a,count,min,max){return Array.isArray(a)&&a.length===count&&new Set(a.map(Number)).size===count&&a.every(x=>Number.isInteger(Number(x))&&Number(x)>=min&&Number(x)<=max)}
function isoDate(v){return String(v??'').slice(0,10)}

let semantic;
try{
  const [pageResult,serviceResult]=await Promise.allSettled([fetchText(pageUrl),fetchJson(serviceUrl)]);
  let draw={drawDate:null,main:[],secondary:[]},validation={ok:false,issues:['official_page_unavailable']};
  if(pageResult.status==='fulfilled'){draw=adapter.extractNumeric('euromillones',pageResult.value);validation=adapter.validateNumericDraw(draw)}
  const pageReady=validation.ok&&draw.drawDate===targetDate&&validUniqueRange(draw.main,5,1,50)&&validUniqueRange(draw.secondary,2,1,12);
  const rows=serviceResult.status==='fulfilled'&&Array.isArray(serviceResult.value)?serviceResult.value:[];
  const row=rows.find(r=>String(r?.game_id||'')===String(feed.selaeGameId)&&isoDate(r?.fecha_sorteo)===targetDate)||null;
  const serviceCombo=String(row?.combinacion||'').match(/\d{1,2}/g)?.map(Number)||[];
  const serviceMain=serviceCombo.slice(0,5),serviceStars=serviceCombo.slice(5,7);
  const serviceIdentityReady=Boolean(row&&String(row.game_id)===String(feed.selaeGameId)&&isoDate(row.fecha_sorteo)===targetDate);
  const serviceMainReady=serviceIdentityReady&&validUniqueRange(serviceMain,5,1,50);
  const serviceFullReady=serviceMainReady&&serviceCombo.length>=7&&validUniqueRange(serviceStars,2,1,12);
  const mainAgreement=pageReady&&serviceMainReady&&same(serviceMain,draw.main);
  const fullAgreement=pageReady&&serviceFullReady&&mainAgreement&&same(serviceStars,draw.secondary);

  if(pageReady&&serviceFullReady&&!fullAgreement){
    semantic={...base,status:'OFFICIAL_SOURCE_DISAGREEMENT_FAIL_CLOSED',custody:{...base.custody,officialPageValidated:true,officialServiceMainCrossCheck:mainAgreement,officialServiceFull5plus2Validated:true,officialPageCorroborated:false,full5plus2OfficialCrossCheck:false,dualOfficialRouteCrossCheck:false,officialSourceSufficient:false},officialReadiness:{pageDrawDate:draw.drawDate,serviceDrawDate:isoDate(row?.fecha_sorteo)||null,serviceGameId:row?.game_id||null,serviceCombinationCount:serviceCombo.length,pageIssues:validation.issues},next:'do not settle; investigate official SELAE disagreement without altering freeze'};
  }else if(serviceFullReady||mainAgreement){
    const nums=norm(serviceFullReady?serviceMain:draw.main),stars=norm(serviceFullReady?serviceStars:draw.secondary);
    const nHits=ticket.numbers.filter(n=>nums.includes(Number(n))).length,sHits=ticket.stars.filter(s=>stars.includes(Number(s))).length;
    semantic={...base,status:'EVALUATED_OFFICIAL_5PLUS2',custody:{...base.custody,officialPageValidated:pageReady,officialServiceMainCrossCheck:serviceMainReady&&(serviceFullReady?true:mainAgreement),officialServiceFull5plus2Validated:serviceFullReady,officialPageCorroborated:fullAgreement,full5plus2OfficialCrossCheck:serviceFullReady,dualOfficialRouteCrossCheck:fullAgreement,officialSourceSufficient:true},officialReadiness:{pageDrawDate:draw.drawDate||null,serviceDrawDate:isoDate(row?.fecha_sorteo)||null,serviceGameId:row?.game_id||null,serviceCombinationCount:serviceCombo.length,pageIssues:validation.issues},winningNumbers:nums,winningStars:stars,numberHits:nHits,starHits:sHits,category:`${nHits}+${sHits}`,full5plus2:nHits===5&&sHits===2,nearFull:nHits>=4||nHits===5,claimAllowed:false,replicationRequiredIfExtreme:nHits===5&&sHits===2,interpretation:nHits===5&&sHits===2?'prospective 5+2 matched; extreme event requires independent replication and lineage audit before any predictive claim':'official prospective result recorded; no retuning or post-result mutation allowed'};
  }else{
    semantic={...base,status:'WAITING_COMPLETE_OFFICIAL_RESULT',custody:{...base.custody,officialPageValidated:pageReady,officialServiceMainCrossCheck:mainAgreement,officialServiceFull5plus2Validated:serviceFullReady,officialPageCorroborated:false,full5plus2OfficialCrossCheck:false,dualOfficialRouteCrossCheck:false,officialSourceSufficient:false},officialReadiness:{pageDrawDate:draw.drawDate||null,serviceDrawDate:isoDate(row?.fecha_sorteo)||null,serviceGameId:row?.game_id||null,serviceCombinationCount:serviceCombo.length,pageIssues:validation.issues,serviceRowAvailable:Boolean(row),serviceMainCount:serviceMain.length,serviceStarCount:serviceStars.length},next:'wait for complete official SELAE 5+2 result; do not alter freeze'};
  }
}catch(e){semantic={...base,status:'WAITING_OFFICIAL_SELAE',errorClass:'OFFICIAL_SOURCE_NOT_READY_OR_UNAVAILABLE',next:'retry official SELAE sources without changing freeze'}}

const evaluationHash=crypto.createHash('sha256').update(JSON.stringify(semantic)).digest('hex');
const existing=fs.existsSync(outPath)?JSON.parse(fs.readFileSync(outPath,'utf8')):null;
if(existing?.evaluationHash===evaluationHash){console.log(JSON.stringify({...semantic,evaluationHash,persisted:false,reasonNotPersisted:'semantic evaluation unchanged'},null,2));process.exit(0)}
const out={...semantic,generatedAt:new Date().toISOString(),evaluationHash};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,persisted:true},null,2));