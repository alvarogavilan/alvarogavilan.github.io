import { EdgeSentinel as V18EdgeSentinel } from './index-v18.mjs';
import { SPANISH_JACKPOT_AWARDS,SPANISH_JACKPOT_AGGREGATES,MILLIONAIRE_GENIE_CURRENT_ECONOMICS } from './spanish-jackpot-awards-v1.mjs';
import { extractJackpotAmountNearLabel } from './888-jackpot-page-parser-v1.mjs';
import { conditionalConstantHazardScreen } from './millionaire-genie-historical-screen-v1.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v19-spanish-jackpot-awards-20260824a';
const EIGHT_JACKPOTS='https://www.888casino.es/jackpots/';
const EIGHT_POLL_MS=60000;
function responseJson(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});}
function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}

export class EdgeSentinel extends V18EdgeSentinel{
  constructor(ctx,env){
    super(ctx,env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS spanish_jackpot_awards(
      event_id TEXT PRIMARY KEY,operator TEXT NOT NULL,game TEXT NOT NULL,amount_eur REAL NOT NULL,
      period_start TEXT NOT NULL,period_end TEXT NOT NULL,date_precision TEXT NOT NULL,location TEXT,
      source_url TEXT NOT NULL,source_class TEXT NOT NULL,configuration_identity_current INTEGER NOT NULL DEFAULT 0,
      award_verified_public INTEGER NOT NULL DEFAULT 0,stake_eur REAL,title_resolved INTEGER,conflicts_json TEXT
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS spanish_jackpot_awards_game_period_idx ON spanish_jackpot_awards(game,period_start)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS spanish_public_jackpot_meter_samples(
      id INTEGER PRIMARY KEY AUTOINCREMENT,operator TEXT NOT NULL,game_key TEXT NOT NULL,observed_at_ms INTEGER NOT NULL,
      observed_at TEXT NOT NULL,amount_eur REAL NOT NULL,source_url TEXT NOT NULL,parser_version TEXT NOT NULL,
      UNIQUE(operator,game_key,observed_at_ms)
    )`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS spanish_public_jackpot_meter_idx ON spanish_public_jackpot_meter_samples(operator,game_key,observed_at_ms DESC)`);
    this.seedSpanishAwards();
  }

  seedSpanishAwards(){
    for(const e of SPANISH_JACKPOT_AWARDS){
      this.sql.exec(`INSERT OR IGNORE INTO spanish_jackpot_awards(
        event_id,operator,game,amount_eur,period_start,period_end,date_precision,location,source_url,source_class,
        configuration_identity_current,award_verified_public,stake_eur,title_resolved,conflicts_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        e.eventId,e.operator,e.game,Number(e.amountEUR),e.periodStart,e.periodEnd,e.datePrecision,e.location||null,e.sourceUrl,e.sourceClass,
        e.configurationIdentityCurrent?1:0,e.awardVerifiedPublic?1:0,finite(e.stakeEUR)?Number(e.stakeEUR):null,e.titleResolved===false?0:1,JSON.stringify(e.conflicts||[])
      );
    }
  }

  awardRows({game=null,operator=null,limit=500}={}){
    const n=Math.max(1,Math.min(2000,Number(limit)||500));
    let rows;
    if(game&&operator)rows=[...this.sql.exec(`SELECT * FROM spanish_jackpot_awards WHERE game=? AND operator=? ORDER BY period_start ASC LIMIT ?`,game,operator,n)];
    else if(game)rows=[...this.sql.exec(`SELECT * FROM spanish_jackpot_awards WHERE game=? ORDER BY period_start ASC LIMIT ?`,game,n)];
    else if(operator)rows=[...this.sql.exec(`SELECT * FROM spanish_jackpot_awards WHERE operator=? ORDER BY period_start ASC LIMIT ?`,operator,n)];
    else rows=[...this.sql.exec(`SELECT * FROM spanish_jackpot_awards ORDER BY period_start ASC LIMIT ?`,n)];
    return rows.map(r=>({eventId:r.event_id,operator:r.operator,game:r.game,amountEUR:Number(r.amount_eur),periodStart:r.period_start,periodEnd:r.period_end,datePrecision:r.date_precision,location:r.location||null,sourceUrl:r.source_url,sourceClass:r.source_class,configurationIdentityCurrent:Number(r.configuration_identity_current)===1,awardVerifiedPublic:Number(r.award_verified_public)===1,stakeEUR:finite(r.stake_eur)?Number(r.stake_eur):null,titleResolved:Number(r.title_resolved)!==0,conflicts:JSON.parse(r.conflicts_json||'[]')}));
  }

  perGameAwardStats(){
    return [...this.sql.exec(`SELECT game,COUNT(*) AS n,SUM(amount_eur) AS total,AVG(amount_eur) AS mean,MIN(amount_eur) AS min,MAX(amount_eur) AS max,MIN(period_start) AS first_period,MAX(period_end) AS last_period,SUM(CASE WHEN date_precision='DAY' THEN 1 ELSE 0 END) AS day_n,SUM(CASE WHEN conflicts_json IS NOT NULL AND conflicts_json!='[]' THEN 1 ELSE 0 END) AS conflict_n FROM spanish_jackpot_awards GROUP BY game ORDER BY n DESC,total DESC`)].map(r=>({game:r.game,publicVerifiedAwards:Number(r.n||0),totalAwardedEUR:Number(r.total||0),meanAwardEUR:Number(r.mean||0),minAwardEUR:Number(r.min||0),maxAwardEUR:Number(r.max||0),firstPeriod:r.first_period,lastPeriod:r.last_period,dayPrecisionCount:Number(r.day_n||0),conflictCount:Number(r.conflict_n||0)}));
  }

  latest888Sample(){
    const r=[...this.sql.exec(`SELECT * FROM spanish_public_jackpot_meter_samples WHERE operator='888casino-es' AND game_key='Millionaire Genie' ORDER BY observed_at_ms DESC LIMIT 1`)][0]||null;
    return r?{observedAt:r.observed_at,amountEUR:Number(r.amount_eur),sourceUrl:r.source_url,parserVersion:r.parser_version}:null;
  }

  async poll888MillionaireGenie(){
    const now=Date.now();const lastAttempt=Number((await this.ctx.storage.get('last888JackpotPollMs'))||0);
    if(now-lastAttempt<EIGHT_POLL_MS)return {attempted:false,readable:this.latest888Sample()!==null,current:this.latest888Sample(),reason:'POLL_INTERVAL_GUARD'};
    await this.ctx.storage.put('last888JackpotPollMs',now);
    let res,text;
    try{res=await fetch(EIGHT_JACKPOTS,{headers:{'accept':'text/html,application/xhtml+xml','user-agent':'Loterias-EDGE-Research/1.0'},cache:'no-store'});text=await res.text();}catch(e){return {attempted:true,readable:false,current:this.latest888Sample(),error:String(e?.message||e)};}
    if(!res.ok)return {attempted:true,readable:false,httpStatus:res.status,current:this.latest888Sample(),error:'HTTP_NOT_OK'};
    const parsed=extractJackpotAmountNearLabel(text,'Millionaire Genie');
    if(!parsed||!finite(parsed.amountEUR)||parsed.amountEUR<=0||parsed.amountEUR>100000000)return {attempted:true,readable:false,httpStatus:res.status,current:this.latest888Sample(),error:'MILLIONAIRE_GENIE_AMOUNT_NOT_PARSED'};
    const previous=this.latest888Sample(),observedAt=new Date(now).toISOString(),amount=Number(parsed.amountEUR);
    this.sql.exec(`INSERT OR IGNORE INTO spanish_public_jackpot_meter_samples(operator,game_key,observed_at_ms,observed_at,amount_eur,source_url,parser_version) VALUES ('888casino-es','Millionaire Genie',?,?,?,?,?)`,now,observedAt,amount,EIGHT_JACKPOTS,'888-jackpot-page-parser-v1');
    let drop=null;
    if(previous&&previous.amountEUR>amount){const dropEUR=previous.amountEUR-amount,dropRelative=previous.amountEUR>0?dropEUR/previous.amountEUR:0;if(dropEUR>=1&&dropRelative>=0.20){drop={beforeEUR:previous.amountEUR,afterEUR:amount,dropEUR,dropRelative,awardVerified:false};try{this.insertScienceEvent({observedAtMs:now,observedAt,type:'888_MILLIONAIRE_GENIE_RESET_CANDIDATE',meterKey:'888:MillionaireGenie',beforeEUR:previous.amountEUR,afterEUR:amount,deltaEUR:amount-previous.amountEUR,metadata:{source:EIGHT_JACKPOTS,awardVerified:false,configurationIdentityCurrent:true}});}catch{}}}
    return {attempted:true,readable:true,httpStatus:res.status,current:{observedAt,amountEUR:amount,sourceUrl:EIGHT_JACKPOTS,parserVersion:'888-jackpot-page-parser-v1'},previous,dropCandidate:drop};
  }

  meterSampleSummary(){
    const r=[...this.sql.exec(`SELECT COUNT(*) AS n,MIN(observed_at) AS first_at,MAX(observed_at) AS last_at,MIN(amount_eur) AS min,MAX(amount_eur) AS max FROM spanish_public_jackpot_meter_samples WHERE operator='888casino-es' AND game_key='Millionaire Genie'`)][0]||{};
    return {sampleCount:Number(r.n||0),firstObservedAt:r.first_at||null,lastObservedAt:r.last_at||null,observedMinEUR:finite(r.min)?Number(r.min):null,observedMaxEUR:finite(r.max)?Number(r.max):null,current:this.latest888Sample()};
  }

  spanishAwardsResearch({game=null,operator=null,limit=500}={}){
    const stats=this.perGameAwardStats(),strongest=stats[0]||null;
    const mgRows=this.awardRows({game:'Millionaire Genie',operator:'888casino-es',limit:500});
    const meter=this.meterSampleSummary();
    const conditional=conditionalConstantHazardScreen({awardAmounts:mgRows.map(x=>x.amountEUR),contributionRates:[0.02,0.035],currentJackpotEUR:meter.current?.amountEUR??null});
    return {
      version:'edge-spanish-jackpot-award-archive-v1',generatedAt:new Date().toISOString(),jurisdiction:'ES',
      summary:{individualPublicAwardRows:Number([...this.sql.exec(`SELECT COUNT(*) AS n FROM spanish_jackpot_awards`)][0]?.n||0),gamesWithIndividualRows:stats.length,strongestIndividualSeries:strongest,aggregatesStored:SPANISH_JACKPOT_AGGREGATES.length},
      filters:{game:game||null,operator:operator||null},perGame:stats,rows:this.awardRows({game,operator,limit}),aggregates:SPANISH_JACKPOT_AGGREGATES,
      millionaireGenie:{currentEconomics:MILLIONAIRE_GENIE_CURRENT_ECONOMICS,meterMonitor:meter,historicalConditionalScreen:conditional,modelStatus:{historicalAwardsUsefulForHypothesis:true,currentSpecificGrowthDisclosureFraction:0.035,currentTheoreticalRtp:0.9502,exactCurrentSeedKnown:false,exactHazardKnown:false,baseRtpExcludingProgressiveKnown:false,configurationContinuityAcross2015To2026Verified:false,breakEvenKnown:false,positiveEvProven:false}},
      guards:{publicationDateNeverInventedAsAwardTimestamp:true,monthPrecisionNeverPromotedToExactDay:true,aggregateCountsNeverExpandedIntoSyntheticAwards:true,conflictingAmountsRemainVisible:true,historicalConfigurationNotAssumedCurrent:true,currentContributionDisclosureConflictBlocksThreshold:true,conditionalHazardScreenCannotPromote:true,meterResetCandidateIsNotAwardProof:true,archiveCannotEnableRealMoney:true,executionContractRemainsSoleGreenAuthority:true,realMoneyAllowed:false}
    };
  }

  async alarm(){await super.alarm();try{await this.poll888MillionaireGenie();}catch{}}
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/science/spanish-awards'){
      await this.ensureAlarm();let poll=null;try{poll=await this.poll888MillionaireGenie();}catch{}
      return responseJson({ok:true,service:'loterias-edge-sentinel',deploymentFingerprint:DEPLOYMENT_FINGERPRINT,deploymentCapabilities:{spanishJackpotAwardArchive:true,public888MeterMonitor:true,awardDatePrecision:true,conflictQuarantine:true,conditionalHistoricalHazardScreen:true,executionContractFailClosed:true},poll,research:this.spanishAwardsResearch({game:url.searchParams.get('game')||null,operator:url.searchParams.get('operator')||null,limit:Number(url.searchParams.get('limit')||500)})});
    }
    const response=await super.fetch(request);
    if(!['/','/health','/state','/science/status','/science/events','/science/jpk','/science/winfall','/science/ath','/science/cycles','/science/timing','/science/history-depth','/library/summary','/library/sources','/library/search','/library/record','/library/coverage','/library/universe'].includes(path))return response;
    try{const body=await response.clone().json();body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;body.deploymentCapabilities={...(body.deploymentCapabilities||{}),spanishJackpotAwardArchive:true,public888MeterMonitor:true,conditionalHistoricalHazardScreen:true};return responseJson(body,response.status);}catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
