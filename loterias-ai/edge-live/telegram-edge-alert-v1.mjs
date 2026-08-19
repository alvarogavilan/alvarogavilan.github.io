#!/usr/bin/env node
import fs from 'node:fs';

const GATE='loterias-ai/casino/evidence/five-euro-real-pilot-gate-v1.json';
const STATE='loterias-ai/edge-live/telegram-alert-state.json';
const token=process.env.EDGE_LIVE_TELEGRAM_BOT_TOKEN||'';
const chatId=process.env.EDGE_LIVE_TELEGRAM_CHAT_ID||'';
const gate=JSON.parse(fs.readFileSync(GATE,'utf8'));
const prior=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{};
const eligible=Array.isArray(gate?.decision?.eligibleLanes)?gate.decision.eligibleLanes:[];
const allowed=gate?.decision?.pilotAllowed===true&&Number(gate?.decision?.maxTotalStakeEUR)>0&&eligible.length>0;
const key=JSON.stringify({allowed,eligible,max:gate?.decision?.maxTotalStakeEUR||0,state:gate?.decision?.state||null});

if(!token||!chatId){console.log(JSON.stringify({telegramConfigured:false,allowed,reason:'Missing EDGE_LIVE_TELEGRAM_BOT_TOKEN or EDGE_LIVE_TELEGRAM_CHAT_ID'}));process.exit(0);}
if(prior.lastAlertKey===key){console.log(JSON.stringify({telegramConfigured:true,skipped:true,reason:'UNCHANGED_GATE'}));process.exit(0);}

const labels={
 'botemania-jackpot-king':'Fishin’ Frenzy · Jackpot King',
 'playuzu-goal-goal-goal-blackjack':'Goal Goal Goal Blackjack',
 'lightning-roulette':'Lightning Roulette'
};
const message=allowed
 ? `🟢 EDGE LIVE — OPORTUNIDAD VALIDADA\n\nJuego: ${eligible.map(x=>labels[x]||x).join(', ')}\nLímite máximo del gate: ${Number(gate.decision.maxTotalStakeEUR).toFixed(2)} €\nEstado: ${gate.decision.state}\n\nAbre Edge Live y verifica que el dato siga fresco antes de cualquier acción. No aumentes el importe para recuperar pérdidas.`
 : `🔴 EDGE LIVE — NO APUESTES\n\nNo existe ahora una oportunidad con gate económico validado.\nEstado: ${gate?.decision?.state||'NO_REAL_PILOT'}\n\nImporte operativo: 0 €.`;

const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text:message,disable_web_page_preview:true})});
if(!r.ok)throw new Error(`Telegram HTTP ${r.status}: ${(await r.text()).slice(0,300)}`);
fs.writeFileSync(STATE,JSON.stringify({version:'edge-live-telegram-alert-state-v1',updatedAt:new Date().toISOString(),lastAlertKey:key,lastDecision:gate.decision},null,2)+'\n');
console.log(JSON.stringify({telegramConfigured:true,sent:true,allowed,eligible}));
