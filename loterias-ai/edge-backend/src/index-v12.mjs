import { EdgeSentinel as V11EdgeSentinel } from './index-v11.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v12-jackpot-cycles-20260824a';
const RESET_MIN_ABS_EUR=1;
const RESET_MIN_REL=0.20;
const EPS=1e-9;

function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}

export class EdgeSentinel extends V11EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meter_active_cycles (
      meter_key TEXT PRIMARY KEY,
      cycle_started_at_ms INTEGER NOT NULL,
      cycle_started_at TEXT NOT NULL,
      cycle_start_eur REAL NOT NULL,
      start_boundary_exact INTEGER NOT NULL DEFAULT 0,
      start_boundary_class TEXT NOT NULL,
      last_observed_at_ms INTEGER NOT NULL,
      last_observed_at TEXT NOT NULL,
      last_eur REAL NOT NULL,
      observations INTEGER NOT NULL,
      peak_eur REAL NOT NULL,
      peak_observed_at_ms INTEGER NOT NULL,
      peak_observed_at TEXT NOT NULL,
      trough_eur REAL NOT NULL,
      trough_observed_at_ms INTEGER NOT NULL,
      trough_observed_at TEXT NOT NULL,
      cumulative_rise_eur REAL NOT NULL DEFAULT 0,
      cumulative_fall_eur REAL NOT NULL DEFAULT 0,
      max_step_rise_eur REAL NOT NULL DEFAULT 0,
      max_step_fall_eur REAL NOT NULL DEFAULT 0
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meter_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meter_key TEXT NOT NULL,
      cycle_started_at_ms INTEGER NOT NULL,
      cycle_started_at TEXT NOT NULL,
      cycle_start_eur REAL NOT NULL,
      start_boundary_exact INTEGER NOT NULL,
      start_boundary_class TEXT NOT NULL,
      cycle_ended_at_ms INTEGER NOT NULL,
      cycle_ended_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      observations INTEGER NOT NULL,
      peak_eur REAL NOT NULL,
      peak_observed_at_ms INTEGER NOT NULL,
      peak_observed_at TEXT NOT NULL,
      trough_eur REAL NOT NULL,
      trough_observed_at_ms INTEGER NOT NULL,
      trough_observed_at TEXT NOT NULL,
      cumulative_rise_eur REAL NOT NULL,
      cumulative_fall_eur REAL NOT NULL,
      max_step_rise_eur REAL NOT NULL,
      max_step_fall_eur REAL NOT NULL,
      pre_drop_eur REAL NOT NULL,
      post_drop_eur REAL NOT NULL,
      closing_drop_eur REAL NOT NULL,
      closing_drop_relative REAL NOT NULL,
      close_class TEXT NOT NULL,
      award_verified INTEGER NOT NULL DEFAULT 0,
      created_at_ms INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS meter_cycles_meter_end_idx ON meter_cycles(meter_key,cycle_ended_at_ms DESC)`);
  }

  insertActiveCycle({key,value,observedAtMs,observedAt,startBoundaryExact,startBoundaryClass}){
    this.sql.exec(`INSERT OR REPLACE INTO meter_active_cycles(
      meter_key,cycle_started_at_ms,cycle_started_at,cycle_start_eur,start_boundary_exact,start_boundary_class,
      last_observed_at_ms,last_observed_at,last_eur,observations,
      peak_eur,peak_observed_at_ms,peak_observed_at,trough_eur,trough_observed_at_ms,trough_observed_at,
      cumulative_rise_eur,cumulative_fall_eur,max_step_rise_eur,max_step_fall_eur
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      key,observedAtMs,observedAt,value,startBoundaryExact?1:0,startBoundaryClass,
      observedAtMs,observedAt,value,1,
      value,observedAtMs,observedAt,value,observedAtMs,observedAt,
      0,0,0,0
    );
  }

  closeCycle(active,{key,value,observedAtMs,observedAt,dropEUR,dropRelative}){
    const durationMs=Math.max(0,observedAtMs-Number(active.cycle_started_at_ms));
    this.sql.exec(`INSERT INTO meter_cycles(
      meter_key,cycle_started_at_ms,cycle_started_at,cycle_start_eur,start_boundary_exact,start_boundary_class,
      cycle_ended_at_ms,cycle_ended_at,duration_ms,observations,
      peak_eur,peak_observed_at_ms,peak_observed_at,trough_eur,trough_observed_at_ms,trough_observed_at,
      cumulative_rise_eur,cumulative_fall_eur,max_step_rise_eur,max_step_fall_eur,
      pre_drop_eur,post_drop_eur,closing_drop_eur,closing_drop_relative,close_class,award_verified,created_at_ms
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      key,Number(active.cycle_started_at_ms),active.cycle_started_at,Number(active.cycle_start_eur),Number(active.start_boundary_exact),active.start_boundary_class,
      observedAtMs,observedAt,durationMs,Number(active.observations),
      Number(active.peak_eur),Number(active.peak_observed_at_ms),active.peak_observed_at,Number(active.trough_eur),Number(active.trough_observed_at_ms),active.trough_observed_at,
      Number(active.cumulative_rise_eur),Number(active.cumulative_fall_eur),Number(active.max_step_rise_eur),Number(active.max_step_fall_eur),
      Number(active.last_eur),value,dropEUR,dropRelative,'RESET_OR_AWARD_CANDIDATE',0,observedAtMs
    );
    try{this.insertScienceEvent({
      observedAtMs,observedAt,type:'CYCLE_CLOSED_CANDIDATE',meterKey:key,
      beforeEUR:Number(active.last_eur),afterEUR:value,deltaEUR:value-Number(active.last_eur),
      metadata:{
        startBoundaryExact:Number(active.start_boundary_exact)===1,
        cycleCompleteness:Number(active.start_boundary_exact)===1?'FULL_OBSERVED_BETWEEN_RESET_CANDIDATE_BOUNDARIES':'LEFT_CENSORED_STARTED_MID_CYCLE',
        observedPeakEUR:Number(active.peak_eur),durationMs,dropEUR,dropRelative,
        awardVerified:false,classification:'CANDIDATE_CYCLE_ONLY_NOT_JACKPOT_AWARD_PROOF'
      }
    });}catch{}
  }

  async updateCycleLedger(){
    const state=(await this.ctx.storage.get('state'))||{};
    const observedAtMs=Number(state?.observedAtMs);
    const observedAt=state?.observedAt;
    const meters=state?.meters||{};
    if(!Number.isFinite(observedAtMs)||!observedAt||!Object.keys(meters).length)return this.cycleSummary();

    for(const [key,raw] of Object.entries(meters)){
      const value=Number(raw);if(!Number.isFinite(value))continue;
      const active=[...this.sql.exec(`SELECT * FROM meter_active_cycles WHERE meter_key=? LIMIT 1`,key)][0]||null;
      if(!active){
        this.insertActiveCycle({key,value,observedAtMs,observedAt,startBoundaryExact:false,startBoundaryClass:'LEFT_CENSORED_FIRST_V12_OBSERVATION'});
        continue;
      }
      if(Number(active.last_observed_at_ms)===observedAtMs)continue;
      const prev=Number(active.last_eur);
      const delta=value-prev;
      const dropEUR=delta<0?-delta:0;
      const dropRelative=delta<0&&prev>0?dropEUR/prev:0;
      const qualifyingReset=dropEUR>=RESET_MIN_ABS_EUR&&dropRelative>=RESET_MIN_REL;
      if(qualifyingReset){
        this.closeCycle(active,{key,value,observedAtMs,observedAt,dropEUR,dropRelative});
        this.insertActiveCycle({key,value,observedAtMs,observedAt,startBoundaryExact:true,startBoundaryClass:'OBSERVED_RESET_OR_AWARD_CANDIDATE_BOUNDARY'});
        continue;
      }

      let peak=Number(active.peak_eur),peakMs=Number(active.peak_observed_at_ms),peakAt=active.peak_observed_at;
      let trough=Number(active.trough_eur),troughMs=Number(active.trough_observed_at_ms),troughAt=active.trough_observed_at;
      if(value>peak+EPS){peak=value;peakMs=observedAtMs;peakAt=observedAt;}
      if(value<trough-EPS){trough=value;troughMs=observedAtMs;troughAt=observedAt;}
      const rise=delta>0?delta:0,fall=delta<0?-delta:0;
      this.sql.exec(`UPDATE meter_active_cycles SET
        last_observed_at_ms=?,last_observed_at=?,last_eur=?,observations=?,
        peak_eur=?,peak_observed_at_ms=?,peak_observed_at=?,
        trough_eur=?,trough_observed_at_ms=?,trough_observed_at=?,
        cumulative_rise_eur=?,cumulative_fall_eur=?,max_step_rise_eur=?,max_step_fall_eur=?
        WHERE meter_key=?`,
        observedAtMs,observedAt,value,Number(active.observations)+1,
        peak,peakMs,peakAt,trough,troughMs,troughAt,
        Number(active.cumulative_rise_eur)+rise,Number(active.cumulative_fall_eur)+fall,
        Math.max(Number(active.max_step_rise_eur),rise),Math.max(Number(active.max_step_fall_eur),fall),key
      );
    }
    return this.cycleSummary();
  }

  cycleSummary(){
    const completed=[...this.sql.exec(`SELECT COUNT(*) AS n,
      SUM(CASE WHEN start_boundary_exact=1 THEN 1 ELSE 0 END) AS full_n,
      SUM(CASE WHEN award_verified=1 THEN 1 ELSE 0 END) AS verified_award_n
      FROM meter_cycles`)][0]||{};
    const active=[...this.sql.exec(`SELECT COUNT(*) AS n FROM meter_active_cycles`)][0]||{};
    return {
      activeMeters:Number(active.n||0),
      completedCandidateCycles:Number(completed.n||0),
      fullObservedCandidateCycles:Number(completed.full_n||0),
      verifiedAwardCycles:Number(completed.verified_award_n||0),
      resetDefinition:{minimumAbsoluteDropEUR:RESET_MIN_ABS_EUR,minimumRelativeDrop:RESET_MIN_REL},
      scope:'DIRECT_EDGE_OBSERVATIONS_FROM_V12_FORWARD'
    };
  }

  cycleRows({meterKey=null,limit=200}={}){
    const n=Math.max(1,Math.min(2000,Number(limit)||200));
    const rows=meterKey
      ?[...this.sql.exec(`SELECT * FROM meter_cycles WHERE meter_key=? ORDER BY cycle_ended_at_ms DESC LIMIT ?`,meterKey,n)]
      :[...this.sql.exec(`SELECT * FROM meter_cycles ORDER BY cycle_ended_at_ms DESC LIMIT ?`,n)];
    return rows.map(r=>({
      id:Number(r.id),meterKey:r.meter_key,
      cycleStartedAt:r.cycle_started_at,cycleStartEUR:Number(r.cycle_start_eur),startBoundaryExact:Number(r.start_boundary_exact)===1,startBoundaryClass:r.start_boundary_class,
      cycleEndedAt:r.cycle_ended_at,durationMs:Number(r.duration_ms),observations:Number(r.observations),
      observedPeakEUR:Number(r.peak_eur),peakObservedAt:r.peak_observed_at,
      observedTroughEUR:Number(r.trough_eur),troughObservedAt:r.trough_observed_at,
      cumulativeRiseEUR:Number(r.cumulative_rise_eur),cumulativeFallEUR:Number(r.cumulative_fall_eur),
      maxStepRiseEUR:Number(r.max_step_rise_eur),maxStepFallEUR:Number(r.max_step_fall_eur),
      preDropEUR:Number(r.pre_drop_eur),postDropEUR:Number(r.post_drop_eur),closingDropEUR:Number(r.closing_drop_eur),closingDropRelative:Number(r.closing_drop_relative),
      closeClass:r.close_class,awardVerified:Number(r.award_verified)===1,
      cycleCompleteness:Number(r.start_boundary_exact)===1?'FULL_OBSERVED_BETWEEN_RESET_CANDIDATE_BOUNDARIES':'LEFT_CENSORED_STARTED_MID_CYCLE'
    }));
  }

  activeCycleRows(){
    return [...this.sql.exec(`SELECT * FROM meter_active_cycles ORDER BY meter_key ASC`)].map(r=>({
      meterKey:r.meter_key,cycleStartedAt:r.cycle_started_at,cycleStartEUR:Number(r.cycle_start_eur),
      startBoundaryExact:Number(r.start_boundary_exact)===1,startBoundaryClass:r.start_boundary_class,
      lastObservedAt:r.last_observed_at,currentEUR:Number(r.last_eur),observations:Number(r.observations),
      observedPeakEUR:Number(r.peak_eur),peakObservedAt:r.peak_observed_at,
      observedTroughEUR:Number(r.trough_eur),troughObservedAt:r.trough_observed_at,
      cumulativeRiseEUR:Number(r.cumulative_rise_eur),cumulativeFallEUR:Number(r.cumulative_fall_eur),
      observedDurationMs:Math.max(0,Number(r.last_observed_at_ms)-Number(r.cycle_started_at_ms)),
      cycleCompleteness:Number(r.start_boundary_exact)===1?'ACTIVE_WITH_EXACT_OBSERVED_START_BOUNDARY':'ACTIVE_LEFT_CENSORED_START_UNKNOWN'
    }));
  }

  perMeterCycleStats(){
    return [...this.sql.exec(`SELECT meter_key,
      COUNT(*) AS cycle_count,
      SUM(CASE WHEN start_boundary_exact=1 THEN 1 ELSE 0 END) AS full_count,
      AVG(CASE WHEN start_boundary_exact=1 THEN peak_eur END) AS avg_full_peak,
      MAX(CASE WHEN start_boundary_exact=1 THEN peak_eur END) AS max_full_peak,
      AVG(CASE WHEN start_boundary_exact=1 THEN duration_ms END) AS avg_full_duration_ms,
      AVG(CASE WHEN start_boundary_exact=1 THEN pre_drop_eur END) AS avg_full_pre_drop
      FROM meter_cycles GROUP BY meter_key ORDER BY meter_key ASC`)].map(r=>({
        meterKey:r.meter_key,candidateCycleCount:Number(r.cycle_count||0),fullObservedCandidateCycleCount:Number(r.full_count||0),
        averageFullObservedPeakEUR:finite(r.avg_full_peak)?Number(r.avg_full_peak):null,
        maximumFullObservedPeakEUR:finite(r.max_full_peak)?Number(r.max_full_peak):null,
        averageFullObservedDurationMs:finite(r.avg_full_duration_ms)?Number(r.avg_full_duration_ms):null,
        averageFullObservedPreDropEUR:finite(r.avg_full_pre_drop)?Number(r.avg_full_pre_drop):null
      }));
  }

  async cycleResearch({meterKey=null,limit=200}={}){
    await this.updateCycleLedger();
    return {
      version:'edge-jackpot-cycle-ledger-v1',
      summary:this.cycleSummary(),
      filter:{meterKey:meterKey||null},
      perMeter:this.perMeterCycleStats(),
      active:this.activeCycleRows(),
      recentCompleted:this.cycleRows({meterKey,limit}),
      guards:{
        resetCandidateIsNotVerifiedAward:true,
        completedCandidateCycleIsNotJackpotWinProof:true,
        firstV12CycleMayBeLeftCensored:true,
        noPreV12FullCycleFabrication:true,
        cyclePeakIsObservedPeakNotGlobalMaximum:true,
        cycleStatisticsDoNotProveHazard:true,
        cycleStatisticsCannotEnableRealMoney:true,
        executionContractRemainsSoleGreenAuthority:true,
        realMoneyAllowed:false
      }
    };
  }

  async alarm(){
    await super.alarm();
    try{await this.updateCycleLedger();}catch{}
  }

  async fetch(request){
    const url=new URL(request.url);
    const path=url.pathname;
    if(path==='/science/cycles'){
      await this.ensureAlarm();
      const research=await this.cycleResearch({meterKey:url.searchParams.get('meter')||null,limit:Number(url.searchParams.get('limit')||200)});
      return responseJson({
        ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,
        deploymentCapabilities:{jackpotCycleLedger:true,leftCensoringExplicit:true,observedCyclePeaks:true,executionContractFailClosed:true},
        research
      });
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath'].includes(path))return response;
    try{
      const body=await response.clone().json();
      body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
      body.deploymentCapabilities={...(body.deploymentCapabilities||{}),jackpotCycleLedger:true,leftCensoringExplicit:true,observedCyclePeaks:true};
      return responseJson(body,response.status);
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
