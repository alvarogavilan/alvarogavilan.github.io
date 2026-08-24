import { EdgeSentinel as V14EdgeSentinel } from './index-v14.mjs';
import { SPAIN_RESERVED_LOTTERY_PRODUCTS,SPAIN_LICENSED_OPERATOR_DOMAINS,SPAIN_ELIGIBILITY_POLICY } from './spain-eligibility-bootstrap-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v15-spain-eligibility-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

export class EdgeSentinel extends V14EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS spain_playability (
      entity_key TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      game_id TEXT,
      name TEXT NOT NULL,
      operator TEXT,
      brand TEXT,
      domain TEXT,
      channel_class TEXT NOT NULL,
      evidence_url TEXT NOT NULL,
      verified_for_spain INTEGER NOT NULL,
      registered_at TEXT NOT NULL
    )`);
    this.seedSpainPlayability();
  }

  seedSpainPlayability(){
    const now=new Date().toISOString();
    for(const x of SPAIN_RESERVED_LOTTERY_PRODUCTS){
      this.sql.exec(`INSERT OR REPLACE INTO spain_playability(entity_key,entity_type,game_id,name,operator,brand,domain,channel_class,evidence_url,verified_for_spain,registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        `lottery:${x.gameId}`,'LOTTERY_PRODUCT',x.gameId,x.name,x.operator,null,null,x.channelClass,x.officialUrl,1,now);
    }
    for(const x of SPAIN_LICENSED_OPERATOR_DOMAINS){
      this.sql.exec(`INSERT OR REPLACE INTO spain_playability(entity_key,entity_type,game_id,name,operator,brand,domain,channel_class,evidence_url,verified_for_spain,registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        `operator:${x.operatorId}`,'LICENSED_OPERATOR',null,x.brand,x.operator,x.brand,x.domain,'DGOJ_LICENSED_ONLINE_OPERATOR',x.dgojUrl,1,now);
    }
  }

  lotteryEligible(gameId){
    const g=norm(gameId);if(!g)return false;
    return SPAIN_RESERVED_LOTTERY_PRODUCTS.some(x=>norm(x.gameId)===g);
  }
  operatorEligible(operator){
    const o=norm(operator);if(!o)return false;
    return SPAIN_LICENSED_OPERATOR_DOMAINS.some(x=>[x.operator,x.brand,x.domain].some(v=>norm(v)===o));
  }
  eligibleForOperationalLibrary(r){
    if(norm(r?.jurisdiction)!=='es')return {eligible:false,reason:'JURISDICTION_NOT_SPAIN'};
    const domain=norm(r?.domain);
    if(domain==='lottery')return this.lotteryEligible(r?.gameOrDrawId)?{eligible:true,reason:'SPAIN_RESERVED_LOTTERY_PRODUCT'}:{eligible:false,reason:'LOTTERY_NOT_VERIFIED_SELAE_OR_ONCE_PRODUCT'};
    if(domain==='slot_jackpot')return this.operatorEligible(r?.operator)?{eligible:true,reason:'SPAIN_DGOJ_OPERATOR'}:{eligible:false,reason:'ONLINE_OPERATOR_NOT_VERIFIED_FOR_SPAIN'};
    return {eligible:false,reason:'DOMAIN_NOT_IN_OPERATIONAL_SPAIN_CATALOGUE'};
  }

  playabilitySummary(){
    const rows=[...this.sql.exec(`SELECT * FROM spain_playability WHERE verified_for_spain=1 ORDER BY entity_type,name`)];
    return {
      version:'edge-spain-playability-v1',
      policy:SPAIN_ELIGIBILITY_POLICY,
      verifiedLotteryProducts:rows.filter(x=>x.entity_type==='LOTTERY_PRODUCT').length,
      verifiedOnlineOperatorsSeeded:rows.filter(x=>x.entity_type==='LICENSED_OPERATOR').length,
      dgojLicensedOperatorUniverseObserved:78,
      catalogueCompleteness:'BOOTSTRAP_NOT_EXHAUSTIVE_FOR_ALL_DGOJ_OPERATORS_OR_EVERY_GAME_PAGE',
      rows:rows.map(x=>({entityKey:x.entity_key,entityType:x.entity_type,gameId:x.game_id,name:x.name,operator:x.operator,brand:x.brand,domain:x.domain,channelClass:x.channel_class,evidenceUrl:x.evidence_url,verifiedForSpain:Number(x.verified_for_spain)===1})),
      guards:{foreignLotteryProductsExcluded:true,spainEligibilityDoesNotEqualPositiveEV:true,exactGameAvailabilityStillRequiredForExecution:true,executionContractRemainsSoleGreenAuthority:true,realMoneyAllowed:false}
    };
  }

  async importLibrary(request){
    if(!this.importAuthorized(request))return responseJson({ok:false,error:'LIBRARY_IMPORT_NOT_AUTHORIZED'},403);
    let body;try{body=await request.json();}catch{return responseJson({ok:false,error:'INVALID_JSON'},400);}
    const records=Array.isArray(body?.records)?body.records:[];
    if(!records.length||records.length>500)return responseJson({ok:false,error:'RECORD_BATCH_MUST_BE_1_TO_500'},400);
    let imported=0;const rejected=[],errors=[];
    for(let i=0;i<records.length;i++){
      const verdict=this.eligibleForOperationalLibrary(records[i]);
      if(!verdict.eligible){rejected.push({index:i,reason:verdict.reason,recordUid:records[i]?.recordUid||null});continue;}
      try{this.insertLibraryRecord(records[i]);imported++;}catch(e){errors.push({index:i,error:String(e?.message||e)});}
    }
    const ok=rejected.length===0&&errors.length===0;
    return responseJson({ok,imported,rejected,errors,guards:{spainOnlyOperationalImport:true,foreignLotteryHistoryRejected:true,importDoesNotEnableExecution:true}},ok?200:207);
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/eligibility/spain')return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,playability:this.playabilitySummary()});
    if(path==='/eligibility/spain/check'){
      const candidate={jurisdiction:'ES',domain:url.searchParams.get('domain'),gameOrDrawId:url.searchParams.get('gameId'),operator:url.searchParams.get('operator')};
      return responseJson({ok:true,candidate,verdict:this.eligibleForOperationalLibrary(candidate),guards:{eligibilityIsLegalAccessGateNotEV:true}});
    }
    if(path==='/library/import'&&request.method==='POST')return this.importLibrary(request);
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/library/summary','/library/sources','/library/search','/library/record','/library/coverage'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),spainEligibilityGate:true,foreignLotteryImportRejected:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
