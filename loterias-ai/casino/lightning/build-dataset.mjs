import fs from 'node:fs';
import path from 'node:path';

const root='loterias-ai/casino/lightning/data/raw';
const out='loterias-ai/casino/lightning/data/rounds.jsonl';
fs.mkdirSync(path.dirname(out),{recursive:true});
if(!fs.existsSync(root)) {
  console.log(JSON.stringify({status:'NO_RAW_DATA',rows:0}));
  process.exit(0);
}
const files=fs.readdirSync(root).filter(x=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(x)).sort();
const map=new Map();
for(const file of files){
  const lines=fs.readFileSync(path.join(root,file),'utf8').split('\n').filter(Boolean);
  for(const line of lines){
    const r=JSON.parse(line);
    if(!r.roundId || !r.timestamp || !Number.isInteger(r.winner)) continue;
    map.set(r.roundId,r);
  }
}
const rows=[...map.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
if(rows.length){fs.writeFileSync(out,rows.map(x=>JSON.stringify(x)).join('\n')+'\n');}
console.log(JSON.stringify({status:rows.length?'OK':'EMPTY',files:files.length,rows:rows.length,first:rows[0]?.timestamp??null,last:rows.at(-1)?.timestamp??null},null,2));
