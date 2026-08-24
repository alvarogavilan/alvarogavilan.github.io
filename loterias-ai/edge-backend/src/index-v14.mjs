import { EdgeSentinel as V13EdgeSentinel } from './index-v13.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v14-library-coverage-20260824a';

function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
function parseInts(v){if(!v)return null;const a=String(v).split(',').map(x=>Number(String(x).trim())).filter(Number.isFinite);return a.length?a:null;}
function isoMs(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:null;}

const COVERAGE_TARGETS=[
  {
    coverageId:'es-selae-primitiva-historical-through-2026-08-22',domain:'LOTTERY',jurisdiction:'ES',sourceId:null,gameId:'la-primitiva',label:'La Primitiva · histórico oficial',
    expectedCount:4179,expectedFrom:null,expectedTo:'2026-08-22T23:59:59+02:00',expectedBasis:'SELAE official statistics total historical draws, updated 2026-08-22',
    evidenceUrl:'https://www.loteriasyapuestas.es/es/la-primitiva/estadisticas'
  },
  {
    coverageId:'es-selae-euromillones-historical-through-2026-08-18',domain:'LOTTERY',jurisdiction:'ES',sourceId:null,gameId:'euromillones',label:'Euromillones · histórico oficial hasta 18/08/2026',
    expectedCount:1973,expectedFrom:null,expectedTo:'2026-08-18T23:59:59+02:00',expectedBasis:'SELAE official statistics total historical draws, updated 2026-08-18',
    evidenceUrl:'https://www.loteriasyapuestas.es/es/euromillones/estadisticas'
  },
  {
    coverageId:'es-once-eurojackpot-2026-06',domain:'LOTTERY',jurisdiction:'ES',sourceId:'es-once-eurojackpot-history',gameId:'eurojackpot',label:'Eurojackpot ONCE · junio 2026',
    expectedCount:9,expectedFrom:'2026-06-01T00:00:00+02:00',expectedTo:'2026-06-30T23:59:59+02:00',expectedBasis:'ONCE official June 2026 monthly archive contains nine draws',
    evidenceUrl:'https://www.juegosonce.es/historico-resultados-eurojackpot-junio-2026'
  },
  {
    coverageId:'es-once-coupon-history-from-1996',domain:'LOTTERY',jurisdiction:'ES',sourceId:'es-once-history',gameId:null,label:'Cupones ONCE · histórico desde 1996',
    expectedCount:null,expectedFrom:'1996-01-01T00:00:00+01:00',expectedTo:null,expectedBasis:'ONCE states coupon historical results are available from 1996; total count not yet frozen',
    evidenceUrl:'https://www.juegosonce.es/faqs/donde-puedo-encontrar-los-resultados-cupon-diario'
  },
  {
    coverageId:'es-selae-loteria-nacional-stats-from-2009',domain:'LOTTERY',jurisdiction:'ES',sourceId:null,gameId:'loteria-nacional',label:'Lotería Nacional · base estadística desde 01/01/2009',
    expectedCount:null,expectedFrom:'2009-01-01T00:00:00+01:00',expectedTo:null,expectedBasis:'SELAE states current Lotería Nacional statistics are calculated from all draws since 2009-01-01; exact row count not yet frozen',
    evidenceUrl:'https://www.loteriasyapuestas.es/es/loteria-nacional/estadisticas'
  }
];

export class EdgeSentinel extends V13EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS library_coverage_targets (
      coverage_id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      jurisdiction TEXT NOT NULL,
      source_id TEXT,
      game_id TEXT,
      label TEXT NOT NULL,
      expected_count INTEGER,
      expected_from_ms INTEGER,
      expected_from TEXT,
      expected_to_ms INTEGER,
      expected_to TEXT,
      expected_basis TEXT NOT NULL,
      evidence_url TEXT,
      registered_at TEXT NOT NULL
    )`);
    this.seedCoverageTargets();
  }

  seedCoverageTargets(){
    const now=new Date().toISOString();
    for(const t of COVERAGE_TARGETS){
      this.sql.exec(`INSERT OR REPLACE INTO library_coverage_targets(
        coverage_id,domain,jurisdiction,source_id,game_id,label,expected_count,expected_from_ms,expected_from,expected_to_ms,expected_to,expected_basis,evidence_url,registered_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        t.coverageId,t.domain,t.jurisdiction,t.sourceId,t.gameId,t.label,t.expectedCount,isoMs(t.expectedFrom),t.expectedFrom,isoMs(t.expectedTo),t.expectedTo,t.expectedBasis,t.evidenceUrl,now
      );
    }
  }

  coverageRows(){
    this.syncInternalLibrary();
    const targets=[...this.sql.exec(`SELECT * FROM library_coverage_targets ORDER BY jurisdiction,domain,label`)];
    return targets.map(t=>{
      const where=['domain=?','jurisdiction=?'],args=[t.domain,t.jurisdiction];
      if(t.source_id){where.push('source_id=?');args.push(t.source_id);}
      if(t.game_id){where.push('game_or_draw_id=?');args.push(t.game_id);}
      if(finite(t.expected_from_ms)){where.push('event_at_ms>=?');args.push(Number(t.expected_from_ms));}
      if(finite(t.expected_to_ms)){where.push('event_at_ms<=?');args.push(Number(t.expected_to_ms));}
      const x=[...this.sql.exec(`SELECT COUNT(DISTINCT record_uid) AS n,MIN(event_at_ms) AS min_ms,MAX(event_at_ms) AS max_ms FROM library_records WHERE ${where.join(' AND ')}`,...args)][0]||{};
      const observed=Number(x.n||0),expected=finite(t.expected_count)?Number(t.expected_count):null;
      const pct=expected&&expected>0?Math.min(1,observed/expected):null;
      return {
        coverageId:t.coverage_id,label:t.label,domain:t.domain,jurisdiction:t.jurisdiction,sourceId:t.source_id||null,gameId:t.game_id||null,
        expectedCount:expected,observedCount:observed,missingCount:expected!==null?Math.max(0,expected-observed):null,coveragePct:pct,
        expectedFrom:t.expected_from||null,expectedTo:t.expected_to||null,observedFrom:finite(x.min_ms)?new Date(Number(x.min_ms)).toISOString():null,observedTo:finite(x.max_ms)?new Date(Number(x.max_ms)).toISOString():null,
        expectedBasis:t.expected_basis,evidenceUrl:t.evidence_url,status:expected===null?'TARGET_TOTAL_NOT_FROZEN':observed>=expected?'COMPLETE_FOR_FROZEN_TARGET':'BACKFILL_REQUIRED'
      };
    });
  }

  coverageSummary(){
    const rows=this.coverageRows(),known=rows.filter(x=>x.expectedCount!==null);
    return {
      version:'edge-library-coverage-v1',targets:rows.length,knownExpectedCountTargets:known.length,completeFrozenTargets:known.filter(x=>x.status==='COMPLETE_FOR_FROZEN_TARGET').length,
      knownExpectedRows:known.reduce((a,x)=>a+x.expectedCount,0),observedRowsWithinKnownTargets:known.reduce((a,x)=>a+Math.min(x.observedCount,x.expectedCount),0),
      missingRowsWithinKnownTargets:known.reduce((a,x)=>a+x.missingCount,0),rows,
      guards:{unknownTotalNeverPretendsComplete:true,coverageDoesNotMeasurePredictiveValue:true,coverageCannotEnableRealMoney:true}
    };
  }

  librarySearchV2(url){
    this.syncInternalLibrary();
    const p=url.searchParams,where=[],args=[];
    const eq=(param,column)=>{const v=p.get(param);if(v){where.push(`${column}=?`);args.push(v);}};
    eq('domain','domain');eq('type','record_type');eq('jurisdiction','jurisdiction');eq('source','source_id');eq('gameId','game_or_draw_id');eq('partition','archive_partition');
    const q=(p.get('q')||'').trim();
    if(q){
      where.push(`(record_uid LIKE ? OR game_or_draw LIKE ? OR COALESCE(operator,'') LIKE ? OR COALESCE(provider,'') LIKE ? OR COALESCE(pool_or_tier,'') LIKE ? OR COALESCE(metadata_json,'') LIKE ? OR COALESCE(numbers_json,'') LIKE ? OR COALESCE(secondary_json,'') LIKE ?)`);
      for(let i=0;i<8;i++)args.push(`%${q}%`);
    }
    const numbers=parseInts(p.get('numbers'));if(numbers){where.push('numbers_json=?');args.push(JSON.stringify(numbers));}
    const secondary=parseInts(p.get('secondary'));if(secondary){where.push('secondary_json=?');args.push(JSON.stringify(secondary));}
    const from=isoMs(p.get('from'));if(finite(from)){where.push('event_at_ms>=?');args.push(from);}
    const to=isoMs(p.get('to'));if(finite(to)){where.push('event_at_ms<=?');args.push(to);}
    const limit=Math.max(1,Math.min(500,Number(p.get('limit')||100))),offset=Math.max(0,Number(p.get('offset')||0));
    args.push(limit,offset);
    const rows=[...this.sql.exec(`SELECT * FROM library_records ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY event_at_ms DESC,id DESC LIMIT ? OFFSET ?`,...args)].map(r=>this.libraryRow(r));
    return {query:{q:q||null,domain:p.get('domain')||null,type:p.get('type')||null,jurisdiction:p.get('jurisdiction')||null,source:p.get('source')||null,gameId:p.get('gameId')||null,partition:p.get('partition')||null,numbers:numbers||null,secondary:secondary||null,from:p.get('from')||null,to:p.get('to')||null,limit,offset},rows,returned:rows.length};
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/library/coverage')return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,coverage:this.coverageSummary()});
    if(path==='/library/search')return responseJson({ok:true,...this.librarySearchV2(url),guards:{exactCombinationFilterAvailable:true,historicalPatternIsNotPredictiveProof:true,libraryCannotEnableRealMoney:true}});
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/library/summary','/library/sources','/library/record'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),libraryCoverageLedger:true,exactCombinationSearch:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
