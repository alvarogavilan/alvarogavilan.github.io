import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='loterias-ai/casino/lightning/data/raw';
const out='loterias-ai/casino/lightning/data/rounds.jsonl';
const manifest='loterias-ai/casino/lightning/data/manifest.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
if(!fs.existsSync(root)) {
  console.log(JSON.stringify({status:'NO_RAW_DATA',rows:0,realMoney:false}));
  process.exit(0);
}
const files=fs.readdirSync(root).filter(x=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(x)).sort();
const map=new Map();
for(const file of files){
  const lines=fs.readFileSync(path.join(root,file),'utf8').split(/\r?\n/).filter(Boolean);
  for(const line of lines){
    const r=JSON.parse(line);
    if(!r.roundId || !r.ts || Number.isNaN(Date.parse(r.ts)) || !Number.isInteger(r.winner) || r.winner<0 || r.winner>36 || !Array.isArray(r.lightning)) throw new Error(`Invalid Lightning raw row in ${file}`);
    map.set(String(r.roundId),r);
  }
}
const rows=[...map.values()].sort((a,b)=>Date.parse(a.ts)-Date.parse(b.ts)||String(a.roundId).localeCompare(String(b.roundId)));
if(!rows.length){
  console.log(JSON.stringify({status:'EMPTY',files:files.length,rows:0,realMoney:false}));
  process.exit(0);
}
const body=rows.map(x=>JSON.stringify(x)).join('\n')+'\n';
fs.writeFileSync(out,body);
const meta={generatedAt:new Date().toISOString(),files:files.length,rows:rows.length,first:rows[0].ts,last:rows.at(-1).ts,sha256:crypto.createHash('sha256').update(body).digest('hex'),sourceSet:[...new Set(rows.map(x=>x.source))].sort(),realMoney:false};
fs.writeFileSync(manifest,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify({status:'OK',...meta},null,2));
