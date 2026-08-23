import { EdgeSentinel as V4EdgeSentinel } from './index-v4.mjs';

const TELEGRAM_PROOF_KEY='telegramDeliveryProofV1';
const TELEGRAM_PROOF_ATTEMPT_KEY='telegramDeliveryProofAttemptV1';
const RETRY_AFTER_MS=60_000;

export class EdgeSentinel extends V4EdgeSentinel{
  async ensureTelegramDeliveryProof(){
    const existing=await this.ctx.storage.get(TELEGRAM_PROOF_KEY);
    if(existing?.sent===true)return existing;

    const tokenPresent=Boolean(this.env?.TELEGRAM_BOT_TOKEN);
    if(!tokenPresent)return null;
    const chat=await this.resolveTelegramChat();
    if(!chat?.id)return null;

    const priorAttempt=await this.ctx.storage.get(TELEGRAM_PROOF_ATTEMPT_KEY);
    const now=Date.now();
    if(priorAttempt?.atMs&&now-Number(priorAttempt.atMs)<RETRY_AFTER_MS)return priorAttempt;

    const message=[
      '🧪 EDGE 24/7 CONECTADO',
      '',
      '✅ Cloudflare Sentinel activo',
      '✅ Canal Telegram resuelto',
      '✅ Vigilancia automática en ejecución',
      '',
      '🔴 NO JUGAR · 0 €',
      'Esta es una prueba técnica única. No existe ninguna apuesta autorizada ahora.'
    ].join('\n');

    const result=await this.sendTelegram(message);
    const attempt={
      at:new Date(now).toISOString(),
      atMs:now,
      sent:result?.sent===true,
      reason:result?.reason||null,
      messageId:result?.messageId||null,
      chatSource:result?.chatSource||chat.source||null,
    };
    await this.ctx.storage.put(TELEGRAM_PROOF_ATTEMPT_KEY,attempt);
    if(attempt.sent)await this.ctx.storage.put(TELEGRAM_PROOF_KEY,attempt);
    return attempt;
  }

  async alarm(){
    await super.alarm();
    try{await this.ensureTelegramDeliveryProof();}catch{}
  }

  async fetch(request){
    const response=await super.fetch(request);
    try{
      const path=new URL(request.url).pathname;
      if(!['/','/health','/state'].includes(path))return response;
      const body=await response.clone().json();
      const proof=await this.ctx.storage.get(TELEGRAM_PROOF_KEY);
      const attempt=await this.ctx.storage.get(TELEGRAM_PROOF_ATTEMPT_KEY);
      body.telegramDeliveryVerified=proof?.sent===true;
      body.telegramDeliveryProof=proof||attempt||null;
      return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}

export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
