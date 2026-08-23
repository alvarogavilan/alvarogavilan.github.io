import { EdgeSentinel as BaseEdgeSentinel } from './index-v2.mjs';

const CHANNEL_MEMORY_URL='https://alvarogavilan.github.io/loterias-ai/edge-live/telegram-alert-state.json';

const fromB64=s=>Uint8Array.from(atob(String(s||'')),c=>c.charCodeAt(0));
const utf8=s=>new TextEncoder().encode(String(s||''));

async function decryptRememberedChannel(token,box){
  if(!token||!box||box.alg!=='aes-256-gcm')return null;
  try{
    const digest=await crypto.subtle.digest('SHA-256',utf8(token));
    const key=await crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['decrypt']);
    const iv=fromB64(box.iv),cipher=fromB64(box.ciphertext),tag=fromB64(box.tag);
    const joined=new Uint8Array(cipher.length+tag.length);joined.set(cipher,0);joined.set(tag,cipher.length);
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,tagLength:128},key,joined);
    return new TextDecoder().decode(clear);
  }catch{return null;}
}

export class EdgeSentinel extends BaseEdgeSentinel{
  async resolveTelegramChat(){
    if(this.env.TELEGRAM_CHAT_ID)return {id:String(this.env.TELEGRAM_CHAT_ID),source:'CONFIGURED_SECRET'};
    const cached=await this.ctx.storage.get('telegramResolvedChat');
    if(cached?.id)return cached;
    const token=this.env.TELEGRAM_BOT_TOKEN||'';
    if(!token)return null;

    try{
      const r=await fetch(`${CHANNEL_MEMORY_URL}?t=${Date.now()}`,{headers:{accept:'application/json'}});
      if(r.ok){
        const remembered=await r.json();
        const id=await decryptRememberedChannel(token,remembered?.encryptedChannel);
        if(id){const out={id:String(id),source:'ENCRYPTED_CHANNEL_MEMORY'};await this.ctx.storage.put('telegramResolvedChat',out);return out;}
      }
    }catch{}

    try{
      const allowed=['channel_post','edited_channel_post','my_chat_member','message'];
      const r=await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=${encodeURIComponent(JSON.stringify(allowed))}`);
      if(r.ok){
        const body=await r.json(),rows=Array.isArray(body?.result)?body.result:[],channels=[];
        const add=chat=>{if(chat?.type==='channel'&&chat?.id&&!channels.some(x=>x.id===String(chat.id)))channels.push({id:String(chat.id),title:String(chat.title||'')});};
        for(const u of rows){add((u?.channel_post||u?.edited_channel_post)?.chat);add(u?.my_chat_member?.chat);const origin=u?.message?.forward_origin;if(origin?.type==='channel')add(origin?.chat);add(u?.message?.forward_from_chat);}
        const chosen=[...channels].reverse().find(x=>/edge\s*live|botemania/i.test(x.title))||(channels.length===1?channels[0]:null);
        if(chosen){const out={id:chosen.id,source:'TELEGRAM_DISCOVERY'};await this.ctx.storage.put('telegramResolvedChat',out);return out;}
      }
    }catch{}
    return null;
  }

  async sendTelegram(text){
    const token=this.env.TELEGRAM_BOT_TOKEN||'';
    if(!token)return {sent:false,reason:'TELEGRAM_TOKEN_NOT_CONFIGURED'};
    const chat=await this.resolveTelegramChat();
    if(!chat?.id)return {sent:false,reason:'TELEGRAM_CHANNEL_NOT_RESOLVED'};
    const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({chat_id:chat.id,text,disable_web_page_preview:true}),
    });
    if(!r.ok)return {sent:false,reason:`TELEGRAM_HTTP_${r.status}`,chatSource:chat.source};
    const body=await r.json();
    return {sent:body?.ok===true,messageId:body?.result?.message_id||null,chatSource:chat.source};
  }

  async fetch(request){
    const response=await super.fetch(request);
    try{
      const path=new URL(request.url).pathname;
      if(!['/','/health','/state'].includes(path))return response;
      const body=await response.clone().json();
      const tokenPresent=Boolean(this.env.TELEGRAM_BOT_TOKEN);
      const chat=tokenPresent?await this.resolveTelegramChat():null;
      body.telegramTokenConfigured=tokenPresent;
      body.telegramConfigured=Boolean(tokenPresent&&chat?.id);
      body.telegramChannelSource=chat?.source||null;
      return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}

export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
