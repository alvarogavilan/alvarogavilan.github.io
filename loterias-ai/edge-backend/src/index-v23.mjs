import { EdgeSentinel as V22EdgeSentinel } from './index-v22.mjs';
import { SPANISH_JACKPOT_AWARDS_V3_EXTRA,SPANISH_JACKPOT_AGGREGATES_V3_EXTRA } from './spanish-jackpot-awards-v3-extra.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v23-spanish-jackpot-awards-expansion-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}

export class EdgeSentinel extends V22EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.seedV3SpanishAwards();
  }

  seedV3SpanishAwards(){
    for(const e of SPANISH_JACKPOT_AWARDS_V3_EXTRA){
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
    const aggregates=[...(base.aggregates||[]),...SPANISH_JACKPOT_AGGREGATES_V3_EXTRA];
    base.version='edge-spanish-jackpot-award-archive-v3-expanded';
    base.aggregates=aggregates;
    base.summary={...(base.summary||{}),aggregatesStored:aggregates.length,archiveExpansionV23IndividualRows:SPANISH_JACKPOT_AWARDS_V3_EXTRA.length,archiveExpansionV23AggregateRows:SPANISH_JACKPOT_AGGREGATES_V3_EXTRA.length};
    base.archiveV23={
      newIndividualAwards:SPANISH_JACKPOT_AWARDS_V3_EXTRA,
      newAggregates:SPANISH_JACKPOT_AGGREGATES_V3_EXTRA,
      strongestSeriesRemains:'Millionaire Genie',
      timestampPolicy:'PUBLICATION_WINDOW_WHEN_EXACT_AWARD_DAY_IS_NOT_PUBLISHED'
    };
    base.guards={...(base.guards||{}),publicationWindowCannotMasqueradeAsExactAwardTime:true,aggregateLowerBoundsCannotBecomeSyntheticEvents:true};
    return base;
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/science/spanish-awards','/science/jokerbet-stack','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),spanishJackpotAwardsExpansionV23:true,publicationWindowPrecision:true,aggregateLowerBoundArchive:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
