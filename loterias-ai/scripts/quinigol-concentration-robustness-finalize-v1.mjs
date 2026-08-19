#!/usr/bin/env node
import fs from 'node:fs';

const FREEZE='loterias-ai/data/policies/quinigol-concentration-robustness-freeze-v1.json';
const ARCHIVE='loterias-ai/data/archive/quinigol';
const V3_LEDGER='loterias-ai/data/shadow/quinigol-ledger.json';
const V3_FINAL='loterias-ai/data/shadow/quinigol-prospective-final-30.json';
const V4_LEDGER='loterias-ai/data/shadow/quinigol-replication-v4-ledger.json';
const V4_FINAL='loterias-ai/data/shadow/quinigol-replication-v4-final-30.json';
const OUT='loterias-ai/data/shadow/quinigol-concentration-robustness-status-v1.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze.version!=='quinigol-concentration-robustness-freeze-v1'||freeze.preOutcomeCustody?.v3ObservedJornadasAtFreeze!==0||freeze.scope?.canRescueBaseFailure!==false||freeze.scope?.canOnlyMakePromotionHarder!==true||freeze.guards?.realMoneyAllowed!==false)throw new Error('Quinigol concentration robustness freeze drift');
const gates=freeze.fixedRobustnessGates||{};
if(Number(gates.maximumTop1ShareOfTotalReturn)!==0.5||gates.leaveEverySingleJornadaOutROIPositive!==true||Number(gates.minimumPositiveTenJornadaBlocks)!==2||Number(gates.tenJornadaBlocksEvaluated)!==3||gates.baseProspectiveEconomicGateMustAlsoPass!==true)throw new Error('Quinigol concentration robustness gate drift');
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
let rows=[];for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(read(`${ARCHIVE}/${f}`)?.records||[]));
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.codes)&&r.result.codes.length===6&&r.economics?.validation?.officialSELAE).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const byId=new Map(rows.map(r=>[String(r.drawId||''),r])),byDate=new Map(rows.map(r=>[String(r.drawDate||''),r]));
const payout=(rec,hits)=>{for(const c of rec.economics?.categories||[]){const label=String(c.label||'').toLowerCase();if(new RegExp(`(^|\\D)${hits}\\s*aciert`).test(label))return Number(c.prize||0)}return 0};
const scoreTicket=(rec,ticket)=>{let hits=0;for(let i=0;i<6;i++)if(String(ticket?.[i]||'').toUpperCase()===String(rec.result.codes[i]||'').toUpperCase())hits++;return{hits,ret:payout(rec,hits)}};
function adjudicate({label,ledgerPath,finalPath,observedStatus}){
  const final=read(finalPath);if(!final)return{label,state:'WAITING_FOR_BASE_FIXED_FINAL',performanceHidden:true,robustPromotionCandidate:false};
  if(final.fixedBoundary?.jornadas!==30||final.guards?.noOptionalStopping!==true||final.guards?.realMoneyAllowed!==false)throw new Error(`${label} base final custody drift`);
  const ledger=read(ledgerPath);if(!ledger)throw new Error(`${label} ledger missing after final`);
  const observed=(ledger.entries||[]).filter(e=>e.status===observedStatus);if(observed.length!==30)throw new Error(`${label} robustness requires exact fixed 30`);
  const per=[];
  for(const e of observed){const rec=(e.drawId&&byId.get(String(e.drawId)))||byDate.get(String(e.drawDate));if(!rec)throw new Error(`${label} official target missing ${e.drawId||e.drawDate}`);let stake=0,ret=0;for(const t of e.tickets||[]){const x=scoreTicket(rec,t);stake+=Number(rec.economics?.ticketCost||1);ret+=x.ret}per.push({drawDate:rec.drawDate,stakeEUR:stake,returnEUR:ret,plEUR:ret-stake})}
  const totalStake=per.reduce((s,x)=>s+x.stakeEUR,0),totalReturn=per.reduce((s,x)=>s+x.returnEUR,0),roi=totalStake?(totalReturn-totalStake)/totalStake:null;
  const top1Return=Math.max(0,...per.map(x=>x.returnEUR)),top1Share=totalReturn>0?top1Return/totalReturn:1;
  const leaveOneOut=per.map((x,i)=>{const s=totalStake-x.stakeEUR,r=totalReturn-x.returnEUR;return{omittedIndex:i+1,roi:s?(r-s)/s:null}}),minimumLeaveOneOutROI=Math.min(...leaveOneOut.map(x=>Number(x.roi)));
  const blocks=[];for(let b=0;b<3;b++){const chunk=per.slice(b*10,(b+1)*10),s=chunk.reduce((a,x)=>a+x.stakeEUR,0),r=chunk.reduce((a,x)=>a+x.returnEUR,0);blocks.push({block:b+1,jornadas:chunk.length,roi:s?(r-s)/s:null,positive:s>0&&r>s})}
  const positiveBlocks=blocks.filter(x=>x.positive).length,basePass=final.gates?.economicPromotionCandidate===true;
  const concentrationPass=top1Share<=0.5,leaveOneOutPass=minimumLeaveOneOutROI>0,blockPass=positiveBlocks>=2,robustnessPass=concentrationPass&&leaveOneOutPass&&blockPass,robustPromotionCandidate=basePass&&robustnessPass;
  return{label,state:'FIXED_30_ROBUSTNESS_FINAL',performanceHidden:false,baseEconomicPromotionCandidate:basePass,observed:{roi,top1ReturnShare:top1Share,minimumLeaveOneOutROI,positiveTenJornadaBlocks:positiveBlocks,tenJornadaBlocks:blocks},gates:{top1ShareAtMostHalf:concentrationPass,everyLeaveOneOutROIPositive:leaveOneOutPass,atLeastTwoPositiveTenJornadaBlocks:blockPass,robustnessPass,baseAndRobustnessPass:robustPromotionCandidate},robustPromotionCandidate,interpretation:!basePass?'BASE_PROSPECTIVE_GATE_FAILED':robustnessPass?'BASE_AND_CONCENTRATION_ROBUSTNESS_PASSED':'ECONOMIC_SIGNAL_CONCENTRATED_NOT_ROBUST'};
}
const v3=adjudicate({label:'quinigol-v3',ledgerPath:V3_LEDGER,finalPath:V3_FINAL,observedStatus:'OBSERVED_OFFICIAL_BLINDED'});
const v4=adjudicate({label:'quinigol-v4',ledgerPath:V4_LEDGER,finalPath:V4_FINAL,observedStatus:'OBSERVED_OFFICIAL_BLINDED_V4'});
const independentRobustConfirmation=v3.robustPromotionCandidate===true&&v4.robustPromotionCandidate===true;
const out={version:'quinigol-concentration-robustness-status-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,v3,v4,independentRobustConfirmation,decision:independentRobustConfirmation?'INDEPENDENT_ROBUST_ECONOMIC_CONFIRMATION_CANDIDATE_REQUIRES_EXPLICIT_REVIEW':v3.state==='WAITING_FOR_BASE_FIXED_FINAL'?'WAITING_FOR_V3_FIXED_30':v3.robustPromotionCandidate!==true?'NO_ROBUST_PROMOTION_FROM_V3':v4.state==='WAITING_FOR_BASE_FIXED_FINAL'?'V3_ROBUST_PASS_AWAIT_UNTOUCHED_V4':'NO_INDEPENDENT_ROBUST_CONFIRMATION',guards:{interimPerformanceRead:false,baseFailureCanBeRescued:false,noRetuning:true,noOptionalStopping:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.mkdirSync('loterias-ai/data/shadow',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({decision:out.decision,v3:{state:v3.state,robustPromotionCandidate:v3.robustPromotionCandidate},v4:{state:v4.state,robustPromotionCandidate:v4.robustPromotionCandidate},independentRobustConfirmation},null,2));
