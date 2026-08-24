import { EdgeSentinel as V19EdgeSentinel } from './index-v19.mjs';
import { SPANISH_JACKPOT_AWARDS_V2_EXTRA } from './spanish-jackpot-awards-v2-extra.mjs';
import { buildMillionaireGenieThresholdEnvelope } from './millionaire-genie-threshold-envelope-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v20-millionaire-genie-envelope-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}

export class EdgeSentinel extends V19EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.seedV2SpanishAwards();
  }

  seedV2SpanishAwards(){
    for(const e of SPANISH_JACKPOT_AWARDS_V2_EXTRA){
      this.sql.exec(`INSERT OR IGNORE INTO spanish_jackpot_awards(
        event_id,operator,game,amount_eur,period_start,period_end,date_precision,location,source_url,source_class,
        configuration_identity_current,award_verified_public,stake_eur,title_resolved,conflicts_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        e.eventId,e.operator,e.game,Number(e.amountEUR),e.periodStart,e.periodEnd,e.datePrecision,e.location||null,e.sourceUrl,e.sourceClass,
        e.configurationIdentityCurrent?1:0,e.awardVerifiedPublic?1:0,finite(e.stakeEUR)?Number(e.stakeEUR):null,e.titleResolved===false?0:1,JSON.stringify(e.conflicts||[])
      );
    }
  }

  spanishAwardsResearch(args={}){
    const base=super.spanishAwardsResearch(args);
    const mgRows=this.awardRows({game:'Millionaire Genie',operator:'888casino-es',limit:1000});
    const current=this.meterSampleSummary()?.current?.amountEUR??null;
    const envelope=buildMillionaireGenieThresholdEnvelope({
      awardAmounts:mgRows.map(x=>x.amountEUR),
      theoreticalRtp:0.9502,
      contributionRates:[0.02,0.035],
      currentJackpotEUR:current
    });
    base.version='edge-spanish-jackpot-award-archive-v2-threshold-envelope';
    base.millionaireGenie.thresholdScenarioEnvelope=envelope;
    base.millionaireGenie.modelStatus.enumeratedScenarioEnvelopeAvailable=true;
    base.millionaireGenie.modelStatus.enumeratedScenarioEnvelopeIsExecutable=false;
    base.guards.enumeratedThresholdEnvelopeIsNotRigorousLowerBound=true;
    base.guards.currentBelowEnumeratedScreensCannotProveNegativeEv=true;
    return base;
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),millionaireGenieThresholdScenarioEnvelope:true,spanishJackpotAwardArchiveV2:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
