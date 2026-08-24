import { EdgeSentinel as V15EdgeSentinel } from './index-v15.mjs';
import { SPAIN_PLAYABLE_UNIVERSE } from './spain-playable-universe-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v16-spain-lottery-import-gate-20260824a';
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const LOTTERY_ALIASES=new Map([
  ['el-gordo-de-la-primitiva','el-gordo-primitiva'],
  ['el-quinigol','quinigol'],
  ['sueldazo-fin-de-semana','sueldazo-fin-semana'],
  ['triplex-de-la-once','triplex'],
  ['mi-dia-de-la-once','mi-dia'],
  ['dupla-de-la-once','dupla']
]);
function canonical(v){const n=norm(v);return LOTTERY_ALIASES.get(n)||n;}

export class EdgeSentinel extends V15EdgeSentinel{
  spanishLotteryProductSet(){
    const all=[...SPAIN_PLAYABLE_UNIVERSE.stateReservedLotteries.selae,...SPAIN_PLAYABLE_UNIVERSE.stateReservedLotteries.once];
    const set=new Set();
    for(const x of all){set.add(canonical(x.id));set.add(canonical(x.name));}
    return set;
  }
  lotteryImportEligible(r){
    const set=this.spanishLotteryProductSet();
    const id=canonical(r?.gameOrDrawId),name=canonical(r?.gameOrDraw);
    return Boolean((id&&set.has(id))||(name&&set.has(name)));
  }
  async importLibrarySpainStrict(request){
    if(!this.importAuthorized(request))return responseJson({ok:false,error:'LIBRARY_IMPORT_NOT_AUTHORIZED'},403);
    let body;try{body=await request.json();}catch{return responseJson({ok:false,error:'INVALID_JSON'},400);}
    const records=Array.isArray(body?.records)?body.records:[];
    if(!records.length||records.length>500)return responseJson({ok:false,error:'RECORD_BATCH_MUST_BE_1_TO_500'},400);
    let imported=0;const rejected=[],errors=[];
    for(let i=0;i<records.length;i++){
      const r=records[i]||{};
      if(String(r.jurisdiction||'').trim().toUpperCase()!=='ES'){
        rejected.push({index:i,recordUid:r.recordUid||null,reason:'SPAIN_ONLY_LIBRARY_REJECTS_NON_ES_RECORD'});continue;
      }
      if(String(r.domain||'').trim().toUpperCase()==='LOTTERY'&&!this.lotteryImportEligible(r)){
        rejected.push({index:i,recordUid:r.recordUid||null,reason:'LOTTERY_PRODUCT_NOT_IN_SELAE_ONCE_UNIVERSE'});continue;
      }
      try{this.insertLibraryRecord(r);imported++;}catch(e){errors.push({index:i,recordUid:r.recordUid||null,error:String(e?.message||e)});}
    }
    const ok=!rejected.length&&!errors.length;
    return responseJson({ok,imported,rejected,errors,guards:{spainOnlyOperationalImport:true,lotteryProductMustMatchSELAEOrONCEUniverse:true,foreignLotteryMislabelProtection:true,importDoesNotEnableExecution:true}},ok?200:207);
  }
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/library/import'&&request.method==='POST')return this.importLibrarySpainStrict(request);
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),spainLotteryImportAllowlist:true,foreignLotteryMislabelProtection:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
