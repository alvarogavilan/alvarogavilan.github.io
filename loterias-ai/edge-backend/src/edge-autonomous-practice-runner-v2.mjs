import {runAutonomousPractice as runV1} from './edge-autonomous-practice-runner-v1.mjs';
import {mermaidStructuralThresholdTable,summarizeMermaidCrossBetLeverage} from './mermaid-frenzy-cross-bet-pearl-option-v1.mjs';
import {screenRhinoFiveRegularCoins} from './rhino-coins-five-sticky-screen-v1.mjs';
import {rankPersistentStateMechanisms} from './persistent-state-transferability-theorem-v1.mjs';
import {screenOperatorCrossBetFrontier} from './cross-bet-operator-frontier-v1.mjs';

const VERSION='edge-autonomous-practice-runner-v2.1-cross-bet-operator-frontier';
const EXEC=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});

function transferabilityRows(){return [
  {id:'JOKERBET_ES_MERMAID_FRENZY_PEARL_MULTIPLIER',exactCurrentOperatorRuleVerified:true,stateSharedAcrossBetSizes:true,stateDependentPayoutScalesWithCurrentBet:true,buildStakeEUR:.20,exerciseStakeEUR:7.50},
  {id:'BETFAIR_ES_FULL_MOON_WHITE_KING',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true},
  {id:'WILLIAMHILL_ES_SNAKES_LADDERS_MEGADICE',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true},
  {id:'INTERWETTEN_ES_RHINO_COINS_HIT_THE_BONUS',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true},
  {id:'WILLIAMHILL_ES_STREAK_OF_LUCK',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true},
  {id:'WILLIAMHILL_ES_AOTGN_WAYS_OF_THUNDER',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true},
  {id:'WILLIAMHILL_ES_SQUEALIN_RICHES',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true}
];}

function mermaidResearchFrontier(){
  const leverage=summarizeMermaidCrossBetLeverage({currentPearlMultiplier:10,buildStakeEUR:.20,exerciseStakeEUR:7.50});
  const thresholds=mermaidStructuralThresholdTable({buildStakeEUR:.20,exerciseStakeEUR:7.50});
  return {leverage,thresholds:thresholds.rows.filter(r=>r.multiplier===10),publishedOverallHitFrequencyPct:20.94,publishedOverallHitFrequencyGuard:'CONTEXT_ONLY_NOT_PEARL_OR_JACKPOT_PROBABILITY',remainingGates:['runtime multiplier survival across served 0.20-to-7.50 bet change','Pearl increment/win/reset transition kernel','Mermaid Bonus transition probability by collected state','Pearl jackpot-tier probabilities','expected net build cost including resets and ordinary returns','prospective out-of-sample validation'],execution:{...EXEC}};
}

function mermaidSpainOperatorFrontier(){return screenOperatorCrossBetFrontier([
  {id:'JOKERBET_ES',operator:'JOKERBET Spain',title:'Mermaid Frenzy',minStakeEUR:.20,maxStakeEUR:7.50,exactCurrentStakeEndpointsVerified:true,exactCurrentCrossBetStateRuleVerified:true,currentStakeScalesStatePayout:true},
  {id:'PASTON_ES',operator:'PASTON Spain',title:'Mermaid Frenzy',minStakeEUR:.20,maxStakeEUR:7.50,exactCurrentStakeEndpointsVerified:true,exactCurrentCrossBetStateRuleVerified:false,currentStakeScalesStatePayout:false},
  {id:'ENRACHA_ES',operator:'enracha Spain',title:'Mermaid Frenzy',minStakeEUR:.10,maxStakeEUR:10,exactCurrentStakeEndpointsVerified:true,exactCurrentCrossBetStateRuleVerified:false,currentStakeScalesStatePayout:false},
  {id:'YOSPORTS_ES',operator:'YoSports Spain',title:'Mermaid Frenzy',minStakeEUR:.10,maxStakeEUR:10,exactCurrentStakeEndpointsVerified:true,exactCurrentCrossBetStateRuleVerified:false,currentStakeScalesStatePayout:false}
]);}

function rhinoResearchFrontier(){
  const minimumFiveCoinState=screenRhinoFiveRegularCoins({totalStakeEUR:1,visibleRegularBonusCoinValuesX:[1,1,1,1,1]});
  return {minimumFiveRegularCoinSensitivity:minimumFiveCoinState,classification:'CONDITIONAL_STATE_ONLY_NO_CROSS_BET_LEVERAGE',reason:'The saved sticky state is separated by bet level; a favorable observed state may matter conditionally, but low-stake build cannot be assumed transferable to a higher exercise stake.',execution:{...EXEC}};
}

export function runAutonomousPracticeV2(options={}){
  const base=runV1(options);
  const transferability=rankPersistentStateMechanisms(transferabilityRows());
  const operatorFrontier=mermaidSpainOperatorFrontier();
  return {version:VERSION,mode:'AUTONOMOUS_NO_USER_INPUT',generatedAt:new Date().toISOString(),base,priorityUpgrade:{structuralRank:transferability.map(x=>({id:x.id,score:x.score,classification:x.result.classification,stakeLeverageRatio:x.result.stakeLeverageRatio??null})),topStructuralLane:transferability[0]?.id??null,reason:'Cross-bet shared state with current-stake-scaled payout is ranked above isolated per-bet persistence because it can create build/exercise leverage; this is research priority, not a positive-EV claim.'},mermaidResearchFrontier:mermaidResearchFrontier(),mermaidSpainOperatorFrontier:operatorFrontier,rhinoResearchFrontier:rhinoResearchFrontier(),execution:{...EXEC},hardGuards:{noUserInputRequired:true,noAutomaticBetting:true,noWagerProbe:true,overallHitFrequencyCannotSubstituteForPearlProbability:true,operatorStakeRatioCannotSelfPromoteWithoutExactRuleBinding:true,noRuleTransferAcrossOperators:true,monthlyObservedRtpCannotBecomeNextSpinPrediction:true,conditionalStateDoesNotProveRepeatableCycleEdge:true,realMoneyRequiresExactCurrentPositiveEvAndProspectiveValidation:true}};
}

if(import.meta.url===`file://${process.argv[1]}`){process.stdout.write(`${JSON.stringify(runAutonomousPracticeV2(),null,2)}\n`);}
