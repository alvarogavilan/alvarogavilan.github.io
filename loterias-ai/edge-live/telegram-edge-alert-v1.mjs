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
const gameName=plan?.game?.name||'Oportunidad EDGE';
const gameUrl=plan?.game?.url||'https://www.botemania.es/';
const gameId=plan?.game?.id||'unknown';

function writeDiag(extra={}){
  const out={version:'edge-live-telegram-diagnostic-v5-universal-game',generatedAt:new Date().toISOString(),tokenPresent:Boolean(token),configuredChatIdPresent:Boolean(configuredChatId),encryptedChannelMemoryPresent:Boolean(prior?.encryptedChannel),planState:plan?.state||null,planGeneratedAt:plan?.generatedAt||null,gameId,gameName,...extra};
  fs.writeFileSync(DIAG,JSON.stringify(out,null,2)+'\n');
  return out;
}

function keyFromToken(){return crypto.createHash('sha256').update(token).digest();}
function encryptChannelId(chatId){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',keyFromToken(),iv);
  const ciphertext=Buffer.concat([cipher.update(String(chatId),'utf8'),cipher.final()]);
  return {alg:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function decryptChannelId(box){
  try{if(!box||box.alg!=='aes-256-gcm')return null;const decipher=crypto.createDecipheriv('aes-256-gcm',keyFromToken(),Buffer.from(box.iv,'base64'));decipher.setAuthTag(Buffer.from(box.tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(box.ciphertext,'base64')),decipher.final()]).toString('utf8');}catch{return null;}
}
function addChannel(channels,chat,source){if(chat?.type!=='channel'||!chat?.id)return;const x={id:String(chat.id),title:String(chat.title||''),source};if(!channels.some(c=>c.id===x.id))channels.push(x);}
async function discoverChannelId(){
  if(configuredChatId)return{id:String(configuredChatId),source:'CONFIGURED_SECRET'};
  const remembered=decryptChannelId(prior?.encryptedChannel);if(remembered)return{id:remembered,source:'ENCRYPTED_CHANNEL_MEMORY'};
  const allowed=['channel_post','edited_channel_post','my_chat_member','message'];
  const r=await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=${encodeURIComponent(JSON.stringify(allowed))}`);if(!r.ok)throw new Error(`Telegram getUpdates HTTP ${r.status}`);
  const body=await r.json(),rows=Array.isArray(body?.result)?body.result:[],channels=[];
  for(const u of rows){addChannel(channels,(u?.channel_post||u?.edited_channel_post)?.chat,'CHANNEL_POST');addChannel(channels,u?.my_chat_member?.chat,'MY_CHAT_MEMBER');const origin=u?.message?.forward_origin;if(origin?.type==='channel')addChannel(channels,origin?.chat,'FORWARDED_CHANNEL_POST');addChannel(channels,u?.message?.forward_from_chat,'FORWARDED_CHANNEL_POST_LEGACY');}
  const named=[...channels].reverse().find(c=>/edge\s*live|botemania/i.test(c.title));if(named)return named;if(channels.length===1)return channels[0];return null;
}

function persistState({phase='RED',executionSignature=null,stake=0,spins=0,total=0,validUntil=null,chatId}){
  fs.writeFileSync(STATE,JSON.stringify({version:'edge-live-telegram-alert-state-v9-universal-game',updatedAt:new Date().toISOString(),encryptedChannel:encryptChannelId(chatId),lastPhase:phase,lastReady:phase==='GREEN',lastGameId:gameId,lastExecutionSignature:executionSignature,lastPlanGeneratedAt:plan?.generatedAt||null,lastValidUntil:phase==='GREEN'?validUntil:null,lastStakePerSpinEUR:stake,lastMaxSpins:spins,lastMaxTotalStakeEUR:total},null,2)+'\n');
}

try{
  if(!token){const d=writeDiag({channelDiscovered:false,sendAttempted:false,sendOk:false,reason:'MISSING_EDGE_LIVE_TELEGRAM_BOT_TOKEN'});console.log(JSON.stringify(d));process.exit(0);}
  const discovered=await discoverChannelId(),chatId=discovered?.id||null;
  if(!chatId){const d=writeDiag({channelDiscovered:false,discoverySource:null,sendAttempted:false,sendOk:false,reason:'PRIVATE_CHANNEL_NOT_DISCOVERED_YET'});console.log(JSON.stringify(d));process.exit(0);}

  const now=Date.now(),untilMs=Date.parse(plan?.order?.validUntil||'');
  const ready=plan?.state==='READY_TO_EXECUTE_MANUALLY'&&plan?.order?.action==='PLAY'&&Number(plan?.order?.stakePerSpinEUR)>0&&Number(plan?.order?.maxSpins)>0&&Number(plan?.order?.maxTotalStakeEUR)>0&&Number.isFinite(untilMs)&&untilMs>now&&plan?.evidence?.structurePass===true&&plan?.evidence?.economicPass===true&&plan?.evidence?.exactStakeKnown===true&&plan?.evidence?.sourceFresh===true&&plan?.evidence?.withinFreshExecutionWindow===true;
  const prepare=!ready&&plan?.state==='PREPARE_OPEN_GAME_NO_BET'&&plan?.order?.action==='OPEN_GAME_ONLY_NO_BET'&&plan?.evidence?.structurePass===true&&plan?.evidence?.exactStakeKnown===true&&plan?.evidence?.sourceFresh===true;
  const phase=ready?'GREEN':prepare?'YELLOW':'RED';
  const stake=ready?Number(plan.order.stakePerSpinEUR):0,spins=ready?Number(plan.order.maxSpins):0,total=ready?Number(plan.order.maxTotalStakeEUR):0;
  const remainingSeconds=ready?Math.max(0,Math.ceil((untilMs-now)/1000)):0;
  const executionSignature=ready?JSON.stringify({gameId,stake,spins,total,validUntil:plan?.order?.validUntil}):null;
  const priorPhase=prior?.lastPhase||(prior?.lastReady===true?'GREEN':'RED');
  const firstConfiguredAlert=!prior?.version;
  const gameChanged=prior?.lastGameId&&prior.lastGameId!==gameId;
  const shouldSend=phase==='GREEN'?(priorPhase!=='GREEN'||prior.lastExecutionSignature!==executionSignature||gameChanged):phase==='YELLOW'?(priorPhase!=='YELLOW'||gameChanged):(priorPhase!=='RED'||firstConfiguredAlert||gameChanged);

  if(!shouldSend){persistState({phase,executionSignature,stake,spins,total,validUntil:plan?.order?.validUntil,chatId});const d=writeDiag({channelDiscovered:true,discoverySource:discovered.source,phase,ready,sendAttempted:false,sendOk:true,reason:'NO_PHASE_TRANSITION'});console.log(JSON.stringify(d));process.exit(0);}

  let message;
  if(phase==='GREEN'){
    message=`🟢 JUGAR AHORA — EDGE LIVE\n\n🎰 ${gameName}\n💶 APUESTA: ${stake.toFixed(2)} € POR GIRO\n🔁 MÁXIMO: ${spins} GIROS\n🧾 TOPE TOTAL: ${total.toFixed(2)} €\n⏱ SEÑAL VIGENTE: ${remainingSeconds}s\n\nORDEN:\n1️⃣ Abre o permanece en el juego indicado.\n2️⃣ Antes del PRIMER giro confirma que sigue VERDE.\n3️⃣ Ejecuta exactamente el stake y giros indicados.\n4️⃣ Si llega 🔴 PARAR, NO hagas ningún giro más.\n\nNo aumentes importe. No persigas pérdidas.`;
  }else if(phase==='YELLOW'){
    const eta=Number(plan?.order?.preparationEtaSeconds);
    message=`🟡 PREPÁRATE — EDGE LIVE\n\n🎰 ${gameName}\n🚫 TODAVÍA NO APUESTES\n\nORDEN:\n1️⃣ Abre Botemania ahora.\n2️⃣ Entra en ${gameName}.\n3️⃣ Déjalo preparado para jugar.\n4️⃣ Espera el mensaje 🟢 JUGAR AHORA.\n${Number.isFinite(eta)?`\nPosible activación operativa aproximada: ${Math.max(0,eta)}s.`:''}\n\nSi llega 🔴, no juegues.`;
  }else{
    message=`🔴 NO JUGAR / PARAR — EDGE LIVE\n\n🎰 ${gameName}\n💶 APUESTA AUTORIZADA: 0 €\n\nORDEN: NO HAGAS NINGÚN GIRO.\nEspera una nueva alerta 🟡 o 🟢.`;
  }

  const buttons=phase==='RED'?[[{text:'📊 ABRIR EDGE LIVE',url:edgeUrl}]]:[[{text:'🎰 ABRIR JUEGO',url:gameUrl}],[{text:'📊 ABRIR EDGE LIVE',url:edgeUrl}]];
  const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message,disable_web_page_preview:true,reply_markup:{inline_keyboard:buttons}})});
  if(!r.ok)throw new Error(`Telegram sendMessage HTTP ${r.status}`);

  persistState({phase,executionSignature,stake,spins,total,validUntil:plan?.order?.validUntil,chatId});
  const d=writeDiag({channelDiscovered:true,discoverySource:discovered.source,phase,ready,sendAttempted:true,sendOk:true,reason:'SEND_OK',remainingSeconds});console.log(JSON.stringify(d));
}catch(e){const safe=String(e?.message||e).replaceAll(token,'[REDACTED]');const d=writeDiag({channelDiscovered:null,discoverySource:null,sendAttempted:null,sendOk:false,reason:'TELEGRAM_ALERT_ERROR',error:safe.slice(0,180)});console.error(JSON.stringify(d));process.exitCode=1;}
