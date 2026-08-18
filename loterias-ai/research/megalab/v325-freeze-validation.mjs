#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ROOT='loterias-ai',SPEC=`${ROOT}/data/research/metapleno-v325-preregister.json`,DEV=`${ROOT}/data/research/metapleno-v325-stage1-development.json`,OUT=`${ROOT}/data/research/metapleno-v325-validation-freeze.json`;
const rawSpec=fs.readFileSync(SPEC),rawDev=fs.readFileSync(DEV),spec=JSON.parse(rawSpec),dev=JSON.parse(rawDev);
if(spec.version!=='v325'||dev.version!=='v325-stage1-development'||dev.family!==spec.family)throw Error('v325 lineage drift');
if(dev.status!=='DEVELOPMENT_SURVIVORS_READY_FOR_VALIDATION_FREEZE'||!(dev.selectedTotal>0))throw Error('v325 has no development survivors to freeze');
if(dev.temporalIsolation?.validationTouched!==false||dev.temporalIsolation?.blindOosTouched!==false||dev.guards?.targetLeakageUsed!==false||dev.guards?.retuningPerformed!==false)throw Error('v325 pre-freeze leakage guard failed');
const survivors=[];const seen=new Set();
for(const g of dev.games||[])for(const s of g.selected||[]){
 if(s.developmentGatePass!==true)throw Error('non-passing v325 candidate selected');
 if(seen.has(s.behaviorHash))throw Error('duplicate v325 behavior in selected set');seen.add(s.behaviorHash);
 survivors.push({game:g.game,baseWindow:s.baseWindow,nestedWindows:s.nestedWindows,lambda:s.lambda,mode:s.mode,behaviorHash:s.behaviorHash,developmentEvidence:{evaluatedDraws:s.evaluatedDraws,fivePlusPoolHits:s.fivePlusPoolHits,fullSixPoolHits:s.fullSixPoolHits,frequencyFivePlus:s.frequencyBaseline?.fivePlusPoolHits,matchedRandomExpectedFivePlus:s.matchedRandomExpectedFivePlus,distinctFivePlusDates:s.distinctFivePlusDates,eventDates:s.eventDates}});
}
if(survivors.length!==dev.selectedTotal)throw Error(`v325 selected count drift ${survivors.length} != ${dev.selectedTotal}`);
survivors.sort((a,b)=>a.game.localeCompare(b.game)||a.baseWindow-b.baseWindow||a.lambda-b.lambda||a.mode.localeCompare(b.mode));
const core={version:'v325-validation-freeze-v1',family:spec.family,status:'FROZEN_BEFORE_VALIDATION_READ',frozenAt:new Date().toISOString(),source:{preregisterSha256:crypto.createHash('sha256').update(rawSpec).digest('hex'),developmentSha256:crypto.createHash('sha256').update(rawDev).digest('hex')},validationBoundary:{start:spec.temporalProtocol.validationStart,end:spec.temporalProtocol.validationEnd},blindOosBoundary:{start:spec.temporalProtocol.blindOosStart,end:spec.temporalProtocol.blindOosEnd,mayReadBeforeValidationPass:false},survivors,validationGate:spec.validationGate,guards:{parametersFrozenFromDevelopment:true,validationReadBeforeFreeze:false,blindOosRead:false,noRetuning:true,post2024CannotRescue:true,realMoneyPass:false,realStakeEUR:0}};
const freezeSha256=crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
const out={...core,freezeSha256};
if(fs.existsSync(OUT)){const old=JSON.parse(fs.readFileSync(OUT,'utf8'));if(old.freezeSha256!==freezeSha256)throw Error('v325 validation freeze already exists with different contents');console.log(JSON.stringify({status:'ALREADY_FROZEN',survivors:survivors.length,freezeSha256}));process.exit(0)}
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:out.status,survivors,freezeSha256,validationReadBeforeFreeze:false,blindOosRead:false,realMoneyPass:false},null,2));
