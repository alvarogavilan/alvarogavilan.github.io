import { EdgeSentinel as V6EdgeSentinel } from './index-v6.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v7-science-fingerprint-20260824a';

function withFingerprint(response){
  return response.clone().json().then(body=>{
    body.deploymentFingerprint=DEPLOYMENT_FINGERPRINT;
    body.deploymentCapabilities={
      scienceStatus:true,
      scienceEvents:true,
      persistentSnapshots:true,
      telegramDeliveryProof:true,
      executionContractFailClosed:true
    };
    return new Response(JSON.stringify(body,null,2),{status:response.status,headers:response.headers});
  }).catch(()=>response);
}

export class EdgeSentinel extends V6EdgeSentinel{
  async fetch(request){
    const response=await super.fetch(request);
    const path=new URL(request.url).pathname;
    if(!['/','/health','/state','/science/status','/science/events'].includes(path))return response;
    return withFingerprint(response);
  }
}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}

export default{
  async fetch(request,env){return sentinel(env).fetch(request);},
  async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));},
};
