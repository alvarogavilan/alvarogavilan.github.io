const VERSION='shadow-policy-library-v1';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const get=(o,path)=>String(path||'').split('.').reduce((a,k)=>a==null?undefined:a[k],o);
const clone=x=>structuredClone(x);

export function generateScalarThresholdPolicies({field,thresholds=[],playAction,waitAction=null,direction='gte'}={}){
  const cmp=direction==='lte'?(x,t)=>x<=t:(x,t)=>x>=t;
  return [...new Set(thresholds.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b).map(t=>({
    id:`${field}-${direction}-${t}`,
    metadata:{family:'SCALAR_THRESHOLD',field,threshold:t,direction},
    policy:(state,actions)=>{
      const desired=cmp(num(get(state,field)),t)?playAction:waitAction;
      if(desired==null)return null;
      return actions.find(a=>JSON.stringify(a)===JSON.stringify(desired))??null;
    }
  }));
}

export function generateVectorScorePolicies({fields=[],weightSets=[],thresholds=[],playAction,waitAction=null}={}){
  const out=[];
  for(const weights of weightSets){if(!Array.isArray(weights)||weights.length!==fields.length)continue;for(const threshold of thresholds){if(!Number.isFinite(Number(threshold)))continue;const w=weights.map(Number);const t=Number(threshold);out.push({
    id:`vector-${w.join('_')}-gte-${t}`,
    metadata:{family:'VECTOR_SCORE_THRESHOLD',fields:[...fields],weights:w,threshold:t},
    policy:(state,actions)=>{
      const score=fields.reduce((s,f,i)=>s+num(get(state,f))*w[i],0),desired=score>=t?playAction:waitAction;
      if(desired==null)return null;
      return actions.find(a=>JSON.stringify(a)===JSON.stringify(desired))??null;
    }
  });}}
  return out;
}

export function generateMagicOfTheNileGemPolicies({playAction={type:'PLAY'},waitAction=null}={}){
  const policies=[];
  for(let total=0;total<=6;total++)policies.push({
    id:`magic-total-gems-gte-${total}`,
    metadata:{family:'MAGIC_TOTAL_GEMS',threshold:total},
    policy:(state,actions)=>{
      const gems=num(state.redGems)+num(state.blueGems)+num(state.greenGems),desired=gems>=total?playAction:waitAction;
      if(desired==null)return null;return actions.find(a=>a.type===desired.type)??null;
    }
  });
  for(let minPairs=0;minPairs<=3;minPairs++)policies.push({
    id:`magic-colors-at-two-gte-${minPairs}`,
    metadata:{family:'MAGIC_TWO_GEM_COLORS',threshold:minPairs},
    policy:(state,actions)=>{
      const pairs=[state.redGems,state.blueGems,state.greenGems].filter(x=>num(x)>=2).length,desired=pairs>=minPairs?playAction:waitAction;
      if(desired==null)return null;return actions.find(a=>a.type===desired.type)??null;
    }
  });
  const weights=[[1,1,1],[1.25,1.25,1],[1.5,1.5,1],[1,1,0.75],[1.5,1.5,.5]];
  for(const w of weights)for(let t=2;t<=9;t+=.5)policies.push({
    id:`magic-weighted-${w.join('_')}-${t}`,
    metadata:{family:'MAGIC_WEIGHTED_GEMS',weights:w,threshold:t,greenDownweightHypothesis:w[2]<w[0]},
    policy:(state,actions)=>{
      const score=num(state.redGems)*w[0]+num(state.blueGems)*w[1]+num(state.greenGems)*w[2],desired=score>=t?playAction:waitAction;
      if(desired==null)return null;return actions.find(a=>a.type===desired.type)??null;
    }
  });
  return policies;
}

export function generatePersistentMeterPolicies({meterFields=[],boundaries={},fractions=[.5,.6,.7,.8,.85,.9,.95],playAction={type:'PLAY'},waitAction=null}={}){
  const out=[];
  for(const field of meterFields){const boundary=num(boundaries[field]);if(boundary<=0)continue;for(const f of fractions){const threshold=boundary*num(f);out.push({
    id:`${field}-fraction-${f}`,
    metadata:{family:'PERSISTENT_METER_FRACTION',field,boundary,fraction:f,threshold},
    policy:(state,actions)=>{const desired=num(get(state,field))>=threshold?playAction:waitAction;if(desired==null)return null;return actions.find(a=>a.type===desired.type)??null;}
  });}}
  return out;
}

export function generateTimedJackpotPolicies({amountThresholds=[],secondsPastGhtThresholds=[0],raceProbabilityThresholds=[0],playAction={type:'PLAY'},waitAction=null}={}){
  const out=[];for(const amount of amountThresholds)for(const overdueSeconds of secondsPastGhtThresholds)for(const raceP of raceProbabilityThresholds){const a=num(amount),o=num(overdueSeconds),p=num(raceP);out.push({
    id:`timed-jp-a${a}-o${o}-p${p}`,
    metadata:{family:'TIMED_JACKPOT',amountThreshold:a,overdueSecondsThreshold:o,raceProbabilityThreshold:p},
    policy:(state,actions)=>{
      const eligible=num(state.jackpotAmount)>=a&&num(state.secondsPastGht)>=o&&num(state.reviewedRaceProbability)>=p,desired=eligible?playAction:waitAction;
      if(desired==null)return null;return actions.find(x=>x.type===desired.type)??null;
    }
  });}return out;
}

export function generateProgressiveVideoPokerPolicies({jackpotThresholds=[],playAction={type:'PLAY'},waitAction=null}={}){
  return [...new Set(jackpotThresholds.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b).map(t=>({
    id:`video-poker-jackpot-gte-${t}`,
    metadata:{family:'PROGRESSIVE_VIDEO_POKER',jackpotThreshold:t},
    policy:(state,actions)=>{const desired=num(state.jackpotAmount)>=t?playAction:waitAction;if(desired==null)return null;return actions.find(a=>a.type===desired.type)??null;}
  }));
}

export function getShadowPolicyLibraryManifest(){return {version:VERSION,families:['scalar threshold','vector score threshold','Magic of the Nile gem policies','persistent meter fractions','timed jackpot amount/overdue/race thresholds','progressive video poker jackpot thresholds'],purpose:'Generate many candidate policies for Shadow Casino Lab discovery while keeping validation/holdout selection rules external.',execution:execution(),hardGuards:{generatedPolicyIsNotExecutionAdvice:true,creatorHeuristicsMustRemainMetadataOnly:true,holdoutMustNotTunePolicy:true,realMoneyAllowed:false}};}
