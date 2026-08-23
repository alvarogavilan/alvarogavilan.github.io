import { EdgeSentinel as V5EdgeSentinel } from './index-v5.mjs';

const SCIENCE_KEY='scienceTelemetryV1';
const GAP_MS=15000;
const MIRROR_EPS_EUR=0.02;
const STABLE_MIRROR_SAMPLES=12;
const RESET_MIN_ABS_EUR=1;
const RESET_MIN_REL=0.20;

function responseJson(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function clone(v,fallback){try{return structuredClone(v);}catch{return fallback;}}

export class EdgeSentinel extends V5EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS science_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observed_at_ms INTEGER NOT NULL,
      observed_at TEXT NOT NULL,
      type TEXT NOT NULL,
      meter_key TEXT,
      before_eur REAL,
      after_eur REAL,
      delta_eur REAL,
      metadata_json TEXT
    )`);
  }

  insertScienceEvent({observedAtMs,observedAt,type,meterKey=null,beforeEUR=null,afterEUR=null,deltaEUR=null,metadata={}}){
    this.sql.exec(
      `INSERT INTO science_events(observed_at_ms,observed_at,type,meter_key,before_eur,after_eur,delta_eur,metadata_json)
       VALUES (?,?,?,?,?,?,?,?)`,
      observedAtMs,observedAt,type,meterKey,beforeEUR,afterEUR,deltaEUR,JSON.stringify(metadata||{})
    );
  }

  computeMirrors(meters,priorStreaks,observedAt){
    const keys=Object.keys(meters||{}).sort();
    const next={};
    for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
      const a=keys[i],b=keys[j],av=Number(meters[a]),bv=Number(meters[b]);
      if(!Number.isFinite(av)||!Number.isFinite(bv))continue;
      const diff=Math.abs(av-bv);
      if(diff>MIRROR_EPS_EUR)continue;
      const id=`${a}|${b}`,prior=priorStreaks?.[id];
      next[id]={
        a,b,
        samples:Number(prior?.samples||0)+1,
        firstObservedAt:prior?.firstObservedAt||observedAt,
        lastObservedAt:observedAt,
        maxAbsDiffEUR:Math.max(Number(prior?.maxAbsDiffEUR||0),diff),
        note:'CORRELATED_METER_CANDIDATE_NOT_IDENTITY_PROOF'
      };
    }
    return next;
  }

  async updateScienceTelemetry(){
    const state=(await this.ctx.storage.get('state'))||{};
    const observedAtMs=Number(state?.observedAtMs);
    const observedAt=state?.observedAt;
    const meters=state?.meters||{};
    if(!Number.isFinite(observedAtMs)||!observedAt||!Object.keys(meters).length)return await this.ctx.storage.get(SCIENCE_KEY)||null;

    const prior=(await this.ctx.storage.get(SCIENCE_KEY))||{};
    if(Number(prior?.lastObservedAtMs)===observedAtMs)return prior;

    const firstSample=!Number.isFinite(Number(prior?.lastObservedAtMs));
    const gapMs=firstSample?null:observedAtMs-Number(prior.lastObservedAtMs);
    let transitionCount=Number(prior?.transitionCount||0),gapCount=Number(prior?.gapCount||0),maxGapMs=Number(prior?.maxGapMs||0);
    if(!firstSample){
      transitionCount+=1;
      if(gapMs>GAP_MS){
        gapCount+=1;maxGapMs=Math.max(maxGapMs,gapMs);
        this.insertScienceEvent({observedAtMs,observedAt,type:'CONTINUITY_GAP',metadata:{gapMs,expectedPollMs:Number(state?.pollingEveryMs||5000)}});
      }
    }

    const stats=clone(prior?.meterStats||{},{}),lastMeters=prior?.lastMeters||{};
    for(const [key,valueRaw] of Object.entries(meters)){
      const value=Number(valueRaw);if(!Number.isFinite(value))continue;
      const s=stats[key]||{firstSeenAt:observedAt,lastSeenAt:observedAt,samples:0,changes:0,drops:0,minEUR:value,maxEUR:value,lastEUR:value,lastChangeAt:null,largestDropEUR:0,largestDropRelative:0,largestRiseEUR:0};
      s.samples=Number(s.samples||0)+1;s.lastSeenAt=observedAt;s.minEUR=Math.min(Number(s.minEUR),value);s.maxEUR=Math.max(Number(s.maxEUR),value);
      const prev=Number(lastMeters[key]);
      if(Number.isFinite(prev)){
        const delta=value-prev;
        if(Math.abs(delta)>=0.000001){s.changes=Number(s.changes||0)+1;s.lastChangeAt=observedAt;}
        if(delta<0){
          const drop=-delta,rel=prev>0?drop/prev:0;s.drops=Number(s.drops||0)+1;
          s.largestDropEUR=Math.max(Number(s.largestDropEUR||0),drop);s.largestDropRelative=Math.max(Number(s.largestDropRelative||0),rel);
          if(drop>=RESET_MIN_ABS_EUR&&rel>=RESET_MIN_REL){
            this.insertScienceEvent({observedAtMs,observedAt,type:'RESET_OR_AWARD_CANDIDATE',meterKey:key,beforeEUR:prev,afterEUR:value,deltaEUR:delta,metadata:{dropEUR:drop,dropRelative:rel,classification:'CANDIDATE_ONLY_NOT_PRIZE_PROOF'}});
          }
        }else if(delta>0){s.largestRiseEUR=Math.max(Number(s.largestRiseEUR||0),delta);}
      }
      s.lastEUR=value;stats[key]=s;
    }

    const mirrorStreaks=this.computeMirrors(meters,prior?.mirrorStreaks||{},observedAt);
    const stableMirrors=Object.values(mirrorStreaks).filter(x=>Number(x.samples)>=STABLE_MIRROR_SAMPLES);
    const sampleCount=Number(prior?.sampleCount||0)+1;
    const gapFreeTransitions=Math.max(0,transitionCount-gapCount);
    const out={
      version:'edge-science-telemetry-v1',
      firstObservedAt:prior?.firstObservedAt||observedAt,
      lastObservedAt:observedAt,
      lastObservedAtMs:observedAtMs,
      sampleCount,transitionCount,gapCount,maxGapMs,
      gapFreePct:transitionCount?gapFreeTransitions/transitionCount:1,
      expectedPollMs:Number(state?.pollingEveryMs||5000),
      canonicalCount:Number(state?.canonicalCount||Object.keys(meters).length),
      ambiguousKeys:Array.isArray(state?.ambiguousKeys)?state.ambiguousKeys:[],
      meterStats:stats,
      lastMeters:meters,
      mirrorStreaks,
      stableMirrorCandidates:stableMirrors,
      guards:{
        resetCandidateIsNotPrizeProof:true,
        mirrorCandidateIsNotIdentityProof:true,
        telemetryCannotEnableRealMoney:true,
        signalStillControlledByExecutionContract:true
      }
    };
    await this.ctx.storage.put(SCIENCE_KEY,out);
    return out;
  }

  scienceSummary(t){
    if(!t)return null;
    return {version:t.version,firstObservedAt:t.firstObservedAt,lastObservedAt:t.lastObservedAt,sampleCount:t.sampleCount,transitionCount:t.transitionCount,gapCount:t.gapCount,gapFreePct:t.gapFreePct,maxGapMs:t.maxGapMs,metersTracked:Object.keys(t.meterStats||{}).length,stableMirrorCandidates:(t.stableMirrorCandidates||[]).length};
  }

  recentScienceEvents(limit=50){
    const n=Math.max(1,Math.min(500,Number(limit)||50));
    return [...this.sql.exec(`SELECT * FROM science_events ORDER BY observed_at_ms DESC LIMIT ?`,n)].map(r=>({...r,metadata:r.metadata_json?JSON.parse(r.metadata_json):null}));
  }

  async alarm(){
    await super.alarm();
    try{await this.updateScienceTelemetry();}catch{}
  }

  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/science/status'){
      await this.ensureAlarm();
      const telemetry=await this.updateScienceTelemetry();
      const state=(await this.ctx.storage.get('state'))||{};
      const proof=await this.ctx.storage.get('telegramDeliveryProofV1');
      return responseJson({ok:true,service:'loterias-edge-sentinel',science:this.scienceSummary(telemetry),telemetry,recentEvents:this.recentScienceEvents(Number(url.searchParams.get('events')||25)),signal:state.signal||null,telegramDeliveryVerified:proof?.sent===true});
    }
    if(url.pathname==='/science/events'){
      await this.ensureAlarm();
      return responseJson({ok:true,rows:this.recentScienceEvents(Number(url.searchParams.get('limit')||100)),guards:{candidateEventsAreResearchOnly:true}});
    }

    const response=await super.fetch(request);
    try{
      if(!['/','/health','/state'].includes(url.pathname))return response;
      const body=await response.clone().json();
      const telemetry=await this.updateScienceTelemetry();
      body.science=this.scienceSummary(telemetry);
      return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
