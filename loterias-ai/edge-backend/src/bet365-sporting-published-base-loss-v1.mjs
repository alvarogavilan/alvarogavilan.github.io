import {getBet365SpainCurrentSportingRtpPolicy} from './bet365-spain-current-sporting-rtp-policy-v1.mjs';

const VERSION='bet365-sporting-published-base-loss-v1';
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,publishedBaseLossAvailable:false,usableForJackpotThreshold:false,usableForExecution:false,execution:execution(),...extra};}

export function deriveBet365SportingPublishedBaseLoss({gameCode}={}){
  const policy=getBet365SpainCurrentSportingRtpPolicy({gameCode});
  if(policy?.valid!==true||policy.exactCurrentOperatorTitleRtpRowVerified!==true||policy.publishedTheoreticalRtpExcludesJackpotAllocationVerified!==true||policy.headlineRtpMayBeUsedAsBaseGameRtp!==true)return fail('CURRENT_BET365_SPAIN_RTP_POLICY_REQUIRED',{policyReason:policy?.reason||null});
  const stake=finite(policy.publishedMinimumBetEUR),rtpPct=finite(policy.publishedTheoreticalRtpPct);
  if(!(stake>0)||rtpPct===null||rtpPct<0||rtpPct>100)return fail('INVALID_PUBLISHED_STAKE_OR_RTP');
  const expectedBaseReturnEUR=stake*(rtpPct/100);
  const expectedBaseLossEUR=stake-expectedBaseReturnEUR;
  return {
    version:VERSION,valid:true,reason:'CURRENT_BET365_SPAIN_PUBLISHED_BASE_GAME_LOSS_AVAILABLE',
    operator:'bet365 Spain',market:'ES',gameCode:policy.gameCode,title:policy.title,
    publishedMinimumBetEUR:stake,publishedMaximumBetEUR:policy.publishedMaximumBetEUR,
    publishedTheoreticalRtpPct:rtpPct,publishedTheoreticalRtpExcludesJackpotAllocationVerified:true,
    expectedBaseReturnAtPublishedMinimumEUR:expectedBaseReturnEUR,
    expectedBaseLossAtPublishedMinimumEUR:expectedBaseLossEUR,
    publishedBaseLossAvailable:true,
    jackpotEligibilityAtPublishedMinimumBetVerified:false,servedStakeAtDecisionVerified:false,servedSljp1RuntimeBindingVerified:false,followingDayRuleVerified:false,
    usableForJackpotThreshold:false,usableForExecution:false,
    scientificUse:'Computes only the current bet365 Spain published base-game expected loss at the operator-published minimum bet, using the exact title RTP row and the current operator policy that excludes jackpot allocation from RTP calculations. This is a static economics prior, not a jackpot EV threshold: the published minimum is not proof that the jackpot is eligible at that stake, is not a served stake-at-decision observation, and does not prove current sljp-1 runtime or following-day semantics.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,currentBet365SpainOperatorPolicyRequired:true,exactCurrentTitleRowRequired:true,publishedMinimumCannotProveJackpotEligibility:true,publishedMinimumCannotProveServedStake:true,noCurrentJackpotInvented:true,noRaceProbabilityInvented:true,noCrossOperatorTransfer:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}
