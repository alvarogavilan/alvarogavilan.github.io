#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const VERSION='betfair-kingdoms-rise-safe-har-analyzer-v1';
const DEFAULT_GAME_ID='kingdom-rise-sands-of-fury-cptn';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const intOrNull=v=>{const n=finite(v);return n!==null&&Number.isInteger(n)?n:null;};
function safeEndpoint(raw){try{const u=new URL(String(raw||''));return u.protocol==='https:'?`${u.origin}${u.pathname}`:null;}catch{return null;}}
function attr(text,name){const m=String(text||'').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'));return m?m[1]:null;}
function decodeContent(content={}){const t=typeof content.text==='string'?content.text:'';if(!t)return '';if(content.encoding==='base64'){try{return Buffer.from(t,'base64').toString('utf8');}catch{return '';}}return t;}
function parseUrl(raw){try{return new URL(String(raw||''));}catch{return null;}}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,...extra,execution:execution(),hardGuards:{rawHarNeverEmitted:true,authorizationCookieAndPostDataNeverEmitted:true,queryStringNeverEmitted:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};}

function parseKrjpRows(xml,requestUrl){
  const rows=[];
  const re=/<gamedata\b([^>]*)>([\s\S]*?)<\/gamedata>/gi;
  let m;
  while((m=re.exec(xml))){
    const gAttrs=m[1],body=m[2];
    const game=attr(gAttrs,'game');
    const group=attr(gAttrs,'gamegroup');
    if(!(String(game||'').toLowerCase().startsWith('krjp')||String(group||'').toLowerCase()==='krjp'))continue;
    const a=body.match(/<amount\b([^>]*)>([^<]*)<\/amount>/i);
    if(!a)continue;
    const aAttrs=a[1],amount=finite(a[2]);
    const guaranteedHitAmount=finite(attr(aAttrs,'guranteedHitAmount')??attr(aAttrs,'guaranteedHitAmount'));
    const guaranteedHitTime=intOrNull(attr(aAttrs,'guaranteedHitTime'));
    const u=parseUrl(requestUrl);
    const requestCasino=u?.searchParams.get('casino')||null;
    const requestGame=u?.searchParams.get('game')||null;
    const requestCurrency=u?.searchParams.get('currency')||null;
    rows.push({
      game:game||requestGame,
      gamegroup:group||null,
      currency:(attr(aAttrs,'currency')||requestCurrency||'').toUpperCase()||null,
      local:intOrNull(attr(gAttrs,'local')),
      amount,
      guaranteedHitAmount,
      guaranteedHitTime,
      winCount:finite(attr(gAttrs,'winc')),
      gameTimestamp:intOrNull(attr(gAttrs,'timestamp')),
      instanceCode:attr(aAttrs,'instancecode')||null,
      requestCasino,
      tickerEndpoint:safeEndpoint(requestUrl),
      providerTierIdentity:game==='krjp-1'?'KINGDOMS_RISE_EPIC_PROVIDER_EXAMPLE_CODE':'UNVERIFIED_KRJP_TIER',
      exactPowerStrikeBindingVerified:false
    });
  }
  return rows;
}

export function analyzeBetfairKingdomsRiseHarObject(har,{expectedGameId=DEFAULT_GAME_ID}={}){
  const entries=har?.log?.entries;
  if(!Array.isArray(entries))return fail('HAR_ENTRIES_REQUIRED');
  const launcherHits=[];const rows=[];const tickerEndpoints=new Set();
  for(const entry of entries){
    const rawUrl=entry?.request?.url||'';const u=parseUrl(rawUrl);
    const gameId=u?.searchParams.get('gameId')||null;
    if(gameId===expectedGameId||String(rawUrl).includes(expectedGameId))launcherHits.push({endpoint:safeEndpoint(rawUrl),gameId:expectedGameId,startedDateTime:entry?.startedDateTime||null});
    const text=decodeContent(entry?.response?.content);
    if(!text)continue;
    const looksTicker=String(rawUrl).includes('new_jackpotxml.php')||/<gamedata\b[^>]*(?:game=["']krjp|gamegroup=["']krjp)/i.test(text);
    if(!looksTicker)continue;
    const parsed=parseKrjpRows(text,rawUrl);for(const row of parsed){rows.push(row);if(row.tickerEndpoint)tickerEndpoints.add(row.tickerEndpoint);}
  }
  const eurGlobalRows=rows.filter(r=>r.currency==='EUR'&&r.local===0);
  const guaranteedAmountRows=eurGlobalRows.filter(r=>r.guaranteedHitAmount!==null);
  const guaranteedTimeRows=eurGlobalRows.filter(r=>r.guaranteedHitTime!==null);
  const exactLauncherObserved=launcherHits.length>0;
  const exactBetfairTickerBindingCandidate=exactLauncherObserved&&tickerEndpoints.size===1&&eurGlobalRows.some(r=>!!r.requestCasino);
  return {
    version:VERSION,ok:true,expectedGameId,
    exactLauncherObserved,
    launcherHits,
    tickerEndpoints:[...tickerEndpoints],
    krjpRows:rows,
    eurGlobalRowCount:eurGlobalRows.length,
    guaranteedAmountRows,
    guaranteedTimeRows,
    exactBetfairTickerBindingCandidate,
    amountBoundaryCaptureCandidate:exactBetfairTickerBindingCandidate&&guaranteedAmountRows.length>0,
    amountBoundaryPromotionAllowed:false,
    reason:guaranteedAmountRows.length>0?'GUARANTEED_AMOUNT_ROW_CAPTURED_REQUIRES_EXACT_TIER_AND_OPERATOR_BINDING_REVIEW':'NO_GUARANTEED_AMOUNT_ROW_CAPTURED',
    nextRequiredEvidence:[
      exactLauncherObserved?null:'exact Betfair Spain Kingdoms Rise launcher in same passive capture',
      eurGlobalRows.length?null:'fresh GLOBAL EUR Kingdoms Rise ticker row',
      guaranteedAmountRows.length?null:'fresh provider guranteedHitAmount/guaranteedHitAmount field',
      'independent exact Power Strike tier-code binding review',
      'exact served stake menu and base-cost review',
      'trigger-distribution and network-competition/race model',
      'conservative positive-EV screen'
    ].filter(Boolean),
    execution:execution(),
    hardGuards:{
      rawHarNeverEmitted:true,authorizationCookieAndPostDataNeverEmitted:true,queryStringNeverEmitted:true,
      krjp1OnlyProviderTierCodeHardBound:true,krjp2Krjp3LabelsNotAssumed:true,
      guaranteedAmountFieldDoesNotAuthorizePlay:true,displayedAmountDoesNotClassifyMhb:true,
      exactTierBindingReviewRequired:true,exactOperatorBindingRequired:true,triggerDistributionRequiredForEv:true,
      noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false
    }
  };
}

export function analyzeBetfairKingdomsRiseHarText(raw,options={}){let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}return analyzeBetfairKingdomsRiseHarObject(har,options);}

export function main(argv=process.argv.slice(2)){
  const file=argv[0];if(!file||file==='--help'||file==='-h'){process.stdout.write(`Usage: node loterias-ai/scripts/analyze-betfair-kingdoms-rise-har.mjs <capture.har> [--game-id <exact-game-id>]\n`);return file?0:2;}
  const i=argv.indexOf('--game-id');const expectedGameId=i>=0?String(argv[i+1]||''):DEFAULT_GAME_ID;if(!expectedGameId){process.stdout.write(`${JSON.stringify(fail('EXPECTED_GAME_ID_REQUIRED'),null,2)}\n`);return 2;}
  try{const r=analyzeBetfairKingdomsRiseHarText(fs.readFileSync(file,'utf8'),{expectedGameId});process.stdout.write(`${JSON.stringify(r,null,2)}\n`);return r.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{sourceName:path.basename(file),error:String(error?.message||error)}),null,2)}\n`);return 1;}
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();
