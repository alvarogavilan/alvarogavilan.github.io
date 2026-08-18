#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const ROOT='loterias-ai/data/research',OUT=`${ROOT}/cross-family-event-clustering-v1.json`;
const files=fs.readdirSync(ROOT).filter(f=>/^metapleno-v(32[1-6])-stage1.*\.json$/i.test(f)).sort();
const rows=[];
function walk(node,ctx,file,seen){
  if(Array.isArray(node)){for(const x of node)walk(x,ctx,file,seen);return;}
  if(!node||typeof node!=='object')return;
  const next={...ctx};if(node.game)next.game=node.game;if(node.behaviorHash)next.behaviorHash=node.behaviorHash;
  const version=file.match(/metapleno-v(\d+)/i)?.[1]||'unknown';
  const events=Array.isArray(node.eventDetails)?node.eventDetails:Array.isArray(node.events)?node.events:null;
  if(events&&next.behaviorHash){for(const e of events){const date=String(e?.date||'').slice(0,10),hits=Number(e?.hits);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!(hits>=5))continue;const key=`${version}|${next.game||'unknown'}|${next.behaviorHash}|${date}`;if(seen.has(key))continue;seen.add(key);rows.push({version:`v${version}`,game:next.game||'unknown',behaviorHash:next.behaviorHash,date,hits});}}
  for(const [k,v] of Object.entries(node))if(k!=='eventDetails'&&k!=='events')walk(v,next,file,seen);
}
for(const file of files){const doc=JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8')),seen=new Set();walk(doc,{},file,seen);}
const byDate=new Map();for(const r of rows){if(!byDate.has(r.date))byDate.set(r.date,{date:r.date,behaviorEvents:0,families:new Set(),games:new Set(),fullSixBehaviors:0,examples:[]});const d=byDate.get(r.date);d.behaviorEvents++;d.families.add(r.version);d.games.add(r.game);if(r.hits===6)d.fullSixBehaviors++;if(d.examples.length<8)d.examples.push({version:r.version,game:r.game,hits:r.hits,behaviorHash:r.behaviorHash});}
const dates=[...byDate.values()].map(d=>({date:d.date,behaviorEvents:d.behaviorEvents,familyCount:d.families.size,families:[...d.families].sort(),games:[...d.games].sort(),fullSixBehaviors:d.fullSixBehaviors,examples:d.examples})).sort((a,b)=>b.familyCount-a.familyCount||b.behaviorEvents-a.behaviorEvents||a.date.localeCompare(b.date));
const totalBehaviorEvents=rows.length,top=dates[0]||null,shared=dates.filter(d=>d.familyCount>=2),high=dates.filter(d=>d.familyCount>=3),topShare=top&&totalBehaviorEvents?top.behaviorEvents/totalBehaviorEvents:0;
const out={generatedAt:new Date().toISOString(),version:'cross-family-event-clustering-v1',scope:{versions:['v321','v322','v323','v324','v325','v326'],developmentOnly:true,sourceFiles:files},counts:{uniqueBehaviorDateEvents:totalBehaviorEvents,distinctEventDates:dates.length,datesSharedByAtLeast2Families:shared.length,datesSharedByAtLeast3Families:high.length},topDate:top,topDateBehaviorEventShare:topShare,dates,interpretation:high.length?'SHARED_DRAW_EASINESS_OR_COMMON_SIGNAL_COMPONENT_REQUIRES_DEPENDENCE_PENALTY':'NO_STRONG_CROSS_FAMILY_DATE_CLUSTER_DETECTED',policy:{notPredictiveEvidence:true,doesNotOpenValidationOrOOS:true,doNotCountSameDateAcrossFamiliesAsIndependentReplication:true,realMoneyPass:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({counts:out.counts,topDate:out.topDate,topDateBehaviorEventShare:out.topDateBehaviorEventShare,interpretation:out.interpretation},null,2));
