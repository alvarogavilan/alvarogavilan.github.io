#!/usr/bin/env node
import fs from 'node:fs';

const E='loterias-ai/casino/lightning/evidence';
const V315='loterias-ai/data/research/metapleno-v315-final-200.json';
const OUT=`${E}/economic-promotion-gate-v1.json`;
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};

const timing=read(`${E}/timing-replication-v3-status.json`);
const lag8=read(`${E}/prospective-lag8-clean-v2-status-v1.json`);
const lagFamily=read(`${E}/prospective-lag-family-clean-v2-status-v1.json`);
const pastLucky=read(`${E}/prospective-past-lucky-family-clean-v2-status-v1.json`);
const numberSel=read(`${E}/economic-number-selection-prospective-status-v2.json`);
const physical=read(`${E}/physical-rng-prospective-v2-status.json`);
const v315=read(V315);

const directEconomic=[];
const scientificSignals=[];
const componentSignals=[];
const completed=[];

function boundary(id,complete,pass=false){completed.push({id,complete:Boolean(complete),pass:Boolean(pass)});}

const timingDone=timing?.progress?.closedEpisodes===200&&timing?.final!==null;
const timingPass=timingDone&&timing?.final?.replicationPass===true;
boundary('clean-timing-v3',timingDone,timingPass);
if(timingPass) componentSignals.push({id:'clean-timing-v3',type:'TIMING_COMPONENT',next:'Requires an untouched combined timing+number economic replication before any monetary claim.'});

const lag8Done=lag8?.progress?.comparisonsUsed===1000&&lag8?.final!==null;
const lag8Pass=lag8Done&&lag8?.final?.scientificPromotionCandidate===true&&lag8?.final?.conservativeBaseRoi>0;
boundary('clean-lag8-economic-v1',lag8Done,lag8Pass);
if(lag8Pass) directEconomic.push({id:'clean-lag8-economic-v1',type:'DIRECT_CONSERVATIVE_ECONOMIC_SIGNAL',conservativeROI:lag8.final.conservativeBaseRoi,hitRate:lag8.final.hitRate,pUpper:lag8.final.pUpper,next:'Freeze untouched independent replication; real money remains blocked.'});

const lagFamilyDone=lagFamily?.progress?.comparisonsUsed===5000&&lagFamily?.final!==null;
const lagPassing=lagFamilyDone?lagFamily.final.results?.filter(x=>x.promotionCandidate===true&&x.conservativeNonMultipliedROI>0)??[]:[];
boundary('clean-lag-family-v1',lagFamilyDone,lagPassing.length>0);
if(lagPassing.length) directEconomic.push({id:'clean-lag-family-v1',type:'DIRECT_CONSERVATIVE_ECONOMIC_SIGNAL',passingLags:lagPassing.map(x=>({lag:x.lag,conservativeROI:x.conservativeNonMultipliedROI,hitRate:x.rate,pUpper:x.pUpper,wilsonLower:x.wilson95?.lower})),next:'Freeze untouched family replication; no candidate may be retuned.'});

const luckyDone=pastLucky?.progress?.roundsUsed===5000&&pastLucky?.final!==null;
const luckyPassing=luckyDone?pastLucky.final.results?.filter(x=>x.promotionCandidate===true&&x.conservativeNonMultipliedROI>0)??[]:[];
boundary('clean-past-lucky-family-v1',luckyDone,luckyPassing.length>0);
if(luckyPassing.length) directEconomic.push({id:'clean-past-lucky-family-v1',type:'DIRECT_CONSERVATIVE_ECONOMIC_SIGNAL',passingSelectors:luckyPassing.map(x=>({selector:x.id,conservativeROI:x.conservativeNonMultipliedROI,hitRate:x.rate,pUpper:x.pUpper,wilsonLower:x.wilson95?.lower})),next:'Freeze untouched replication using past information only; current-round Lucky features remain forbidden.'});

const numberDone=numberSel?.gates?.fixedFinalComplete===true&&numberSel?.confirmation!==null;
const numberPassing=numberDone?Object.entries(numberSel.confirmation).filter(([,x])=>x?.pass===true&&Number(x?.phaseB?.roi)>0).map(([coverage,x])=>({coverage:Number(coverage),roi:x.phaseB.roi,hitRate:x.phaseB.hitRate,p:x.phaseB.exactOneSidedP,config:x.config})):[];
boundary('number-selection-v2',numberDone,numberPassing.length>0);
if(numberPassing.length) componentSignals.push({id:'number-selection-v2',type:'NUMBER_COMPONENT',passing:numberPassing,next:'Requires separate timing gate and an untouched combined timing+number economic replication.'});

const physicalDone=physical?.progress?.roundsUsedForV2===5000&&physical?.final!==null;
const physicalPass=physicalDone&&physical?.final?.multiplicity?.anyRejected===true;
boundary('physical-rng-v2',physicalDone,physicalPass);
if(physicalPass) scientificSignals.push({id:'physical-rng-v2',type:'PHYSICAL_ANOMALY',next:'Requires a new independent physical replication; no monetary claim follows from this alone.'});

const v315Done=v315?.fixedBoundary?.draws===200&&v315?.gates?.all200SettlementsPresent===true;
const v315Pass=v315Done&&v315?.gates?.familyPass===true;
boundary('primitiva-v315',v315Done,v315Pass);
if(v315Pass) scientificSignals.push({id:'primitiva-v315',type:'CROSS_GAME_TRANSFER_SIGNAL',next:'Requires untouched preregistered replication; payout economics and real-money authorization remain separate.'});

const compositeReady=timingPass&&numberPassing.length>0;
const payload={
  version:'economic-promotion-gate-v1',
  generatedAt:new Date().toISOString(),
  mode:'PAPER_ONLY',
  state:directEconomic.length?'DIRECT_ECONOMIC_REPLICATION_CANDIDATE_PRESENT':compositeReady?'COMPONENTS_READY_FOR_COMBINED_REPLICATION':scientificSignals.length||componentSignals.length?'SCIENTIFIC_OR_COMPONENT_SIGNAL_PRESENT':'NO_PROMOTION_SIGNAL_YET',
  directEconomicCandidates:directEconomic,
  scientificSignals,
  componentSignals,
  combinedTimingNumber:{componentsReady:compositeReady,promotableDirectly:false,reason:compositeReady?'Both component gates passed, but joint economics have not been evaluated on an untouched combined prospective sample.':'One or both required component gates have not passed their fixed boundaries.'},
  boundaries:completed,
  policy:{
    progressIsNotEvidence:true,
    onlyFixedBoundaryFinalsMayPromote:true,
    directEconomicRequiresPositiveConservativeROI:true,
    hiddenInterimPerformanceNeverRead:true,
    independentReplicationRequired:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    authorizedStakeEUR:0
  }
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));
