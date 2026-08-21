#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/jackpots/evidence/tiki-cross-venture-incidence-v1.json';
const QUERY='query loadJackpots { jackpots { id amount } }';
const TARGET_IDS=['tikitemple2_1','progressivealice1'];
const timeoutMs=10000;

const OPERATORS={
  botemania:{
    origin:'https://www.botemania.es',
    endpoint:'https://www.botemania.es/es/graphql',
    ventures:['botemania_es','']
  },
  monopoly:{
    origin:'https://www.monopolycasino.es',
    endpoint:'https://www.monopolycasino.es/es/graphql',
    ventures:['monopolycasino_es','monopoly_es','monopolycasino','']
  }
};

const CANDIDATES=[
  {slug:'tiki-templo',needle:'tiki templo',networkHint:'TIKI_TEMPLO_UNKNOWN'},
  {slug:'la-isla-de-tiki-tropico-dorado',needle:'trópico dorado',networkHint:'TIKI_TROPICO_ZERO_RESET'},
  {slug:'winfall-wishes-jackpot',needle:'winfall wishes jackpot',networkHint:'WINFALL_ZERO_RESET'},
  {slug:'wonderland',needle:'wonderland',networkHint:'WINFALL_ZERO_RESET'},
  {slug:'la-isla-de-tiki-bote',needle:'la isla de tiki bote',networkHint:'TIKI_TROPICO_ZERO_RESET'},
  {slug:'paper-wins-jackpot',needle:'paper wins jackpot',networkHint:'TIKI_TROPICO_ZERO_RESET'},
  {slug:'boteman',needle:'boteman',networkHint:'TIKI_TROPICO_ZERO_RESET'},
  {slug:'winstones-bote',needle:'winstones',networkHint:'TIKI_TROPICO_ZERO_RESET'}
];

const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const normText=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');

async function fetchText(url,opts={}){
  try{
    const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(timeoutMs)});
    return {ok:r.ok,status:r.status,url:r.url,text:await r.text(),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',error:String(e?.name||e?.message||e)};}
}

async function loadJackpots(name){
  const cfg=OPERATORS[name],attempts=[];
  for(const venture of cfg.ventures){
    const headers={accept:'application/json','content-type':'application/json',origin:cfg.origin,referer:cfg.origin+'/','cache-control':'no-cache, no-store, max-age=0','user-agent':'loterias-ai-tiki-cross-venture-incidence/1.0'};
    if(venture) headers.venture=venture;
    const r=await fetchText(cfg.endpoint,{method:'POST',headers,body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
    let body=null;try{body=JSON.parse(r.text)}catch{}
    const rows=(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:finite(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);
    attempts.push({venture:venture||null,httpStatus:r.status,error:r.error,graphqlErrors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length});
    if(r.ok&&rows.length) return {resolvedVenture:venture||null,httpStatus:r.status,rows,attempts};
  }
  return {resolvedVenture:null,httpStatus:attempts.at(-1)?.httpStatus??null,rows:[],attempts};
}

function idSummary(rows,id){
  const rs=(rows||[]).filter(r=>r.id===id);
  const distinct=[...new Set(rs.map(r=>r.amountEUR))].sort((a,b)=>a-b);
  return {id,rowCount:rs.length,distinctAmountsEUR:distinct,singleLiveAmount:rs.length>0&&distinct.length===1,amountEUR:distinct.length===1?distinct[0]:null};
}

async function pageAvailability(name){
  const origin=OPERATORS[name].origin;
  const out=[];
  for(const c of CANDIDATES){
    const url=`${origin}/juegos/slots-online/${c.slug}`;
    const r=await fetchText(url,{headers:{accept:'text/html,*/*','user-agent':'loterias-ai-tiki-cross-venture-incidence/1.0'}});
    const text=normText(r.text.replace(/<[^>]+>/g,' '));
    const needle=normText(c.needle);
    out.push({slug:c.slug,networkHint:c.networkHint,httpStatus:r.status,finalUrl:r.url,error:r.error,titleNeedlePresent:r.ok&&text.includes(needle),publicPageAvailable:r.ok&&text.includes(needle)});
  }
  return out;
}

export function compareIncidence(bot={},mon={}){
  const targetComparison={};
  for(const id of TARGET_IDS){
    const a=idSummary(bot.rows||[],id),b=idSummary(mon.rows||[],id);
    const sameRowCount=a.rowCount===b.rowCount;
    const sameDistinctAmounts=a.distinctAmountsEUR.length===b.distinctAmountsEUR.length&&a.distinctAmountsEUR.every((v,i)=>Math.round(v*100)===Math.round((b.distinctAmountsEUR[i]??NaN)*100));
    targetComparison[id]={botemania:a,monopoly:b,sameRowCount,sameDistinctAmounts,incidenceDiffers:!sameRowCount||!sameDistinctAmounts};
  }
  const anyTargetIncidenceDifference=Object.values(targetComparison).some(x=>x.incidenceDiffers);
  return {targetComparison,anyTargetIncidenceDifference};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const observedAt=new Date().toISOString();
  const [bg,mg,bp,mp]=await Promise.all([loadJackpots('botemania'),loadJackpots('monopoly'),pageAvailability('botemania'),pageAvailability('monopoly')]);
  const cmp=compareIncidence(bg,mg);
  const availability=CANDIDATES.map(c=>{
    const b=bp.find(x=>x.slug===c.slug),m=mp.find(x=>x.slug===c.slug);
    return {slug:c.slug,networkHint:c.networkHint,botemania:Boolean(b?.publicPageAvailable),monopoly:Boolean(m?.publicPageAvailable),botemaniaHttpStatus:b?.httpStatus??null,monopolyHttpStatus:m?.httpStatus??null};
  });
  const publicFeedCoverageComplete=bg.rows.length>0&&mg.rows.length>0;
  const pageCoverageComplete=bp.length===CANDIDATES.length&&mp.length===CANDIDATES.length&&[...bp,...mp].every(x=>x.httpStatus!==null);
  const out={
    version:'tiki-cross-venture-incidence-v1',observedAt,operatorScope:['botemania-es','monopolycasino-es'],
    coverage:{publicFeedCoverageComplete,pageCoverageComplete,candidatePageCount:CANDIDATES.length,botemaniaFeedRows:bg.rows.length,monopolyFeedRows:mg.rows.length},
    feeds:{botemania:{resolvedVenture:bg.resolvedVenture,httpStatus:bg.httpStatus,attempts:bg.attempts,targetIds:Object.fromEntries(TARGET_IDS.map(id=>[id,idSummary(bg.rows,id)]))},monopoly:{resolvedVenture:mg.resolvedVenture,httpStatus:mg.httpStatus,attempts:mg.attempts,targetIds:Object.fromEntries(TARGET_IDS.map(id=>[id,idSummary(mg.rows,id)]))}},
    availability,
    comparison:cmp,
    decision:{
      crossVentureIncidenceSignalFound:publicFeedCoverageComplete&&cmp.anyTargetIncidenceDifference,
      exactGameBindingRecovered:false,
      identityPromotionAllowed:false,
      economicPromotionAllowed:false,
      realMoneyAllowed:false
    },
    interpretation:cmp.anyTargetIncidenceDifference
      ? 'The exact target ID incidence differs across the two public Spanish ventures. This is a discovery signal only; catalog differences must uniquely explain the incidence change before any game binding can be considered.'
      : 'The exact target ID incidence is not discriminating across the two public Spanish ventures in this snapshot. This layer cannot bind either ID to a game, even if candidate game availability differs.',
    guards:{publicNoAuthOnly:true,noCookies:true,noLogin:true,noGameLaunch:true,noBetting:true,rowMultiplicityNeverEqualsGameIdentity:true,catalogIncidenceIsDiscoveryOnly:true,noHeuristicIdentityPromotion:true,realMoneyAllowed:false}
  };
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({coverage:out.coverage,availability:out.availability,comparison:out.comparison,decision:out.decision},null,2));
}
