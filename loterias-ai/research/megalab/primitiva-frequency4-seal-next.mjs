#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT='loterias-ai';
const FREEZE=`${ROOT}/data/research/primitiva-frequency4-prospective-freeze-v1.json`;
const ARCHIVE=`${ROOT}/data/archive/primitiva`;
const OUTDIR=`${ROOT}/data/research/primitiva-frequency4-prospective-seals`;
const freezeRaw=fs.readFileSync(FREEZE,'utf8');
const freeze=JSON.parse(freezeRaw);
const enginePath=freeze.strategy?.enginePath;
const engineRaw=fs.readFileSync(enginePath,'utf8');

function assert(c,m){if(!c)throw new Error(m)}
function gitBlobSha(raw){const body=Buffer.from(raw,'utf8');return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`),body])).digest('hex')}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
function canonical(o){if(Array.isArray(o))return `[${o.map(canonical).join(',')}]`;if(o&&typeof o==='object')return `{${Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')}}`;return JSON.stringify(o)}
function madridDate(now=new Date()){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const g=t=>p.find(x=>x.type===t)?.value;return `${g('year')}-${g('month')}-${g('day')}`}
function addDays(date,n){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dow(date){return new Date(`${date}T12:00:00Z`).getUTCDay()}
function nextScheduled(from){let d=from;for(let i=0;i<14;i++){if([1,4,6].includes(dow(d)))return d;d=addDays(d,1)}throw new Error('could not resolve Primitiva schedule')}

assert(freeze.version==='primitiva-frequency4-prospective-freeze-v1'&&freeze.status==='FROZEN_BEFORE_FIRST_TARGET_RESULT','freeze not active');
assert(freeze.fixedBoundaryDraws===50&&freeze.guards?.noRetuning===true&&freeze.guards?.noOptionalStopping===true&&freeze.guards?.realMoneyAllowed===false,'fixed-boundary guards drift');
assert(freeze.strategy?.id==='frequency'&&freeze.strategy?.ticketsPerDraw===4&&freeze.strategy?.ticketCostEUR===1&&freeze.strategy?.diversificationPenalty===0.10,'strategy drift');
assert(gitBlobSha(engineRaw)===freeze.strategy.engineGitBlobSha,'Mega Numeric Engine blob drift');

let records=[];
for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort())for(const r of JSON.parse(fs.readFileSync(path.join(ARCHIVE,f),'utf8')).records||[])records.push(r);
records=[...new Map(records.map(r=>[r.drawId||`${r.drawDate}-${JSON.stringify(r.result?.main||[])}`,r])).values()].filter(r=>typeof r.drawDate==='string').sort((a,b)=>a.drawDate.localeCompare(b.drawDate));

const resultDates=new Set(records.filter(r=>Array.isArray(r.result?.main)&&r.result.main.length===6).map(r=>r.drawDate));
const requested=process.env.TARGET_DRAW_DATE||null;
let target=requested||nextScheduled(madridDate()<freeze.prospectiveStartsAt?freeze.prospectiveStartsAt:madridDate());
if(!requested){for(let i=0;i<14&&resultDates.has(target);i++)target=nextScheduled(addDays(target,1));}
assert(/^20\d\d-\d\d-\d\d$/.test(target),'target must be YYYY-MM-DD');
assert(target>=freeze.prospectiveStartsAt,'target before frozen start');
assert([1,4,6].includes(dow(target)),'target not on frozen Primitiva weekday');
assert(!resultDates.has(target),`TARGET_RESULT_ALREADY_PRESENT: ${target}`);

fs.mkdirSync(OUTDIR,{recursive:true});
const existing=fs.readdirSync(OUTDIR).filter(x=>/^primitiva-frequency4-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
assert(existing.length<freeze.fixedBoundaryDraws,'fixed 50-seal boundary already reached');

const prior=records.filter(r=>r.drawDate<target&&Array.isArray(r.result?.main)&&r.result.main.length===6);
assert(prior.length>=250,'insufficient strictly-prior Primitiva history');
const history=prior.map(r=>r.result.main.map(Number));
assert(history.every(a=>a.length===6&&new Set(a).size===6&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=49)),'invalid prior history');

const ctx={globalThis:{},window:undefined,console,Math,Number,String,Array,Set,Object,Map,Date,JSON};
vm.createContext(ctx);vm.runInContext(engineRaw,ctx);const M=ctx.globalThis.LotteryMegaNumericEngine;
assert(M&&typeof M.portfolio==='function','Mega Numeric Engine unavailable');
const p=M.portfolio(history,{id:'primitiva',main:{max:49,pick:6}},{tickets:4,weights:freeze.strategy.weights,diversificationPenalty:freeze.strategy.diversificationPenalty});
const tickets=p.tickets.map((t,i)=>({ticket:i+1,numbers:t.numbers.map(Number).sort((a,b)=>a-b)}));
assert(tickets.length===4&&tickets.every(t=>t.numbers.length===6&&new Set(t.numbers).size===6),'invalid four-ticket seal');

const core={
  version:'primitiva-frequency4-prospective-seal-v1',gameId:'primitiva',targetDrawDate:target,
  freeze:{path:FREEZE,sha256:sha256(freezeRaw)},
  engine:{path:enginePath,gitBlobSha:gitBlobSha(engineRaw)},
  strategy:{id:'frequency',ticketsPerDraw:4,ticketCostEUR:1,diversificationPenalty:0.10,weights:freeze.strategy.weights},
  historyBoundary:{rule:'strictly before targetDrawDate',drawsUsed:prior.length,firstDrawDate:prior[0].drawDate,lastDrawDate:prior.at(-1).drawDate},
  tickets,
  guards:{targetResultPresentAtSeal:false,targetOutcomeUsedForSelection:false,retuningPerformed:false,noFutureInformation:true,realMoneyAllowed:false,realStakeEUR:0}
};
const sealHash=sha256(canonical(core));
const out={...core,sealedAt:new Date().toISOString(),sealHashAlgorithm:'sha256',sealHash};
const outPath=`${OUTDIR}/primitiva-frequency4-${target}.json`;
if(fs.existsSync(outPath)){const old=JSON.parse(fs.readFileSync(outPath,'utf8'));assert(old.sealHash===sealHash,`existing seal differs for ${target}`);console.log(JSON.stringify({status:'ALREADY_SEALED_IDENTICAL',target,sealHash,tickets}));process.exit(0);}
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:'SEALED_BEFORE_RESULT',target,sealHash,historyLast:prior.at(-1).drawDate,tickets},null,2));
