#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/winfall-shared-network-triangulation-v1.json';
const UA='loterias-ai-winfall-shared-network-triangulation/1.0';
const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki'];
const CONTROLS=['paper-wins-jackpot','bote-de-secretos-del-fenix'];
const ALL=[...TARGETS,...CONTROLS];
const AMBIGUOUS_IDS=new Set(['JACKPOT','JackpotPool','WAGER_BET','progressive_id1','GRAND','GOLD','pool1']);
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

async function request(url,opts={}){try{const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});const text=await r.text();return{status:r.status,text,sha256:sha(text),error:null};}catch(e){return{status:null,text:'',sha256:null,error:String(e?.name||e?.message||e)};}}
async function feed(){const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer:`${ORIGIN}/`,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:'query loadJackpots { jackpots { id amount } }'})});let x=null;try{x=JSON.parse(r.text)}catch{}const rows=(x?.data?.jackpots||[]).map(z=>({id:String(z?.id??'').trim(),amountEUR:finite(z?.amount)})).filter(z=>z.id&&z.amountEUR!==null);return{observedAt:new Date().toISOString(),httpStatus:r.status,rows};}
function byUniqueId(rows){const m=new Map();for(const r of rows){if(!m.has(r.id))m.set(r.id,new Set());m.get(r.id).add(r.amountEUR);}return new Map([...m].filter(([,s])=>s.size===1).map(([id,s])=>[id,[...s][0]]));}
function visibleText(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function parseEuro(raw){let s=String(raw||'').replace(/\s/g,'').replace(/€/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');}else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null;}
function money(text){const re=/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))(?:\s*€)/g,out=[];let m;while((m=re.exec(text))&&out.length<500){const n=parseEuro(m[0]);if(n!==null)out.push({amountEUR:n,raw:m[0],index:m.index,context:text.slice(Math.max(0,m.index-150),Math.min(text.length,m.index+m[0].length+240))});}return out;}
function findChrome(){for(const c of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean))try{if(fs.existsSync(c))return c;}catch{}for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const w=spawnSync('which',[cmd],{encoding:'utf8'});if(w.status===0&&w.stdout.trim())return w.stdout.trim();}return null;}
function inInterval(v,a,b,eps=.03){return v>=Math.min(a,b)-eps&&v<=Math.max(a,b)+eps;}

export function classifyTriangulation(rows,{targets=TARGETS,controls=CONTROLS}={}){
  const candidateIds=[...new Set(rows.flatMap(r=>r.dynamicSpecificMatches.map(x=>x.id)))];
  const candidates=[];
  for(const id of candidateIds){const targetPages=targets.filter(s=>rows.find(r=>r.slug===s)?.dynamicSpecificMatches.some(x=>x.id===id));const controlPages=controls.filter(s=>rows.find(r=>r.slug===s)?.dynamicSpecificMatches.some(x=>x.id===id));if(targetPages.length===targets.length&&controlPages.length===0)candidates.push({id,targetPages,controlPages});}
  return candidates;
}

const chrome=findChrome();const browser={available:Boolean(chrome),binary:chrome,version:null};if(chrome){const v=spawnSync(chrome,['--version'],{encoding:'utf8',timeout:5000});browser.version=(v.stdout||v.stderr||'').trim()||null;}
const pages=[];
for(const slug of ALL){
  const url=`${ORIGIN}/juegos/slots-online/${slug}`;
  const staticPage=await request(url,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const before=await feed();
  let render={success:false,status:null,dom:'',durationMs:null,stderr:null};
  if(chrome){const profile=fs.mkdtempSync(path.join(os.tmpdir(),`edge-winfall-${slug.slice(0,14)}-`));const t0=Date.now();const p=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--incognito','--no-first-run','--no-default-browser-check','--disable-sync','--disable-component-update','--window-size=1280,1800','--virtual-time-budget=10000',`--user-data-dir=${profile}`,'--dump-dom',url],{encoding:'utf8',timeout:24000,maxBuffer:18*1024*1024});render={success:p.status===0&&Boolean((p.stdout||'').trim()),status:p.status,dom:String(p.stdout||''),durationMs:Date.now()-t0,stderr:String(p.stderr||'').slice(0,1500)};try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}
  const after=await feed();
  const staticText=visibleText(staticPage.text),renderText=visibleText(render.dom),staticMoney=money(staticText),renderMoney=money(renderText);
  const b=byUniqueId(before.rows),a=byUniqueId(after.rows);
  const commonIds=[...b.keys()].filter(id=>a.has(id));
  const clientOnlyMoney=renderMoney.filter(r=>!staticMoney.some(s=>Math.abs(s.amountEUR-r.amountEUR)<.005));
  const clientOnlyLiterals=commonIds.filter(id=>render.dom.includes(id)&&!staticPage.text.includes(id));
  const matches=[];
  for(const id of commonIds){if(AMBIGUOUS_IDS.has(id))continue;const beforeEUR=b.get(id),afterEUR=a.get(id);const amountMentions=clientOnlyMoney.filter(x=>inInterval(x.amountEUR,beforeEUR,afterEUR));const literal=clientOnlyLiterals.includes(id);if(literal||amountMentions.length)matches.push({id,beforeEUR,afterEUR,clientOnlyLiteral:literal,clientOnlyAmountMentions:amountMentions.slice(0,8)});}
  pages.push({slug,role:TARGETS.includes(slug)?'TARGET':'CONTROL',url,static:{httpStatus:staticPage.status,sha256:staticPage.sha256,bytes:staticPage.text.length},feed:{before:{observedAt:before.observedAt,httpStatus:before.httpStatus},after:{observedAt:after.observedAt,httpStatus:after.httpStatus}},rendered:{success:render.success,status:render.status,durationMs:render.durationMs,domSha256:render.success?sha(render.dom):null,domBytes:render.dom.length,clientOnlyMoneyCount:clientOnlyMoney.length},dynamicSpecificMatches:matches});
}
const successful=pages.filter(p=>p.rendered.success).length;
const complete=Boolean(chrome)&&successful===ALL.length;
const discoveryCandidates=classifyTriangulation(pages);
const out={version:'winfall-shared-network-triangulation-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',hypothesis:{target:'Winfall Wishes Jackpot',officiallySharedWith:['Wonderland','La Isla de Tiki Templo'],operatorRuleEvidence:'all shared pots reset together to 0 EUR after an award'},browser,coverage:{expectedPages:ALL.length,successfulRenders:successful,complete},pages,comparison:{discoveryCandidates},decision:{exactLiveIdVerified:false,sharedNetworkIdDiscoveryCandidate:discoveryCandidates.length===1?discoveryCandidates[0].id:null,candidateCount:discoveryCandidates.length,nextStep:discoveryCandidates.length===1?'FREEZE_CANDIDATE_AND_REPLICATE_IN_SECOND_INDEPENDENT_RUN_BEFORE_IDENTITY_PROMOTION':complete?'NO_TARGET_ONLY_DYNAMIC_SPECIFIC_ID_IN_RENDERED_DOM; MOVE_TO_PASSIVE_NETWORK_RESPONSE_TRIANGULATION':'INCOMPLETE_RENDER_COVERAGE_RETRY_WITHOUT_NEGATIVE',economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicPagesOnly:true,ephemeralIncognitoProfiles:true,noLogin:true,noClick:true,noGameLaunch:true,noBetting:true,ambiguousGenericIdsExcluded:true,onlyUniqueFeedIdsEligible:true,staticPageMoneyNotEvidence:true,clientOnlyEvidenceRequired:true,allThreeOfficiallyLinkedPagesRequired:true,twoUnrelatedControlsRequired:true,singleRunNeverVerifiesIdentity:true,incompleteCoverageNeverNegative:true,amountMatchDiscoveryOnly:true,realMoneyAllowed:false}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({browser,coverage:out.coverage,comparison:out.comparison,decision:out.decision,pages:pages.map(p=>({slug:p.slug,role:p.role,rendered:p.rendered,dynamicSpecificMatches:p.dynamicSpecificMatches}))},null,2));
