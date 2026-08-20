#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const LAZY='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-mustdrop-extractor-v1.json';
const lazy=JSON.parse(fs.readFileSync(LAZY,'utf8'));
const metas=(lazy.chunks||[]).filter(x=>/DoubleJackpots-(MustDropWithin|settings)/i.test(String(x.name||'')));
const chunks=[];const findings=[];
for(const meta of metas){
  const r=await fetch(meta.url,{headers:{accept:'application/javascript,*/*','user-agent':'loterias-ai-mustdrop-extractor/1.0','cache-control':'no-cache'},redirect:'follow'}),text=await r.text();
  chunks.push({name:meta.name,url:meta.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex')});
  for(const needle of ['mustDropWithin','MustDropWithin','minimum','maximum','threshold','jackpot.amount','amount']){
    let p=0,c=0;while(c<12){const i=text.toLowerCase().indexOf(needle.toLowerCase(),p);if(i<0)break;const context=text.slice(Math.max(0,i-1200),Math.min(text.length,i+2600));
      const explicitPairs=[];
      for(const m of context.matchAll(/(?:min(?:imum)?|from|start)\s*[:=]\s*["']?([0-9]+(?:\.[0-9]+)?)["']?[\s\S]{0,180}?(?:max(?:imum)?|to|end|mustDropWithin)\s*[:=]\s*["']?([0-9]+(?:\.[0-9]+)?)/gi))explicitPairs.push({min:Number(m[1]),max:Number(m[2])});
      const amountPairs=[];
      for(const m of context.matchAll(/(?:amount|value)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)[\s\S]{0,180}?(?:mustDropWithin|threshold|max(?:imum)?)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/gi))amountPairs.push({amount:Number(m[1]),limit:Number(m[2])});
      const strings=[...context.matchAll(/["']([^"']*(?:must drop|drop within|mustDropWithin|jackpot)[^"']*)["']/gi)].map(m=>m[1]).slice(0,20);
      findings.push({chunk:meta.name,needle,index:i,explicitPairs,amountPairs,strings,context});p=i+needle.length;c++;
    }
  }
}
const pairs=findings.flatMap(x=>x.explicitPairs).filter(x=>Number.isFinite(x.min)&&Number.isFinite(x.max)&&x.max>x.min);
const amountPairs=findings.flatMap(x=>x.amountPairs).filter(x=>Number.isFinite(x.amount)&&Number.isFinite(x.limit)&&x.limit>x.amount);
const out={version:'botemania-double-jackpots-mustdrop-extractor-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',chunks,summary:{findings:findings.length,explicitLimitPairs:[...new Map(pairs.map(x=>[`${x.min}:${x.max}`,x])).values()],amountLimitPairs:[...new Map(amountPairs.map(x=>[`${x.amount}:${x.limit}`,x])).values()]},findings,decision:{exactMustDropLimitsRecovered:pairs.length>0||amountPairs.length>0,requiresLiveJackpotRows:true,realMoneyAllowed:false},guards:{publicStaticBundlesOnly:true,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,decision:out.decision},null,2));
