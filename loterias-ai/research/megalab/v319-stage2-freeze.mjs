#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const IN='loterias-ai/data/research/metapleno-v319-stage1-development.json';
const SPEC='loterias-ai/data/research/metapleno-v319-preregister.json';
const OUT='loterias-ai/data/research/metapleno-v319-validation-freeze.json';
const raw=fs.readFileSync(IN,'utf8'),stage1=JSON.parse(raw),spec=JSON.parse(fs.readFileSync(SPEC,'utf8'));
if(stage1.version!=='v319-stage1-development'||stage1.status!=='DEVELOPMENT_SURVIVORS_READY_FOR_VALIDATION_FREEZE')throw new Error('v319 Stage1 did not authorize validation');
if(stage1.temporalIsolation?.validationTouched!==false||stage1.temporalIsolation?.blindOosTouched!==false)throw new Error('Stage1 temporal isolation drift');
const candidates=[];
for(const g of stage1.games||[])for(const c of g.selected||[])candidates.push({game:c.game,window:Number(c.window),maxOrder:Number(c.maxOrder),developmentBehaviorHash:c.behaviorHash,developmentFivePlus:Number(c.fivePlusPoolHits),developmentOrder0FivePlus:Number(c.order0FivePlus),developmentFullSix:Number(c.fullSixPoolHits)});
if(!candidates.length)throw new Error('no v319 candidates to freeze');
if(candidates.length>12)throw new Error('unexpected v319 survivor count');
const core={version:'v319-validation-freeze-v1',family:spec.family,status:'FROZEN_BEFORE_VALIDATION_READ',stage1Sha256:crypto.createHash('sha256').update(raw).digest('hex'),temporalCustody:{developmentEnd:'2018-12-31',validationWindow:'2019-01-01/2022-12-31',blindOosStart:'2023-01-01',validationReadBeforeFreeze:false,blindOosReadBeforeFreeze:false},candidates,validationGate:spec.validationGate,guards:{parametersFrozen:true,retuningAllowed:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14}};
const manifestHash=crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
fs.writeFileSync(OUT,JSON.stringify({...core,manifestHash,generatedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({candidateCount:candidates.length,candidates,manifestHash,validationReadBeforeFreeze:false,realMoneyPass:false},null,2));
