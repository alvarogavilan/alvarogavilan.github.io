#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/universidad/libro';
const BASE=`${ROOT}/book-event-feed.json`;
const SUPPLEMENTS=[`${ROOT}/book-event-feed-live-v1.json`];
const OUT=`${ROOT}/book-event-feed-current.json`;

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base=read(BASE);
const events=[];
const seen=new Set();
const sources=[{path:BASE,version:base.version,events:base.events||[]}];
for(const p of SUPPLEMENTS){
  if(!fs.existsSync(p))continue;
  const d=read(p);sources.push({path:p,version:d.version,events:d.events||[]});
}
for(const src of sources){
  for(const e of src.events){
    if(!e?.id)throw new Error(`Missing event id in ${src.path}`);
    if(seen.has(e.id))throw new Error(`Duplicate book event id: ${e.id}`);
    seen.add(e.id);events.push({...e,_feedSource:src.path});
  }
}
const current={
  version:Number(base.version||0)+SUPPLEMENTS.filter(fs.existsSync).length,
  generatedAt:new Date().toISOString(),
  purpose:'Vista agregada determinista de la memoria científica/editorial. El historial base permanece intacto y los suplementos son append-only.',
  sourceFeeds:sources.map(s=>({path:s.path,version:s.version,eventCount:s.events.length})),
  totalEvents:events.length,
  events,
  rules:{
    ...(base.rules||{}),
    uniqueEventIdsRequired:true,
    baseHistoryNotRewrittenByAggregation:true,
    supplementsAppendOnly:true
  }
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(current,null,2)+'\n');
console.log(JSON.stringify({out:OUT,totalEvents:current.totalEvents,sources:current.sourceFeeds}));
