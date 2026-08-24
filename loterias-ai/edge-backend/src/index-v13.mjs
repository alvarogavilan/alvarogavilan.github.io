import { EdgeSentinel as V12EdgeSentinel } from './index-v12.mjs';
import { LIBRARY_SOURCES,LIBRARY_BOOTSTRAP_RECORDS } from './library-bootstrap-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v13-universal-library-20260824a';

function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function safeJson(v,fallback=null){try{return JSON.stringify(v??fallback);}catch{return JSON.stringify(fallback);}}
function parseJson(v,fallback=null){try{return v?JSON.parse(v):fallback;}catch{return fallback;}}
function text(v){return v===null||v===undefined?null:String(v);}
function eventMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:null;}

export class EdgeSentinel extends V12EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS library_sources (
      source_id TEXT PRIMARY KEY,
      authority_class TEXT NOT NULL,
      jurisdiction TEXT,
      publisher TEXT NOT NULL,
      source_url TEXT,
      coverage_note TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      first_registered_at TEXT NOT NULL,
      last_verified_at TEXT
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS library_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_uid TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      record_type TEXT NOT NULL,
      jurisdiction TEXT NOT NULL,
      operator TEXT,
      provider TEXT,
      game_or_draw TEXT NOT NULL,
      game_or_draw_id TEXT,
      pool_or_tier TEXT,
      event_at_ms INTEGER,
      event_at TEXT,
      event_time_precision TEXT NOT NULL,
      currency TEXT,
      amount_value REAL,
      numbers_json TEXT,
      secondary_json TEXT,
      metadata_json TEXT,
      source_id TEXT,
      source_url TEXT,
      source_class TEXT NOT NULL,
      confidence TEXT NOT NULL,
      source_fingerprint TEXT,
      archive_partition TEXT NOT NULL,
      ingested_at_ms INTEGER NOT NULL,
      ingested_at TEXT NOT NULL
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS library_records_event_idx ON library_records(event_at_ms DESC)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS library_records_domain_type_idx ON library_records(domain,record_type,event_at_ms DESC)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS library_records_game_idx ON library_records(game_or_draw_id,event_at_ms DESC)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS library_records_partition_idx ON library_records(archive_partition,event_at_ms DESC)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS library_records_source_idx ON library_records(source_id,event_at_ms DESC)`);
    this.seedStaticLibrary();
  }

  seedStaticLibrary(){
    const now=new Date().toISOString();
    for(const s of LIBRARY_SOURCES){
      this.sql.exec(`INSERT OR IGNORE INTO library_sources(source_id,authority_class,jurisdiction,publisher,source_url,coverage_note,active,first_registered_at,last_verified_at)
        VALUES (?,?,?,?,?,?,?,?,?)`,s.sourceId,s.authorityClass,s.jurisdiction||null,s.publisher,s.sourceUrl||null,s.coverageNote||null,1,now,now);
    }
    for(const r of LIBRARY_BOOTSTRAP_RECORDS)this.insertLibraryRecord(r,{ignoreExisting:true});
  }

  insertLibraryRecord(r,{ignoreExisting=false}={}){
    const nowMs=Date.now(),now=new Date(nowMs).toISOString();
    const uid=String(r?.recordUid||'').trim();
    const domain=String(r?.domain||'').trim();
    const recordType=String(r?.recordType||'').trim();
    const jurisdiction=String(r?.jurisdiction||'').trim();
    const game=String(r?.gameOrDraw||'').trim();
    const precision=String(r?.eventTimePrecision||'UNKNOWN').trim();
    const partition=String(r?.archivePartition||'').trim();
    if(!uid||!domain||!recordType||!jurisdiction||!game||!partition)throw new Error('LIBRARY_RECORD_REQUIRED_FIELDS');
    const sql=ignoreExisting?'INSERT OR IGNORE':'INSERT OR REPLACE';
    this.sql.exec(`${sql} INTO library_records(
      record_uid,domain,record_type,jurisdiction,operator,provider,game_or_draw,game_or_draw_id,pool_or_tier,
      event_at_ms,event_at,event_time_precision,currency,amount_value,numbers_json,secondary_json,metadata_json,
      source_id,source_url,source_class,confidence,source_fingerprint,archive_partition,ingested_at_ms,ingested_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      uid,domain,recordType,jurisdiction,text(r.operator),text(r.provider),game,text(r.gameOrDrawId),text(r.poolOrTier),
      eventMs(r.eventAt),text(r.eventAt),precision,text(r.currency),finite(r.amountValue)?Number(r.amountValue):null,safeJson(r.numbers,[]),safeJson(r.secondary,[]),safeJson(r.metadata,{}),
      text(r.sourceId),text(r.sourceUrl),String(r.sourceClass||'UNKNOWN'),String(r.confidence||'UNVERIFIED'),text(r.sourceFingerprint||uid),partition,nowMs,now
    );
  }

  syncInternalLibrary(){
    const ath=[...this.sql.exec(`SELECT * FROM meter_ath`)];
    for(const r of ath){
      const eventAt=r.max_observed_at||r.last_seen_at;
      this.insertLibraryRecord({
        recordUid:`edge:ath:${r.meter_key}:${Number(r.max_eur).toFixed(6)}`,domain:'SLOT_JACKPOT',recordType:'OBSERVED_ATH',jurisdiction:'ES',operator:'Botemania',provider:null,
        gameOrDraw:r.meter_key,gameOrDrawId:r.meter_key,poolOrTier:null,eventAt,eventTimePrecision:Number(r.max_timestamp_exact)===1?'SECOND':'UNKNOWN',currency:'EUR',amountValue:Number(r.max_eur),numbers:[],secondary:[],
        metadata:{observedMinEUR:Number(r.min_eur),observations:Number(r.observations),athTimestampExact:Number(r.max_timestamp_exact)===1,previousObservedATH_EUR:finite(r.previous_max_eur)?Number(r.previous_max_eur):null,scope:'SINCE_EDGE_MONITORING'},
        sourceId:'edge-direct-telemetry',sourceUrl:null,sourceClass:'INTERNAL_DIRECT_OBSERVATION',confidence:'DIRECT_OBSERVED',archivePartition:`ES:SLOT_JACKPOT:${r.meter_key}:${String(eventAt||'unknown').slice(0,4)}`
      },{ignoreExisting:true});
    }
    const cycles=[...this.sql.exec(`SELECT * FROM meter_cycles`)];
    for(const r of cycles){
      this.insertLibraryRecord({
        recordUid:`edge:cycle:${r.id}`,domain:'SLOT_JACKPOT',recordType:'CYCLE_CLOSED_CANDIDATE',jurisdiction:'ES',operator:'Botemania',provider:null,
        gameOrDraw:r.meter_key,gameOrDrawId:r.meter_key,poolOrTier:null,eventAt:r.cycle_ended_at,eventTimePrecision:'SECOND',currency:'EUR',amountValue:Number(r.pre_drop_eur),numbers:[],secondary:[],
        metadata:{cycleStartedAt:r.cycle_started_at,cycleStartEUR:Number(r.cycle_start_eur),durationMs:Number(r.duration_ms),observations:Number(r.observations),observedPeakEUR:Number(r.peak_eur),observedTroughEUR:Number(r.trough_eur),postDropEUR:Number(r.post_drop_eur),closingDropEUR:Number(r.closing_drop_eur),closingDropRelative:Number(r.closing_drop_relative),startBoundaryExact:Number(r.start_boundary_exact)===1,awardVerified:Number(r.award_verified)===1},
        sourceId:'edge-direct-telemetry',sourceUrl:null,sourceClass:'INTERNAL_DIRECT_OBSERVATION',confidence:'CANDIDATE_BOUNDARY_NOT_AWARD_PROOF',archivePartition:`ES:SLOT_JACKPOT:${r.meter_key}:${String(r.cycle_ended_at||'unknown').slice(0,4)}`
      },{ignoreExisting:true});
    }
    const events=[...this.sql.exec(`SELECT * FROM science_events WHERE type IN ('RESET_OR_AWARD_CANDIDATE','ALL_TIME_HIGH_OBSERVED','CYCLE_CLOSED_CANDIDATE')`)];
    for(const r of events){
      this.insertLibraryRecord({
        recordUid:`edge:science:${r.id}`,domain:'SLOT_JACKPOT',recordType:r.type,jurisdiction:'ES',operator:'Botemania',provider:null,
        gameOrDraw:r.meter_key||'EDGE science event',gameOrDrawId:r.meter_key||null,poolOrTier:null,eventAt:r.observed_at,eventTimePrecision:'SECOND',currency:'EUR',amountValue:finite(r.before_eur)?Number(r.before_eur):finite(r.after_eur)?Number(r.after_eur):null,numbers:[],secondary:[],
        metadata:{beforeEUR:finite(r.before_eur)?Number(r.before_eur):null,afterEUR:finite(r.after_eur)?Number(r.after_eur):null,deltaEUR:finite(r.delta_eur)?Number(r.delta_eur):null,...(parseJson(r.metadata_json,{})||{})},
        sourceId:'edge-direct-telemetry',sourceUrl:null,sourceClass:'INTERNAL_DIRECT_OBSERVATION',confidence:r.type==='ALL_TIME_HIGH_OBSERVED'?'DIRECT_OBSERVED':'CANDIDATE_NOT_AWARD_PROOF',archivePartition:`ES:SLOT_JACKPOT:${r.meter_key||'SCIENCE'}:${String(r.observed_at||'unknown').slice(0,4)}`
      },{ignoreExisting:true});
    }
  }

  librarySources(){return [...this.sql.exec(`SELECT * FROM library_sources ORDER BY authority_class,publisher,source_id`)].map(r=>({sourceId:r.source_id,authorityClass:r.authority_class,jurisdiction:r.jurisdiction,publisher:r.publisher,sourceUrl:r.source_url,coverageNote:r.coverage_note,active:Number(r.active)===1,firstRegisteredAt:r.first_registered_at,lastVerifiedAt:r.last_verified_at}));}

  librarySummary(){
    this.syncInternalLibrary();
    const total=[...this.sql.exec(`SELECT COUNT(*) AS n,MIN(event_at_ms) AS min_ms,MAX(event_at_ms) AS max_ms FROM library_records`)][0]||{};
    const byDomain=[...this.sql.exec(`SELECT domain,COUNT(*) AS n FROM library_records GROUP BY domain ORDER BY n DESC,domain`)];
    const byType=[...this.sql.exec(`SELECT record_type,COUNT(*) AS n FROM library_records GROUP BY record_type ORDER BY n DESC,record_type LIMIT 50`)];
    const byJurisdiction=[...this.sql.exec(`SELECT jurisdiction,COUNT(*) AS n FROM library_records GROUP BY jurisdiction ORDER BY n DESC,jurisdiction`)];
    const sources=[...this.sql.exec(`SELECT COUNT(*) AS n FROM library_sources WHERE active=1`)][0]||{};
    return {version:'edge-universal-library-v1',records:Number(total.n||0),activeSources:Number(sources.n||0),earliestEventAt:finite(total.min_ms)?new Date(Number(total.min_ms)).toISOString():null,latestEventAt:finite(total.max_ms)?new Date(Number(total.max_ms)).toISOString():null,byDomain:byDomain.map(x=>({domain:x.domain,count:Number(x.n)})),byType:byType.map(x=>({recordType:x.record_type,count:Number(x.n)})),byJurisdiction:byJurisdiction.map(x=>({jurisdiction:x.jurisdiction,count:Number(x.n)})),storage:'DURABLE_SQLITE_INTERNAL_LIBRARY',executionAuthority:false};
  }

  libraryRow(r){return {id:Number(r.id),recordUid:r.record_uid,domain:r.domain,recordType:r.record_type,jurisdiction:r.jurisdiction,operator:r.operator,provider:r.provider,gameOrDraw:r.game_or_draw,gameOrDrawId:r.game_or_draw_id,poolOrTier:r.pool_or_tier,eventAt:r.event_at,eventTimePrecision:r.event_time_precision,currency:r.currency,amountValue:finite(r.amount_value)?Number(r.amount_value):null,numbers:parseJson(r.numbers_json,[]),secondary:parseJson(r.secondary_json,[]),metadata:parseJson(r.metadata_json,{}),sourceId:r.source_id,sourceUrl:r.source_url,sourceClass:r.source_class,confidence:r.confidence,sourceFingerprint:r.source_fingerprint,archivePartition:r.archive_partition,ingestedAt:r.ingested_at};}

  librarySearch(url){
    this.syncInternalLibrary();
    const p=url.searchParams,where=[],args=[];
    const eq=(param,column)=>{const v=p.get(param);if(v){where.push(`${column}=?`);args.push(v);}};
    eq('domain','domain');eq('type','record_type');eq('jurisdiction','jurisdiction');eq('source','source_id');eq('gameId','game_or_draw_id');eq('partition','archive_partition');
    const q=(p.get('q')||'').trim();
    if(q){where.push(`(record_uid LIKE ? OR game_or_draw LIKE ? OR COALESCE(operator,'') LIKE ? OR COALESCE(provider,'') LIKE ? OR COALESCE(pool_or_tier,'') LIKE ? OR COALESCE(metadata_json,'') LIKE ?)`);for(let i=0;i<6;i++)args.push(`%${q}%`);}
    const from=Date.parse(p.get('from')||'');if(Number.isFinite(from)){where.push('event_at_ms>=?');args.push(from);}
    const to=Date.parse(p.get('to')||'');if(Number.isFinite(to)){where.push('event_at_ms<=?');args.push(to);}
    const limit=Math.max(1,Math.min(500,Number(p.get('limit')||100))),offset=Math.max(0,Number(p.get('offset')||0));
    const sql=`SELECT * FROM library_records ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY event_at_ms DESC,id DESC LIMIT ? OFFSET ?`;
    args.push(limit,offset);
    const rows=[...this.sql.exec(sql,...args)].map(r=>this.libraryRow(r));
    return {query:{q:q||null,domain:p.get('domain')||null,type:p.get('type')||null,jurisdiction:p.get('jurisdiction')||null,source:p.get('source')||null,gameId:p.get('gameId')||null,partition:p.get('partition')||null,from:p.get('from')||null,to:p.get('to')||null,limit,offset},rows,returned:rows.length};
  }

  importAuthorized(request){
    const expected=String(this.env.EDGE_LIBRARY_ADMIN_TOKEN||'');
    if(!expected)return false;
    const auth=String(request.headers.get('authorization')||'');
    return auth===`Bearer ${expected}`;
  }

  async importLibrary(request){
    if(!this.importAuthorized(request))return responseJson({ok:false,error:'LIBRARY_IMPORT_NOT_AUTHORIZED'},403);
    let body;try{body=await request.json();}catch{return responseJson({ok:false,error:'INVALID_JSON'},400);}
    const records=Array.isArray(body?.records)?body.records:[];
    if(!records.length||records.length>500)return responseJson({ok:false,error:'RECORD_BATCH_MUST_BE_1_TO_500'},400);
    let imported=0;const errors=[];
    for(let i=0;i<records.length;i++)try{this.insertLibraryRecord(records[i]);imported++;}catch(e){errors.push({index:i,error:String(e?.message||e)});}
    return responseJson({ok:errors.length===0,imported,errors,guards:{adminTokenRequired:true,importDoesNotEnableExecution:true}} ,errors.length?207:200);
  }

  async alarm(){await super.alarm();try{this.syncInternalLibrary();}catch{}}

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/library/summary')return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,library:this.librarySummary(),guards:{libraryIsEvidenceNotExecution:true,realMoneyAllowed:false}});
    if(path==='/library/sources')return responseJson({ok:true,sources:this.librarySources(),guards:{sourceUrlIsProvenanceOnlyDataRemainInternal:true}});
    if(path==='/library/search')return responseJson({ok:true,...this.librarySearch(url),guards:{historicalPatternIsNotPredictiveProof:true,libraryCannotEnableRealMoney:true}});
    if(path==='/library/record'){
      this.syncInternalLibrary();const uid=url.searchParams.get('uid')||'';const row=[...this.sql.exec(`SELECT * FROM library_records WHERE record_uid=? LIMIT 1`,uid)][0]||null;
      return row?responseJson({ok:true,row:this.libraryRow(row)}):responseJson({ok:false,error:'RECORD_NOT_FOUND'},404);
    }
    if(path==='/library/import'&&request.method==='POST')return this.importLibrary(request);
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),universalInternalLibrary:true,librarySearch:true,provenanceTracking:true,partitionedArchiveSchema:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
