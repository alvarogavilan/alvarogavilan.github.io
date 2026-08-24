import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs';

export const DEPLOYMENT_FINGERPRINT='edge-sentinel-v30-build-isolation-baseline-20260824a';

export class EdgeSentinel extends V29EdgeSentinel{}

function sentinel(env){return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));}
export default{async fetch(request,env){return sentinel(env).fetch(request);},async scheduled(_controller,env,ctx){ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure',{method:'POST'}));}};
