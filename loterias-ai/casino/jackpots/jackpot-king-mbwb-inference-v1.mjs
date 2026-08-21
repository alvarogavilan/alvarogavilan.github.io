#!/usr/bin/env node
import fs from 'node:fs';

const LEGACY_LEDGER='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/jackpot-king-mbwb-inference-v1.json';
const SCREEN='loterias-ai/casino/jackpots/evidence/jackpot-king-spain-near-cap-research-v1.json';
const RECON='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const ALL_NETWORK='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const finitePositive=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>0;
const median=a=>{if(!a.length)return null;const x=[...a].sort((m,n)=>m-n),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2};

export function exactSpainCapsFromReconstructor(recon={}){
  if(recon?.mbwb?.exactSpainMbwbKnown!==true)return{ROYAL:null,REGAL:null,verified:false};
  const royal=finitePositive(recon?.mbwb?.capEUR?.ROYAL)?Number(recon.mbwb.capEUR.ROYAL):null;
  const regal=finitePositive(recon?.mbwb?.capEUR?.REGAL)?Number(recon.mbwb.capEUR.REGAL):null;
  return{ROYAL:royal,REGAL:regal,verified:royal!==null&&regal!==null};
}

export function cleanResetsByTier(recon={}){
  const windows=Array.isArray(recon?.windows)?recon.windows:[];
  const valid=windows.filter(x=>x?.usableForSpainHazardValidation===true&&x?.cleanSingleTierCandidate===true&&['ROYAL','REGAL'].includes(x?.tier)&&finitePositive(x?.fromEUR)&&finitePositive(x?.toEUR)&&Number(x.fromEUR)>Number(x.toEUR));
  return{
    ROYAL:valid.filter(x=>x.tier==='ROYAL'),
    REGAL:valid.filter(x=>x.tier==='REGAL')
  };
}

export function uniformHiddenTriggerResearchForTier(resets=[]){
  const xs=resets.filter(r=>finitePositive(r?.fromEUR)&&finitePositive(r?.toEUR)&&Number(r.fromEUR)>Number(r.toEUR));
  const n=xs.length;if(!n)return null;
  const pre=xs.map(r=>Number(r.fromEUR)),post=xs.map(r=>Number(r.toEUR));
  const reserveMedian=median(post),maxObservedTrigger=Math.max(...pre);
  if(!Number.isFinite(reserveMedian)||!(maxObservedTrigger>reserveMedian))return null;
  const span=maxObservedTrigger-reserveMedian;
  return{
    hypothesisOnly:true,
    providerConfirmed:false,
    resetSamples:n,
    reserveMedianEUR:reserveMedian,
    maxObservedPreResetEUR:maxObservedTrigger,
    capMLELowerBoundEUR:maxObservedTrigger,
    capBiasCorrectedPointEUR:reserveMedian+((n+1)/n)*span,
    capOneSided95UpperEUR:reserveMedian+span/Math.pow(0.05,1/n),
    formulaNote:'Research-only within ONE tier. If hidden trigger T is Uniform(S,C), max(T) yields C_MLE=max(T); observation interval censoring is not corrected. Never pool Royal and Regal resets.'
  };
}

export function liveBlueprintState(allNetwork={},nowMs=Date.now()){
  const by=allNetwork?.currentByKey||{};
  const amount=k=>finitePositive(by?.[k]?.amountEUR)?Number(by[k].amountEUR):null;
  const observedAt=allNetwork?.observedAt||allNetwork?.generatedAt||null;
  const observedMs=Date.parse(observedAt||'');
  const sourceAgeSeconds=Number.isFinite(observedMs)?Math.max(0,Math.floor((nowMs-observedMs)/1000)):null;
  const pots={
    JACKPOT_KING:amount('blueprint:JACKPOTKING'),
    REGAL:amount('blueprint:JACKPOTKING_REGAL'),
    ROYAL:amount('blueprint:JACKPOTKING_ROYAL')
  };
  const readable=Object.values(pots).every(finitePositive)&&allNetwork?.source?.httpStatus===200;
  return{
    observedAt,
    sourceAgeSeconds,
    sourceReadable:readable,
    executionFresh:readable&&sourceAgeSeconds!==null&&sourceAgeSeconds<=180,
    researchFresh:readable&&sourceAgeSeconds!==null&&sourceAgeSeconds<=600,
    pots
  };
}

export function capStatus(cap,pot,ratios={}){
  if(!finitePositive(cap)||!finitePositive(pot))return null;
  cap=Number(cap);pot=Number(pot);
  const frac=pot/cap;
  const mk=(key)=>{
    const f=Number(ratios?.[key]?.minimumFractionOfCapForBreakEven);
    if(!Number.isFinite(f)||!(f>0))return null;
    const target=cap*f;
    return{fraction:f,targetEUR:+target.toFixed(2),distanceEUR:+Math.max(0,target-pot).toFixed(2),inside:pot>=target};
  };
  return{
    capEUR:cap,
    potEUR:pot,
    fractionOfCap:frac,
    percentOfCap:100*frac,
    distanceToCapEUR:+Math.max(0,cap-pot).toFixed(2),
    researchOnlyZones:{
      optimisticAllMeter:mk('optimisticIfAll038GoesToTargetPot'),
      halfMeter:mk('ifHalfOf038GoesToTargetPot'),
      equalThreeWay:mk('if038SplitEquallyAcrossThreePots')
    }
  };
}

export function buildInference({legacyLedger={},screen={},recon={},allNetwork={},nowMs=Date.now()}={}){
  const caps=exactSpainCapsFromReconstructor(recon);
  const resets=cleanResetsByTier(recon);
  const live=liveBlueprintState(allNetwork,nowMs);
  const ratios=screen?.economicScreen||{};
  const royalStatus=capStatus(caps.ROYAL,live.pots.ROYAL,ratios);
  const regalStatus=capStatus(caps.REGAL,live.pots.REGAL,ratios);
  const cleanRoyal=resets.ROYAL.length,cleanRegal=resets.REGAL.length,cleanTotal=cleanRoyal+cleanRegal;
  const minimum=Number(recon?.summary?.minimumCleanResetsForHazardFit||10);
  return{
    version:'jackpot-king-mbwb-inference-v1.3-live-source-aligned',
    generatedAt:new Date(nowMs).toISOString(),
    sources:{legacyCompatibilityLedger:LEGACY_LEDGER,resetReconstructor:RECON,allNetworkLiveState:ALL_NETWORK,nearCapResearch:SCREEN},
    progress:{
      cleanHardResetsTotal:cleanTotal,
      cleanHardResetsByTier:{ROYAL:cleanRoyal,REGAL:cleanRegal},
      minimumCleanResetsBeforeHazardDiscovery:minimum,
      hazardDiscoveryAllowedByTier:{ROYAL:cleanRoyal>=minimum,REGAL:cleanRegal>=minimum},
      pooledTierHazardFitForbidden:true
    },
    cleanResetEventsByTier:resets,
    uniformHiddenTriggerResearchByTier:{ROYAL:uniformHiddenTriggerResearchForTier(resets.ROYAL),REGAL:uniformHiddenTriggerResearchForTier(resets.REGAL)},
    exactSpainMbwb:{verified:caps.verified,capEUR:{ROYAL:caps.ROYAL,REGAL:caps.REGAL},source:RECON},
    potReadability:{
      sourceReadable:live.sourceReadable,
      sourceObservedAt:live.observedAt,
      sourceAgeSeconds:live.sourceAgeSeconds,
      researchFresh:live.researchFresh,
      executionFresh:live.executionFresh,
      potsEUR:live.pots,
      stalePotNeverPresentedAsExecutionCurrent:true
    },
    nearCapScreen:{
      current:live.executionFresh?{ROYAL:royalStatus,REGAL:regalStatus}:null,
      lastObservedReference:{observedAt:live.observedAt,sourceAgeSeconds:live.sourceAgeSeconds,ROYAL:royalStatus,REGAL:regalStatus,historicalOrResearchReferenceOnly:!live.executionFresh},
      researchThresholdFractions:{
        optimisticAllMeter:Number(ratios?.optimisticIfAll038GoesToTargetPot?.minimumFractionOfCapForBreakEven||null),
        halfMeter:Number(ratios?.ifHalfOf038GoesToTargetPot?.minimumFractionOfCapForBreakEven||null),
        equalThreeWay:Number(ratios?.if038SplitEquallyAcrossThreePots?.minimumFractionOfCapForBreakEven||null)
      }
    },
    modelAgnostic:{
      exactSpainRoyalMbwbEUR:caps.ROYAL,
      exactSpainRegalMbwbEUR:caps.REGAL,
      exactHazardLawKnown:false,
      currentPotToExactWinProbabilityConvertible:false
    },
    decision:{
      exactSpainMbwbKnown:caps.verified,
      nearCapEntryThresholdKnown:false,
      positiveEVKnown:false,
      realMoneyAllowed:false,
      reason:!caps.verified?'EXACT_SPAIN_MBWB_NOT_RESOLVED':cleanTotal===0?'NO_CLEAN_SINGLE_TIER_RESETS_YET':'HAZARD_FORM_NOT_PROVIDER_CONFIRMED'
    },
    guards:{
      useSameBotemaniaLiveFeedAsEdge:true,
      exactSpainMbwbFromOperatorUiReconstructorOnly:true,
      noRoyalRegalHazardPooling:true,
      uniformModelNeverPromotesAlone:true,
      noCrossMarketThresholdSubstitution:true,
      stalePotNeverPromotes:true,
      noOptionalStopping:true,
      automaticBettingAllowed:false,
      realMoneyAllowed:false,
      realStakeEUR:0
    }
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const legacy=read(LEGACY_LEDGER)||{};
  const out=buildInference({legacyLedger:legacy,screen:read(SCREEN)||{},recon:read(RECON)||{},allNetwork:read(ALL_NETWORK)||{}});
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  legacy.jackpotKingMbwbInferenceV1={generatedAt:out.generatedAt,progress:out.progress,exactSpainMbwb:out.exactSpainMbwb,potReadability:out.potReadability,nearCapScreen:out.nearCapScreen,decision:out.decision,guards:out.guards};
  fs.writeFileSync(LEGACY_LEDGER,JSON.stringify(legacy,null,2)+'\n');
  console.log(JSON.stringify({progress:out.progress,exactSpainMbwb:out.exactSpainMbwb,potReadability:out.potReadability,nearCapScreen:out.nearCapScreen,decision:out.decision},null,2));
}
