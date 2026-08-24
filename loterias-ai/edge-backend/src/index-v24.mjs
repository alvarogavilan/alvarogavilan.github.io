import { EdgeSentinel as V23EdgeSentinel } from './index-v23.mjs';
import { JOKERBET_STACK_CANDIDATES_V2,JOKERBET_STACK_TERMS_V2 } from './jokerbet-stack-candidates-v2.mjs';
import { buildJokerbetStackResearch } from './jokerbet-stack-core-v1.mjs';
import { PAF_EXTRA_ROUNDS_CURRENT,screenPafExtraRounds } from './paf-extra-rounds-screen-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v24-fast-profit-screens-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V23EdgeSentinel{
  jokerbetStackResearch(){
    const base=buildJokerbetStackResearch(JOKERBET_STACK_CANDIDATES_V2,JOKERBET_STACK_TERMS_V2);
    const byId=new Map(JOKERBET_STACK_CANDIDATES_V2.map(x=>[x.id,x]));
    const rows=base.rows.map(row=>{
      const c=byId.get(row.id)||{};
      const fingerprintReady=c.rulesFingerprintVerified===true;
      return {
        ...row,
        currentTitlePageResolved:c.currentTitlePageResolved===true,
        rulesFingerprintVerified:fingerprintReady,
        bonusBalanceAllowed:c.bonusBalanceAllowed??null,
        blockers:[...row.blockers,...(fingerprintReady?[]:['TITLE_RULES_FINGERPRINT_UNRESOLVED'])]
      };
    });
    const byGap=[...rows].sort((a,b)=>a.verifiedGapToOne-b.verifiedGapToOne||(a.minStakeEUR??999)-(b.minStakeEUR??999));
    const operatorReady=[...rows].filter(x=>x.operatorJackpotEligibilityVerified&&x.operatorJackpotTemperature==='SUPER_HOT').sort((a,b)=>a.verifiedGapToOne-b.verifiedGapToOne);
    return {
      ...base,
      version:'edge-jokerbet-stack-lab-v2-high-rtp-current-terms',
      generatedAt:new Date().toISOString(),jurisdiction:'ES',operator:'JOKERBET.es',
      rows,
      leaderBySmallestDeclaredGap:byGap[0]||null,
      leaderWithVerifiedSuperHotOperatorJackpot:operatorReady[0]||null,
      currentOperatorJackpotMonitor:{
        exactOroEUR:null,exactPlataEUR:null,exactBronceEUR:null,
        publicUnauthenticatedMachineReadableFeedResolved:false,
        awardLedgerResolved:false,
        publicPageStatesCountersVisibleInLoggedInSession:true,
        authBypassForbidden:true,
        status:'BLOCKED_PUBLIC_POT_FEED_AND_AWARD_HISTORY_NOT_RESOLVED'
      },
      decision:{
        closestPublishedGameReturn:byGap[0]?.game||null,
        closestPublishedGameReturnFraction:byGap[0]?.declaredGameReturnForScreen??null,
        strongestVerifiedSuperHot:operatorReady[0]?.game||null,
        stackPositiveEvProven:false,
        exactOperatorJackpotReturnKnown:false,
        realMoneyAllowed:false,
        nextScientificTarget:'RESOLVE_CODEX_JACKPOT_ELIGIBILITY_TEMPERATURE_AND_EXACT_RULES_FINGERPRINT'
      },
      guards:{
        ...base.guards,
        titlePageRtpCannotReplaceExactRulesFingerprint:true,
        missingJackpotTemperatureCannotBeInferred:true,
        bonusBalanceRestrictionCannotBeIgnored:true,
        currentCasinoSlotsCashbackPlusRollover50x:true,
        realMoneyAllowed:false
      }
    };
  }

  fastProfitResearch(){
    const jokerbet=this.jokerbetStackResearch();
    const pafUnknown=screenPafExtraRounds();
    const pafIllustrative95=screenPafExtraRounds({qualifyingGameRtp:0.95,freeSpinGameRtp:0.95});
    return {
      version:'edge-fast-profit-lab-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      lanes:[
        {
          id:'paf-extra-rounds-20-for-20x020',operator:'Paf.es',priority:1,status:'ACCOUNT_TERMS_REQUIRED',
          publicOffer:PAF_EXTRA_ROUNDS_CURRENT,
          exactScreen:pafUnknown,
          illustrativeOnlyRtp95Screen:pafIllustrative95,
          reason:'Public terms expose a 20 EUR qualifying-turnover / 20 x 0.20 EUR extra-round structure and Paf states extra-round winnings are real money. Exact games/account terms still gate execution.'
        },
        {
          id:'jokerbet-codex-stack',operator:'JOKERBET.es',priority:2,status:'JACKPOT_IDENTITY_AND_RETURN_REQUIRED',
          publishedRtp:jokerbet.leaderBySmallestDeclaredGap?.declaredGameReturnForScreen??null,
          publishedGapToOne:jokerbet.leaderBySmallestDeclaredGap?.verifiedGapToOne??null,
          game:jokerbet.leaderBySmallestDeclaredGap?.game??null,
          reason:'Current operator page publishes a 98% base RTP, materially shrinking the unknown stack gap, but jackpot temperature/probability and exact rules identity remain unresolved.'
        },
        {
          id:'888-millionaire-genie-monitor',operator:'888casino.es',priority:3,status:'MONITOR_ONLY',
          reason:'Deep Spanish award history and a public meter monitor exist, but the current meter is not itself an EV threshold and exact hazard/base-return decomposition remains unresolved.'
        }
      ],
      decision:{
        shortestEvidencePath:'PAF_EXTRA_ROUNDS_EXACT_ACCOUNT_OFFER_CAPTURE',
        positiveEvProven:false,
        executableLane:null,
        realMoneyAllowed:false
      },
      guards:{
        illustrativePromoMathCannotPromote:true,
        accountSpecificEligibilityRequired:true,
        qualifyingAndRewardGameRtpRequired:true,
        repeatabilityRequiredForReproducibleProfitClaim:true,
        noAuthenticationBypass:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/fast-profit'){
      await this.ensureAlarm();
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{fastProfitLabV24:true,pafExtraRoundsEvScreen:true,jokerbetHighRtpScreen:true,currentCashbackTermsCorrection:true,executionContractFailClosed:true},research:this.fastProfitResearch()});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),fastProfitLabV24:true,pafExtraRoundsEvScreen:true,jokerbetHighRtpScreen:true,currentCashbackTermsCorrection:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
