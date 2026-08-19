#!/usr/bin/env node
import fs from 'node:fs';

const PLAN='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const STATE='loterias-ai/edge-live/telegram-alert-state.json';
const token=process.env.EDGE_LIVE_TELEGRAM_BOT_TOKEN||'';
const chatId=process.env.EDGE_LIVE_TELEGRAM_CHAT_ID||'';
const edgeUrl=process.env.EDGE_LIVE_URL||'https://alvarogavilan.github.io/loterias-ai/edge-live/';
const plan=JSON.parse(fs.readFileSync(PLAN,'utf8'));
const prior=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{};

const now=Date.now();
const untilMs=Date.parse(plan?.order?.validUntil||'');
const ready=plan?.state==='READY_TO_EXECUTE_MANUALLY' &&
  plan?.order?.action==='PLAY' &&
  Number(plan?.order?.stakePerSpinEUR)>0 &&
  Number(plan?.order?.maxSpins)>0 &&
  Number(plan?.order?.maxTotalStakeEUR)>0 &&
  Number.isFinite(untilMs) && untilMs>now &&
  plan?.evidence?.structurePass===true &&
  plan?.evidence?.economicPass===true &&
  plan?.evidence?.exactStakeKnown===true &&
  plan?.evidence?.sourceFresh===true &&
  plan?.evidence?.withinFreshExecutionWindow===true;

const remainingSeconds=ready?Math.max(0,Math.ceil((untilMs-now)/1000)):0;
const fingerprint=JSON.stringify({
  ready,
  generatedAt:ready?plan?.generatedAt:null,
  validUntil:ready?plan?.order?.validUntil:null,
  stake:ready?Number(plan?.order?.stakePerSpinEUR):0,
  spins:ready?Number(plan?.order?.maxSpins):0,
  total:ready?Number(plan?.order?.maxTotalStakeEUR):0,
  blockers:ready?[]:(plan?.blockers||[])
});

if(!token||!chatId){
  console.log(JSON.stringify({telegramConfigured:false,ready,reason:'Missing EDGE_LIVE_TELEGRAM_BOT_TOKEN or EDGE_LIVE_TELEGRAM_CHAT_ID'}));
  process.exit(0);
}
if(prior.lastAlertFingerprint===fingerprint){
  console.log(JSON.stringify({telegramConfigured:true,skipped:true,reason:'UNCHANGED_EXACT_EXECUTION_PLAN'}));
  process.exit(0);
}

let message;
if(ready){
  const stake=Number(plan.order.stakePerSpinEUR).toFixed(2);
  const total=Number(plan.order.maxTotalStakeEUR).toFixed(2);
  message=`🟢 EDGE LIVE BOTEMANIA — JUGAR AHORA\n\n🎰 ${plan?.game?.name||"Fishin' Frenzy: Jackpot King"}\n💶 ${stake} € por giro\n🔁 Máximo ${plan.order.maxSpins} giros\n🧾 Máximo total ${total} €\n⏱ Ventana restante aprox.: ${remainingSeconds}s\n🕒 Caduca: ${plan.order.validUntil}\n\nABRE EDGE LIVE Y EJECUTA SOLO SI SIGUE EN VERDE:\n${edgeUrl}\n\nSi la app vuelve a rojo, NO JUEGUES. No aumentes stake ni persigas pérdidas.`;
}else{
  const blockers=(plan?.blockers||[]).join(', ')||'NO_EXECUTION';
  message=`🔴 EDGE LIVE BOTEMANIA — NO JUGAR\n\nJuego vigilado: ${plan?.game?.name||"Fishin' Frenzy: Jackpot King"}\nImporte: 0 €\nBloqueos: ${blockers}\n\nNo existe una orden ejecutable vigente.`;
}

const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({chat_id:chatId,text:message,disable_web_page_preview:false})
});
if(!r.ok)throw new Error(`Telegram HTTP ${r.status}: ${(await r.text()).slice(0,300)}`);
fs.writeFileSync(STATE,JSON.stringify({
  version:'edge-live-telegram-alert-state-v4-exact-execution',
  updatedAt:new Date().toISOString(),
  lastAlertFingerprint:fingerprint,
  lastReady:ready,
  lastPlanGeneratedAt:plan?.generatedAt||null,
  lastValidUntil:ready?plan?.order?.validUntil:null,
  lastStakePerSpinEUR:ready?Number(plan?.order?.stakePerSpinEUR):0,
  lastMaxSpins:ready?Number(plan?.order?.maxSpins):0,
  lastMaxTotalStakeEUR:ready?Number(plan?.order?.maxTotalStakeEUR):0
},null,2)+'\n');
console.log(JSON.stringify({telegramConfigured:true,sent:true,ready,remainingSeconds,game:plan?.game?.name||null}));
