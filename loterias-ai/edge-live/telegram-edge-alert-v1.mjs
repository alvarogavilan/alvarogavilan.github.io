#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const PLAN='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const STATE='loterias-ai/edge-live/telegram-alert-state.json';
const DIAG='loterias-ai/edge-live/telegram-alert-diagnostic.json';
const token=process.env.EDGE_LIVE_TELEGRAM_BOT_TOKEN||'';
const configuredChatId=process.env.EDGE_LIVE_TELEGRAM_CHAT_ID||'';
const edgeUrl=process.env.EDGE_LIVE_URL||'https://alvarogavilan.github.io/loterias-ai/edge-live/';
const plan=JSON.parse(fs.readFileSync(PLAN,'utf8'));
const prior=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{};

function writeDiag(extra={}){
  const out={
    version:'edge-live-telegram-diagnostic-v3-encrypted-channel-memory',
    generatedAt:new Date().toISOString(),
    tokenPresent:Boolean(token),
    configuredChatIdPresent:Boolean(configuredChatId),
    encryptedChannelMemoryPresent:Boolean(prior?.encryptedChannel),
    planState:plan?.state||null,
    planGeneratedAt:plan?.generatedAt||null,
    ...extra
  };
  fs.writeFileSync(DIAG,JSON.stringify(out,null,2)+'\n');
  return out;
}

function keyFromToken(){return crypto.createHash('sha256').update(token).digest();}
function encryptChannelId(chatId){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',keyFromToken(),iv);
  const ciphertext=Buffer.concat([cipher.update(String(chatId),'utf8'),cipher.final()]);
  return {alg:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function decryptChannelId(box){
  try{
    if(!box||box.alg!=='aes-256-gcm')return null;
    const decipher=crypto.createDecipheriv('aes-256-gcm',keyFromToken(),Buffer.from(box.iv,'base64'));
    decipher.setAuthTag(Buffer.from(box.tag,'base64'));
    return Buffer.concat([decipher.update(Buffer.from(box.ciphertext,'base64')),decipher.final()]).toString('utf8');
  }catch{return null;}
}

function addChannel(channels,chat,source){
  if(chat?.type!=='channel'||!chat?.id)return;
  const x={id:String(chat.id),title:String(chat.title||''),source};
  if(!channels.some(c=>c.id===x.id))channels.push(x);
}

async function discoverChannelId(){
  if(configuredChatId) return {id:String(configuredChatId),source:'CONFIGURED_SECRET'};
  const remembered=decryptChannelId(prior?.encryptedChannel);
  if(remembered) return {id:remembered,source:'ENCRYPTED_CHANNEL_MEMORY'};
  const allowed=['channel_post','edited_channel_post','my_chat_member','message'];
  const r=await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=${encodeURIComponent(JSON.stringify(allowed))}`);
  if(!r.ok) throw new Error(`Telegram getUpdates HTTP ${r.status}`);
  const body=await r.json();
  const rows=Array.isArray(body?.result)?body.result:[];
  const channels=[];
  for(const u of rows){
    addChannel(channels,(u?.channel_post||u?.edited_channel_post)?.chat,'CHANNEL_POST');
    addChannel(channels,u?.my_chat_member?.chat,'MY_CHAT_MEMBER');
    const origin=u?.message?.forward_origin;
    if(origin?.type==='channel')addChannel(channels,origin?.chat,'FORWARDED_CHANNEL_POST');
    addChannel(channels,u?.message?.forward_from_chat,'FORWARDED_CHANNEL_POST_LEGACY');
  }
  const named=[...channels].reverse().find(c=>/edge\s*live|botemania/i.test(c.title));
  if(named)return named;
  if(channels.length===1)return channels[0];
  return null;
}

function persistState({ready=false,executionSignature=null,stake=0,spins=0,total=0,validUntil=null,chatId}){
  fs.writeFileSync(STATE,JSON.stringify({
    version:'edge-live-telegram-alert-state-v7-encrypted-channel-memory',
    updatedAt:new Date().toISOString(),
    encryptedChannel:encryptChannelId(chatId),
    lastReady:ready,
    lastExecutionSignature:executionSignature,
    lastPlanGeneratedAt:plan?.generatedAt||null,
    lastValidUntil:ready?validUntil:null,
    lastStakePerSpinEUR:stake,
    lastMaxSpins:spins,
    lastMaxTotalStakeEUR:total
  },null,2)+'\n');
}

try{
  if(!token){
    const d=writeDiag({channelDiscovered:false,sendAttempted:false,sendOk:false,reason:'MISSING_EDGE_LIVE_TELEGRAM_BOT_TOKEN'});
    console.log(JSON.stringify(d));
    process.exit(0);
  }

  const discovered=await discoverChannelId();
  const chatId=discovered?.id||null;
  if(!chatId){
    const d=writeDiag({channelDiscovered:false,discoverySource:null,sendAttempted:false,sendOk:false,reason:'PRIVATE_CHANNEL_NOT_DISCOVERED_YET'});
    console.log(JSON.stringify(d));
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
    persistState({ready,executionSignature,stake,spins,total,validUntil:plan?.order?.validUntil,chatId});
    const d=writeDiag({channelDiscovered:true,discoverySource:discovered.source,ready,sendAttempted:false,sendOk:true,reason:'NO_EXECUTION_STATE_TRANSITION'});
    console.log(JSON.stringify(d));
    process.exit(0);
  }

  let message;
  if(ready){
    message=`🟢 EDGE LIVE BOTEMANIA — JUGAR AHORA\n\n🎰 ${plan?.game?.name||"Fishin' Frenzy: Jackpot King"}\n💶 ${stake.toFixed(2)} € por giro\n🔁 Máximo ${spins} giros\n🧾 Máximo total ${total.toFixed(2)} €\n⏱ Ventana restante aprox.: ${remainingSeconds}s\n🕒 Caduca: ${plan.order.validUntil}\n\nABRE EDGE LIVE Y EJECUTA SOLO SI SIGUE EN VERDE:\n${edgeUrl}\n\nSi vuelve a rojo, NO JUEGUES. No aumentes stake ni persigas pérdidas.`;
  }else{
    message=`🔴 EDGE LIVE BOTEMANIA — NO JUGAR\n\n🎰 ${plan?.game?.name||"Fishin' Frenzy: Jackpot King"}\n💶 Importe: 0 €\n\nEl canal está conectado. Sólo recibirás una alerta verde cuando exista una orden exacta y vigente. Si una señal verde caduca, recibirás también el aviso de cierre.`;
  }

  const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:chatId,text:message,disable_web_page_preview:false})
  });
  if(!r.ok)throw new Error(`Telegram sendMessage HTTP ${r.status}`);

  persistState({ready,executionSignature,stake,spins,total,validUntil:plan?.order?.validUntil,chatId});
  const d=writeDiag({channelDiscovered:true,discoverySource:discovered.source,ready,sendAttempted:true,sendOk:true,reason:'SEND_OK',remainingSeconds});
  console.log(JSON.stringify(d));
}catch(e){
  const safe=String(e?.message||e).replaceAll(token,'[REDACTED]');
  const d=writeDiag({channelDiscovered:null,discoverySource:null,sendAttempted:null,sendOk:false,reason:'TELEGRAM_ALERT_ERROR',error:safe.slice(0,180)});
  console.error(JSON.stringify(d));
  process.exitCode=1;
}
