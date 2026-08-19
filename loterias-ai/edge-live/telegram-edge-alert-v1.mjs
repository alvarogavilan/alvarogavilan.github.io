#!/usr/bin/env node
import fs from 'node:fs';

const PLAN='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const STATE='loterias-ai/edge-live/telegram-alert-state.json';
const token=process.env.EDGE_LIVE_TELEGRAM_BOT_TOKEN||'';
const configuredChatId=process.env.EDGE_LIVE_TELEGRAM_CHAT_ID||'';
const edgeUrl=process.env.EDGE_LIVE_URL||'https://alvarogavilan.github.io/loterias-ai/edge-live/';
const plan=JSON.parse(fs.readFileSync(PLAN,'utf8'));
const prior=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{};

if(!token){
  console.log(JSON.stringify({telegramConfigured:false,reason:'Missing EDGE_LIVE_TELEGRAM_BOT_TOKEN'}));
  process.exit(0);
}

async function discoverChannelId(){
  if(configuredChatId) return String(configuredChatId);
  if(prior.telegramChatId) return String(prior.telegramChatId);
  const r=await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=${encodeURIComponent(JSON.stringify(['channel_post','edited_channel_post']))}`);
  if(!r.ok) throw new Error(`Telegram getUpdates HTTP ${r.status}`);
  const body=await r.json();
  const rows=Array.isArray(body?.result)?body.result:[];
  const channels=[];
  for(const u of rows){
    const msg=u?.channel_post||u?.edited_channel_post;
    const chat=msg?.chat;
    if(chat?.type==='channel'&&chat?.id){
      const x={id:String(chat.id),title:String(chat.title||'')};
      if(!channels.some(c=>c.id===x.id))channels.push(x);
    }
  }
  const named=[...channels].reverse().find(c=>/edge\s*live/i.test(c.title));
  if(named)return named.id;
  if(channels.length===1)return channels[0].id;
  return null;
}

const chatId=await discoverChannelId();
if(!chatId){
  console.log(JSON.stringify({telegramConfigured:false,reason:'PRIVATE_CHANNEL_NOT_DISCOVERED_YET',instruction:'Add the bot as channel admin and publish one message containing EDGE LIVE.'}));
  process.exit(0);
}

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

const stake=ready?Number(plan.order.stakePerSpinEUR):0;
const spins=ready?Number(plan.order.maxSpins):0;
const total=ready?Number(plan.order.maxTotalStakeEUR):0;
const remainingSeconds=ready?Math.max(0,Math.ceil((untilMs-now)/1000)):0;
const executionSignature=ready?JSON.stringify({stake,spins,total}):null;
const firstConfiguredAlert=!prior?.version;
const shouldSend=ready
  ? prior.lastReady!==true || prior.lastExecutionSignature!==executionSignature
  : prior.lastReady===true || firstConfiguredAlert;

if(!shouldSend){
  console.log(JSON.stringify({telegramConfigured:true,chatIdDiscovered:true,skipped:true,reason:'NO_EXECUTION_STATE_TRANSITION',ready}));
  process.exit(0);
}

let message;
if(ready){
  message=`🟢 EDGE LIVE BOTEMANIA — JUGAR AHORA\n\n🎰 ${plan?.game?.name||"Fishin' Frenzy: Jackpot King"}\n💶 ${stake.toFixed(2)} € por giro\n🔁 Máximo ${spins} giros\n🧾 Máximo total ${total.toFixed(2)} €\n⏱ Ventana restante aprox.: ${remainingSeconds}s\n🕒 Caduca: ${plan.order.validUntil}\n\nABRE EDGE LIVE Y EJECUTA SOLO SI SIGUE EN VERDE:\n${edgeUrl}\n\nSi vuelve a rojo, NO JUEGUES. No aumentes stake ni persigas pérdidas.`;
}else{
  message=`🔴 EDGE LIVE BOTEMANIA — NO JUGAR\n\n🎰 ${plan?.game?.name||"Fishin' Frenzy: Jackpot King"}\n💶 Importe: 0 €\n\nEl canal está conectado. Sólo recibirás una alerta verde cuando exista una orden exacta y vigente. Si una señal verde caduca, recibirás también el aviso de cierre.`;
}

const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({chat_id:chatId,text:message,disable_web_page_preview:false})
});
if(!r.ok)throw new Error(`Telegram HTTP ${r.status}: ${(await r.text()).slice(0,300)}`);

fs.writeFileSync(STATE,JSON.stringify({
  version:'edge-live-telegram-alert-state-v5-private-channel',
  updatedAt:new Date().toISOString(),
  telegramChatId:String(chatId),
  lastReady:ready,
  lastExecutionSignature:executionSignature,
  lastPlanGeneratedAt:plan?.generatedAt||null,
  lastValidUntil:ready?plan?.order?.validUntil:null,
  lastStakePerSpinEUR:stake,
  lastMaxSpins:spins,
  lastMaxTotalStakeEUR:total
},null,2)+'\n');
console.log(JSON.stringify({telegramConfigured:true,sent:true,ready,remainingSeconds,chatIdDiscovered:true,game:plan?.game?.name||null}));
