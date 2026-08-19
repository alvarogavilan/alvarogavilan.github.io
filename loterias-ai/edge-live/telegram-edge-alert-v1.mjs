#!/usr/bin/env node
import fs from 'node:fs';

const GATE='loterias-ai/casino/evidence/five-euro-real-pilot-gate-v1.json';
const STATE='loterias-ai/edge-live/telegram-alert-state.json';
const token=process.env.EDGE_LIVE_TELEGRAM_BOT_TOKEN||'';
const chatId=process.env.EDGE_LIVE_TELEGRAM_CHAT_ID||'';
const gate=JSON.parse(fs.readFileSync(GATE,'utf8'));
const prior=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{};
const botLane=(Array.isArray(gate?.lanes)?gate.lanes:[]).find(x=>x?.id==='botemania-jackpot-king')||{};
const eligible=Array.isArray(gate?.decision?.eligibleLanes)?gate.decision.eligibleLanes:[];
const structural=botLane?.evidence?.networkAllocationProspectivelyValidated===true;
const allowed=botLane?.eligible===true&&gate?.decision?.pilotAllowed===true&&Number(gate?.decision?.maxTotalStakeEUR)>0&&eligible.includes('botemania-jackpot-king');
const key=JSON.stringify({allowed,structural,max:allowed?gate?.decision?.maxTotalStakeEUR||0:0,state:botLane?.evidence?.liveGateState||null});

if(!token||!chatId){console.log(JSON.stringify({telegramConfigured:false,allowed,structural,reason:'Missing EDGE_LIVE_TELEGRAM_BOT_TOKEN or EDGE_LIVE_TELEGRAM_CHAT_ID'}));process.exit(0);}
if(prior.lastAlertKey===key){console.log(JSON.stringify({telegramConfigured:true,skipped:true,reason:'UNCHANGED_BOTEMANIA_GATE'}));process.exit(0);}

let message;
if(allowed){
 message=`🟢 EDGE LIVE BOTEMANIA — APUESTA\n\nJuego: Fishin’ Frenzy: Jackpot King\nLímite máximo: ${Number(gate.decision.maxTotalStakeEUR).toFixed(2)} €\nEstado: ${botLane?.evidence?.liveGateState||'VALIDADO'}\n\nAbre Edge Live y comprueba que el dato siga fresco. No aumentes el importe ni persigas pérdidas.`;
}else if(structural){
 message=`🟡 EDGE LIVE BOTEMANIA — ESTRUCTURA VALIDADA\n\nFishin’ Frenzy: Jackpot King ha completado el protocolo prospectivo de asignación de red.\n\nTODAVÍA NO APUESTES: el gate económico sigue bloqueado.\nEstado económico: ${botLane?.evidence?.liveGateState||'BLOQUEADO'}\nMejor RTP conservador: ${(Number(botLane?.evidence?.bestConservativeRtp||0)*100).toFixed(3)}%\n\nImporte operativo: 0 €.`;
}else{
 message=`🔴 EDGE LIVE BOTEMANIA — NO APUESTES\n\nJuego vigilado: Fishin’ Frenzy: Jackpot King\nEstado: ${botLane?.evidence?.liveGateState||'BLOQUEADO'}\nMejor RTP conservador: ${(Number(botLane?.evidence?.bestConservativeRtp||0)*100).toFixed(3)}%\n\nImporte operativo: 0 €.`;
}

const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message,disable_web_page_preview:true})});
if(!r.ok)throw new Error(`Telegram HTTP ${r.status}: ${(await r.text()).slice(0,300)}`);
fs.writeFileSync(STATE,JSON.stringify({version:'edge-live-telegram-alert-state-v3',updatedAt:new Date().toISOString(),lastAlertKey:key,lastBotemaniaAllowed:allowed,lastStructuralValidation:structural,lastDecision:botLane},null,2)+'\n');
console.log(JSON.stringify({telegramConfigured:true,sent:true,allowed,structural,game:'Fishin Frenzy: Jackpot King'}));
