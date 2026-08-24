import { EdgeSentinel as V14EdgeSentinel } from './index-v14.mjs';
import { SPAIN_PLAYABLE_UNIVERSE } from './spain-playable-universe-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v15-spain-only-library-20260824a';

function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}

export class EdgeSentinel extends V14EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    // The operational evidence library is Spain-only. Foreign mechanism references
    // may exist as static research artifacts, but never as searchable historical rows.
    this.sql.exec(`DELETE FROM library_records WHERE jurisdiction <> 'ES'`);
    this.sql.exec(`DELETE FROM library_sources WHERE jurisdiction IS NOT NULL AND jurisdiction <> 'ES'`);
  }

  insertLibraryRecord(r,options={}){
    const jurisdiction=String(r?.jurisdiction||'').trim().toUpperCase();
    if(jurisdiction!=='ES')throw new Error('SPAIN_ONLY_LIBRARY_REJECTS_NON_ES_RECORD');
    return super.insertLibraryRecord({...r,jurisdiction:'ES'},options);
  }

  spainUniverseSummary(){
    const u=SPAIN_PLAYABLE_UNIVERSE;
    return {
      version:u.version,
      jurisdiction:u.jurisdiction,
      stateReservedLotteryOperators:u.stateReservedLotteries.operators.length,
      selaeFamilies:u.stateReservedLotteries.selae.length,
      onceFamilies:u.stateReservedLotteries.once.length,
      dgojOnlineGameTypes:u.dgojOnlineLicensed.gameTypes.length,
      dgojRegistryObservedOperators:u.dgojOnlineLicensed.registryObservedOperators,
      dgojRegistryObservedAt:u.dgojOnlineLicensed.registryObservedAt,
      highPriorityEdgeSubclasses:u.dgojOnlineLicensed.highPriorityEdgeSubclasses.length,
      regionalLandBasedStatus:u.regionalLandBased.status,
      operationalLibraryJurisdiction:'ES',
      foreignHistoricalRowsAllowed:0,
      foreignExecutionCandidatesAllowed:false,
      nationwideCompletenessClaimAllowed:false
    };
  }

  spainOnlySearch(url){
    const requested=(url.searchParams.get('jurisdiction')||'ES').toUpperCase();
    if(requested!=='ES'){
      return {
        query:{jurisdiction:requested},
        rows:[],returned:0,
        rejected:true,
        reason:'OPERATIONAL_LIBRARY_IS_SPAIN_ONLY'
      };
    }
    const copy=new URL(url.toString());
    copy.searchParams.set('jurisdiction','ES');
    return super.librarySearchV2(copy);
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/library/universe')return responseJson({
      ok:true,
      service:'loterias-edge-sentinel',
      deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
      summary:this.spainUniverseSummary(),
      universe:SPAIN_PLAYABLE_UNIVERSE,
      guards:{
        operationalLibrarySpainOnly:true,
        foreignMechanismReferencesNonOperational:true,
        regionalCoverageMustBeExplicit:true,
        realMoneyAllowed:false
      }
    });
    if(path==='/library/search')return responseJson({
      ok:true,
      ...this.spainOnlySearch(url),
      guards:{
        operationalLibrarySpainOnly:true,
        exactCombinationFilterAvailable:true,
        historicalPatternIsNotPredictiveProof:true,
        libraryCannotEnableRealMoney:true
      }
    });
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/library/summary','/library/sources','/library/record','/library/coverage'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),spainOnlyOperationalLibrary:true,spainPlayableUniverse:true,foreignHistoricalRowsRejected:true};
      body.operationalLibraryJurisdiction='ES';
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
