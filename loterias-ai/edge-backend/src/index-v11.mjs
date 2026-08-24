import { EdgeSentinel as V10EdgeSentinel } from './index-v10.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v11-ath-ledger-20260824a';
const SCIENCE_KEY='scienceTelemetryV1';
const EPS=1e-9;

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function asMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:null;}

export class EdgeSentinel extends V10EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meter_ath (
      meter_key TEXT PRIMARY KEY,
      first_seen_at_ms INTEGER,
      first_seen_at TEXT,
      last_seen_at_ms INTEGER NOT NULL,
      last_seen_at TEXT NOT NULL,
      observations INTEGER NOT NULL,
      min_eur REAL NOT NULL,
      min_observed_at_ms INTEGER,
      min_observed_at TEXT,
      min_timestamp_exact INTEGER NOT NULL DEFAULT 0,
      max_eur REAL NOT NULL,
      max_observed_at_ms INTEGER,
      max_observed_at TEXT,
      max_timestamp_exact INTEGER NOT NULL DEFAULT 0,
      previous_max_eur REAL,
      ath_updates INTEGER NOT NULL DEFAULT 0,
      seeded_from_science_telemetry INTEGER NOT NULL DEFAULT 0
    )`);
  }

  async updateAthLedger(){
    const state=(await this.ctx.storage.get('state'))||{};
    const telemetry=(await this.ctx.storage.get(SCIENCE_KEY))||{};
    const observedAtMs=Number(state?.observedAtMs);
    const observedAt=state?.observedAt;
    const meters=state?.meters||{};
    if(!Number.isFinite(observedAtMs)||!observedAt||!Object.keys(meters).length)return this.athSummary();

    for(const [key,raw] of Object.entries(meters)){
      const value=Number(raw);if(!Number.isFinite(value))continue;
      const existing=[...this.sql.exec(`SELECT * FROM meter_ath WHERE meter_key=? LIMIT 1`,key)][0]||null;
      const science=telemetry?.meterStats?.[key]||null;
      if(!existing){
        const maxEUR=finite(science?.maxEUR)?Number(science.maxEUR):value;
        const minEUR=finite(science?.minEUR)?Number(science.minEUR):value;
        const firstSeen=science?.firstSeenAt||observedAt;
        const samples=Math.max(1,Number(science?.samples||1));
        this.sql.exec(
          `INSERT INTO meter_ath(
            meter_key,first_seen_at_ms,first_seen_at,last_seen_at_ms,last_seen_at,observations,
            min_eur,min_observed_at_ms,min_observed_at,min_timestamp_exact,
            max_eur,max_observed_at_ms,max_observed_at,max_timestamp_exact,
            previous_max_eur,ath_updates,seeded_from_science_telemetry
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          key,asMs(firstSeen),firstSeen,observedAtMs,observedAt,samples,
          minEUR,null,null,0,
          maxEUR,null,null,0,
          null,0,science?1:0
        );
        continue;
      }
      if(Number(existing.last_seen_at_ms)===observedAtMs)continue;

      let minEUR=Number(existing.min_eur),minMs=existing.min_observed_at_ms,minAt=existing.min_observed_at,minExact=Number(existing.min_timestamp_exact||0);
      let maxEUR=Number(existing.max_eur),maxMs=existing.max_observed_at_ms,maxAt=existing.max_observed_at,maxExact=Number(existing.max_timestamp_exact||0);
      let previousMax=existing.previous_max_eur,athUpdates=Number(existing.ath_updates||0);

      if(value<minEUR-EPS){minEUR=value;minMs=observedAtMs;minAt=observedAt;minExact=1;}
      if(value>maxEUR+EPS){
        previousMax=maxEUR;maxEUR=value;maxMs=observedAtMs;maxAt=observedAt;maxExact=1;athUpdates+=1;
        try{this.insertScienceEvent({observedAtMs,observedAt,type:'ALL_TIME_HIGH_OBSERVED',meterKey:key,beforeEUR:Number(previousMax),afterEUR:value,deltaEUR:value-Number(previousMax),metadata:{scope:'SINCE_EDGE_MONITORING',timestampExact:true,globalBeforeEdgeUnknown:true}});}catch{}
      }

      this.sql.exec(
        `UPDATE meter_ath SET
          last_seen_at_ms=?,last_seen_at=?,observations=?,
          min_eur=?,min_observed_at_ms=?,min_observed_at=?,min_timestamp_exact=?,
          max_eur=?,max_observed_at_ms=?,max_observed_at=?,max_timestamp_exact=?,
          previous_max_eur=?,ath_updates=?
         WHERE meter_key=?`,
        observedAtMs,observedAt,Number(existing.observations||0)+1,
        minEUR,minMs,minAt,minExact,
        maxEUR,maxMs,maxAt,maxExact,
        previousMax,athUpdates,key
      );
    }
    return this.athSummary();
  }

  athRows(limit=1000){
    const n=Math.max(1,Math.min(2000,Number(limit)||1000));
    return [...this.sql.exec(`SELECT * FROM meter_ath ORDER BY meter_key ASC LIMIT ?`,n)].map(r=>({
      meterKey:r.meter_key,
      firstSeenAt:r.first_seen_at,
      lastSeenAt:r.last_seen_at,
      observations:Number(r.observations),
      observedMinEUR:Number(r.min_eur),
      minObservedAt:r.min_observed_at||null,
      minTimestampExact:Number(r.min_timestamp_exact)===1,
      observedATHSinceEdgeMonitoringEUR:Number(r.max_eur),
      athObservedAt:r.max_observed_at||null,
      athTimestampExact:Number(r.max_timestamp_exact)===1,
      previousObservedATH_EUR:finite(r.previous_max_eur)?Number(r.previous_max_eur):null,
      athUpdatesAfterV11:Number(r.ath_updates||0),
      seededFromScienceTelemetry:Number(r.seeded_from_science_telemetry)===1,
      globalAllTimeHighBeforeEdge:null,
      scope:'OBSERVED_SINCE_EDGE_SCIENCE_TELEMETRY_NOT_GLOBAL_PRE_MONITORING_HISTORY'
    }));
  }

  athSummary(){
    const rows=[...this.sql.exec(`SELECT COUNT(*) AS n,
      SUM(CASE WHEN max_timestamp_exact=1 THEN 1 ELSE 0 END) AS exact_n,
      SUM(CASE WHEN max_timestamp_exact=0 THEN 1 ELSE 0 END) AS inherited_unknown_n
      FROM meter_ath`)][0]||{};
    return {
      metersTracked:Number(rows.n||0),
      exactAthTimestampCount:Number(rows.exact_n||0),
      inheritedAthTimestampUnknownCount:Number(rows.inherited_unknown_n||0),
      scope:'SINCE_EDGE_SCIENCE_TELEMETRY',
      globalPreMonitoringAllTimeHighKnown:false
    };
  }

  async athResearch(limit=1000){
    await this.updateAthLedger();
    const state=(await this.ctx.storage.get('state'))||{};
    const current=state?.meters||{};
    const rows=this.athRows(limit).map(r=>{
      const currentEUR=finite(current?.[r.meterKey])?Number(current[r.meterKey]):null;
      const ath=r.observedATHSinceEdgeMonitoringEUR;
      return {
        ...r,
        currentEUR,
        currentPctOfObservedATH:currentEUR!==null&&ath>0?currentEUR/ath:null,
        distanceBelowObservedATH_EUR:currentEUR!==null?Math.max(0,ath-currentEUR):null
      };
    });
    return {
      version:'edge-ath-ledger-v1',
      observedAt:state?.observedAt||null,
      summary:this.athSummary(),
      rows,
      guards:{
        observedAthIsNotGlobalPreMonitoringAth:true,
        athProximityIsNotPositiveEv:true,
        athCannotReplaceHazardOrThreshold:true,
        inheritedPreV11AthTimestampMayBeUnknown:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  async alarm(){
    await super.alarm();
    try{await this.updateAthLedger();}catch{}
  }

  async fetch(request){
    const url=new URL(request.url);
    const path=url.pathname;
    if(path==='/science/ath'){
      await this.ensureAlarm();
      const research=await this.athResearch(Number(url.searchParams.get('limit')||1000));
      return responseJson({
        ok:true,
        service:'loterias-edge-sentinel',
        deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        deploymentCapabilities:{allTimeHighLedger:true,athTimestampTracking:true,persistentSnapshots:true,executionContractFailClosed:true},
        research
      });
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),allTimeHighLedger:true,athTimestampTracking:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
