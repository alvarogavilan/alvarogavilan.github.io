import { EdgeSentinel as V3EdgeSentinel } from './index-v3.mjs';

function tokenFromEnv(env){
  return String(
    env?.TELEGRAM_BOT_TOKEN ||
    env?.EDGE_LIVE_TELEGRAM_BOT_TOKEN ||
    env?.TELEGRAM_TOKEN ||
    ''
  );
}

function withTelegramAliases(env){
  const token=tokenFromEnv(env);
  return new Proxy(env||{}, {
    get(target,prop,receiver){
      if(prop==='TELEGRAM_BOT_TOKEN')return token;
      return Reflect.get(target,prop,receiver);
    }
  });
}

export class EdgeSentinel extends V3EdgeSentinel{
  constructor(ctx,env){
    super(ctx,withTelegramAliases(env));
    this.rawEnv=env||{};
  }

  async fetch(request){
    const response=await super.fetch(request);
    try{
      const path=new URL(request.url).pathname;
      if(!['/','/health','/state'].includes(path))return response;
      const body=await response.clone().json();
      body.telegramEnvKeys=Object.keys(this.rawEnv)
        .filter(k=>/telegram|bot.*token|edge_live.*telegram/i.test(String(k)))
        .sort();
      body.telegramTokenAliasAccepted=[
        'TELEGRAM_BOT_TOKEN',
        'EDGE_LIVE_TELEGRAM_BOT_TOKEN',
        'TELEGRAM_TOKEN'
      ];
      return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
    }catch{return response;}
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}

export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
