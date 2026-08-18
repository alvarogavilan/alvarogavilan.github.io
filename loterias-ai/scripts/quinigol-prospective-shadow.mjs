import fs from 'node:fs';
import crypto from 'node:crypto';
const archive='loterias-ai/data/archive/quinigol',policyPath='loterias-ai/data/policies/quinigol-shadow-policy.json',ledgerPath='loterias-ai/data/shadow/quinigol-ledger.json';
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8')),window=policy.frozenModel.window,ticketsPerDraw=policy.frozenModel.ticketsPerDraw,boundary=policy.prospectiveRequirements.fixedBoundaryJornadas,buckets=['0','1','2','M'],codes=[];for(const a of buckets)for(const b of buckets)codes.push(`${a}-${b}`);
if(policy.version!=='2026-08-19-blinded-v2'||window!==320||ticketsPerDraw!==2||boundary!==30||policy.prospectiveRequirements.noOptionalStopping!==true||policy.prospectiveRequirements.interimROIHidden!==true||policy.guards?.realMoneyAllowed!==false)throw new Error('Quinigol blinded policy drift');
let rows=[];for(const f of fs.readdirSync(archive).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${archive}/${f}`,'utf8')).records||[]));rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.codes)&&r.result.codes.length===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));const officialRows=rows.filter(r=>r.economics?.validation?.officialSELAE);
const predict=hist=>{const pos=Array.from({length:6},()=>Object.fromEntries(codes.map(c=>[c,1])));for(const r of hist.slice(-window))for(let i=0;i<6;i++){const c=String(r.result.codes[i]||'').toUpperCase();if(c in pos[i])pos[i][c]++}return pos.map(p=>Object.entries(p).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0])};
const makeTickets=(hist,seedIndex)=>{const base=predict(hist),tickets=[];for(let k=0;k<ticketsPerDraw;k++){const t=[...base];if(k>0){const idx=(seedIndex+k*3)%6;t[idx]=codes[(codes.indexOf(t[idx])+k+1)%codes.length]}tickets.push(t)}return tickets};
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const predictionHash=e=>sha({anchorLastOfficialDrawId:e.anchorLastOfficialDrawId,anchorLastOfficialDate:e.anchorLastOfficialDate,tickets:e.tickets,model:e.model});
const previousLedger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):null;
let ledger=previousLedger?structuredClone(previousLedger):{version:'3',gameId:'quinigol',modelFrozen:{window,ticketsPerDraw},entries:[]};ledger.version='3';ledger.modelFrozen={window,ticketsPerDraw};ledger.policyVersion=policy.version;
for(const e of ledger.entries){if(e.model?.window!==window||e.model?.ticketsPerDraw!==ticketsPerDraw||Number(e.realStakeEUR||0)!==0)throw new Error(`Quinigol ledger model drift ${e.entryId}`);if(!/^[0-9a-f]{64}$/.test(e.predictionSha256||'')||predictionHash(e)!==e.predictionSha256)throw new Error(`Quinigol prediction hash drift ${e.entryId}`)}
for(const e of ledger.entries.filter(x=>x.status==='PREDICTED_SHADOW')){
  let rec=null;if(e.targetMode==='NEXT_OFFICIAL_AFTER_ANCHOR')rec=officialRows.find(r=>r.drawDate>e.anchorLastOfficialDate);else rec=rows.find(r=>(e.drawId&&r.drawId===e.drawId)||r.drawDate===e.drawDate);
  if(!rec?.economics?.validation?.officialSELAE)continue;
  if(predictionHash(e)!==e.predictionSha256)throw new Error(`prediction mutated before observation ${e.entryId}`);
  const observedBefore=ledger.entries.filter(x=>x.status==='OBSERVED_OFFICIAL_BLINDED').length;if(observedBefore>=boundary)throw new Error('post-30 observation blocked');
  const evidence={drawId:rec.drawId||null,drawDate:rec.drawDate,resultCodes:rec.result.codes,economics:rec.economics};
  Object.assign(e,{status:'OBSERVED_OFFICIAL_BLINDED',drawId:rec.drawId||null,drawDate:rec.drawDate,observedAt:new Date().toISOString(),officialEvidenceSha256:sha(evidence),performanceHidden:true});
  delete e.scoredAt;delete e.officialResultCodes;delete e.bestHits;delete e.simulatedStakeEUR;delete e.simulatedReturnEUR;delete e.simulatedPLEUR;
}
const observed=ledger.entries.filter(e=>e.status==='OBSERVED_OFFICIAL_BLINDED');
const pending=ledger.entries.filter(e=>e.status==='PREDICTED_SHADOW');
if(observed.length<boundary&&!pending.length){const latestOfficial=officialRows.at(-1);if(latestOfficial){const anchorIndex=rows.findIndex(r=>r===latestOfficial),history=rows.filter(r=>r.drawDate<=latestOfficial.drawDate),tickets=makeTickets(history,Math.max(0,anchorIndex)),entryCore={entryId:`NEXT_AFTER_${latestOfficial.drawId||latestOfficial.drawDate}_${ledger.entries.length+1}`,createdAt:new Date().toISOString(),status:'PREDICTED_SHADOW',targetMode:'NEXT_OFFICIAL_AFTER_ANCHOR',anchorLastOfficialDrawId:latestOfficial.drawId||null,anchorLastOfficialDate:latestOfficial.drawDate,tickets,realStakeEUR:0,model:{window,ticketsPerDraw},immutability:'Prediction sealed before the next official SELAE result; parameters remain frozen.'};ledger.entries.push({...entryCore,predictionSha256:predictionHash(entryCore)})}}
const observedNow=ledger.entries.filter(e=>e.status==='OBSERVED_OFFICIAL_BLINDED'),pendingNow=ledger.entries.filter(e=>e.status==='PREDICTED_SHADOW');
ledger.summary={requiredNewJornadas:boundary,observedJornadas:observedNow.length,remainingJornadas:Math.max(0,boundary-observedNow.length),sealedPendingPredictions:pendingNow.length,performanceHidden:observedNow.length<boundary,simulatedStakeEUR:null,simulatedReturnEUR:null,simulatedPLEUR:null,simulatedROI:null,profitableJornadas:null,fixedBoundaryComplete:observedNow.length===boundary,promotionReady:false};
ledger.disclosure={administrativeProgressOnly:observedNow.length<boundary,interimHitsHidden:true,interimROIHidden:true,interimRandomComparisonHidden:true};
ledger.guards={first30Only:true,predictionHashesVerified:true,noRetuning:true,noOptionalStopping:true,post30CannotRescue:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0};
const withoutUpdatedAt=x=>{const c=structuredClone(x);delete c.updatedAt;return c};
const semanticChanged=!previousLedger||JSON.stringify(withoutUpdatedAt(previousLedger))!==JSON.stringify(withoutUpdatedAt(ledger));
if(semanticChanged){ledger.updatedAt=new Date().toISOString();fs.mkdirSync('loterias-ai/data/shadow',{recursive:true});fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n')}
console.log(JSON.stringify({summary:ledger.summary,pending:pendingNow.at(-1)||null,persistence:semanticChanged?'UPDATED_SEMANTIC_CHANGE':'NO_SEMANTIC_CHANGE'},null,2));