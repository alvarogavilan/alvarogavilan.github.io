const VERSION='edge-digital-twin-registry-v1';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const T=Object.freeze({
  BETFAIR_AP_MCCOY:{
    class:'TIMED_FIRST_ELIGIBLE_BET_RACE',preferredMethods:['EMPIRICAL_BOOTSTRAP','MONTE_CARLO_RACE','WALK_FORWARD'],
    known:['current operator timed-jackpot semantics','conservative base RTP floor','Daily/Weekly tier identifiers and analysis pipeline'],
    required:['exact live jackpot amount','exact served stake','exact current GHT','same-binding overdue survival','own action-latency distribution','competitor first-bet/race distribution'],
    exactEnumerationFeasible:false
  },
  BET365_FRANK_BRUNO:{
    class:'TIMED_FIRST_ELIGIBLE_BET_RACE',preferredMethods:['EMPIRICAL_BOOTSTRAP','MONTE_CARLO_RACE','WALK_FORWARD'],
    known:['Spain minimum 0.10 EUR','Spain theoretical RTP 95.92%','jackpot allocation excluded from base RTP'],
    required:['exact live sljp state','exact served qualifying stake','GHT','cross-GHT survival','race/latency observations'],exactEnumerationFeasible:false
  },
  BOTEMANIA_ULTIMATE_VP:{
    class:'EXACT_COMBINATORIAL_PROGRESSIVE_VIDEO_POKER',preferredMethods:['EXHAUSTIVE_INITIAL_HAND_ENUMERATION','DYNAMIC_PROGRAMMING','WALK_FORWARD_METER'],
    known:['2598960 initial five-card hands enumerable','visible 7/5 base paytable','live progressive meter identity'],
    required:['exact Spain progressive trigger','exact jackpot-qualifying wager/hand configuration','same-config award accounting'],exactEnumerationFeasible:true
  },
  BETFAIR_REGAL_RICHES:{
    class:'FINITE_PERSISTENT_METER_MDP',preferredMethods:['EXACT_FINITE_STATE_MDP','MONTE_CARLO','WALK_FORWARD_STATE'],
    known:['Spain real launcher regal-riches-aig','IGT persistent-state product lineage'],
    required:['exact Spain variant meter structure','reset/cap for each meter','bet menu','theoretical RTP','transition probabilities/reel math','feature award distributions','online state scope'],exactEnumerationFeasible:true
  },
  BETFAIR_SCARAB:{
    class:'TEN_SPIN_PERSISTENT_STATE_MDP',preferredMethods:['EXACT_FINITE_STATE_MDP','MONTE_CARLO','WALK_FORWARD_STATE'],
    known:['Spain real launcher scarab-aig','ten-spin cycle mechanic','gold-border visible state'],
    required:['exact Spain RTP','bet menu','reel/transition probabilities','feature return by border state','account/denomination starting-state semantics'],exactEnumerationFeasible:true
  },
  BETFAIR_MAGIC_OF_NILE:{
    class:'TWENTY_SEVEN_STATE_GEM_MDP',preferredMethods:['EXACT_FINITE_STATE_MDP','MONTE_CARLO','WALK_FORWARD_STATE'],
    known:['Spain real launcher magic-of-nile-aig','Spain theoretical RTP 96.02%','27 compact pre-trigger gem vectors'],
    required:['Spain-specific gem acquisition probabilities','feature return distributions by color','bet menu','state persistence scope'],exactEnumerationFeasible:true
  },
  BETFAIR_TREASURE_BOX:{
    class:'PERSISTENT_BONUS_METER_MDP',preferredMethods:['EXACT_FINITE_STATE_MDP','MONTE_CARLO','WALK_FORWARD_STATE'],
    known:['Spain real launchers for Kingdom and Dynasty','IGT','Spain theoretical RTP 93.99%','meter mechanic 6 toward 0 in documented family'],
    required:['exact Spain key/coin outcome probabilities','bonus return distribution','exact meter transition/reset rules','bet-level state scope','jackpot contribution if relevant'],exactEnumerationFeasible:true
  },
  GENERIC_MUST_HIT_BY:{
    class:'BOUNDED_PROGRESSIVE_STOPPING_PROBLEM',preferredMethods:['EXACT_DYNAMIC_PROGRAMMING','MONTE_CARLO','WALK_FORWARD_METER'],
    known:['explicit must-hit boundary required'],
    required:['reset/start distribution','current meter','increment/funding process','award hazard/trigger semantics','qualifying stake','base-game cost'],exactEnumerationFeasible:'DEPENDS_ON_INCREMENT_MODEL'
  },
  ROULETTE:{
    class:'WHEEL_OR_RNG_DISTRIBUTION_TEST',preferredMethods:['EXACT_FAIR_WHEEL_BASELINE','MONTE_CARLO_NULL','WALK_FORWARD_BIAS_TEST'],
    known:['fair-wheel exact probabilities are analytically known'],
    required:['real prospective outcome stream from exact wheel/RNG if testing bias','independent holdout','multiple-testing correction'],exactEnumerationFeasible:true,
    warning:'Simulating a fair roulette wheel cannot discover a real-world edge; only measured deviation from the exact live source can.'
  },
  LOTTERY:{
    class:'COMBINATORIAL_PAYOUT_RULE_MODEL',preferredMethods:['EXACT_COMBINATORICS','MONTE_CARLO','WALK_FORWARD_RULE_OVERLAY'],
    known:['draw combinatorics and published payout rules can often be modeled exactly'],
    required:['exact current rules','ticket cost','prize allocation','rollover/rolldown/carrydown mechanics','sales/pool estimates where payout depends on participation'],exactEnumerationFeasible:true,
    warning:'Simulation evaluates payoff structures; it cannot predict future random numbers.'
  },
  JACKPOT_KING:{
    class:'PROGRESSIVE_HAZARD_MODEL',preferredMethods:['MONTE_CARLO','PARAMETER_BOUNDS','WALK_FORWARD_METER'],
    known:['network/Must-Be-Won-By family evidence'],
    required:['game-specific hazard per EUR','funding/increment','reset distribution','tier decomposition','exact current live binding'],exactEnumerationFeasible:false
  }
});

export function getDigitalTwinRegistry(){return {version:VERSION,targets:T,execution:execution(),hardGuards:{unknownProbabilitiesCannotBeImputed:true,foreignConfigCannotPopulateSpainTwin:true,simulationCannotPredictServerRng:true,discoveryCannotUseHoldout:true,noFutureInformation:true,noWager:true,noAutomaticBetting:true,realMoneyAllowed:false}};}

export function assessDigitalTwinReadiness(id,observed={}){
  const spec=T[id];if(!spec)return {version:VERSION,valid:false,reason:'UNKNOWN_TWIN_ID',supported:Object.keys(T),execution:execution()};
  const supplied=new Set(Object.entries(observed).filter(([,v])=>v===true).map(([k])=>k));
  const requiredKeys=Array.isArray(observed.requiredKeysOverride)?observed.requiredKeysOverride:[];
  const missingRequiredKeys=requiredKeys.filter(k=>!supplied.has(k));
  return {version:VERSION,valid:true,id,class:spec.class,preferredMethods:spec.preferredMethods,known:spec.known,requiredEvidence:spec.required,exactEnumerationFeasible:spec.exactEnumerationFeasible,callerRequiredKeys:requiredKeys,missingRequiredKeys,modelReadyForResearch:requiredKeys.length>0&&missingRequiredKeys.length===0,modelReadyForExecution:false,execution:execution(),hardGuards:{researchReadyDoesNotMeanRealWorldValidated:true,liveEvidenceStillRequired:true,prospectiveHoldoutStillRequired:true,realMoneyAllowed:false}};
}

export function listTwinIds(){return Object.keys(T);}
