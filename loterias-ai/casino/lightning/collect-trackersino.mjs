import fs from 'node:fs';
import path from 'node:path';

const key = process.env.TRACKERSINO_API_KEY;
if (!key) {
  console.log(JSON.stringify({status:'SKIPPED_NO_API_KEY', realMoney:false}));
  process.exit(0);
}

const base = 'https://api.trackersino.com/v1-beta/games/lightningroulette/rounds';
const limit = Number(process.env.LIGHTNING_FETCH_LIMIT || 1000);
const url = `${base}?limit=${Math.min(Math.max(limit,1),1000)}&only_finalized=true`;
const res = await fetch(url,{headers:{Authorization:`Bearer ${key}`,'User-Agent':'LoteriasAI-Research/1.0'}});
if (!res.ok) throw new Error(`TrackerSino HTTP ${res.status}`);
const payload = await res.json();
const rows = Array.isArray(payload) ? payload : (payload.rounds || payload.data || []);
if (!Array.isArray(rows)) throw new Error('Unexpected TrackerSino response shape');

const normalized = [];
for (const r of rows) {
  const winner = Number(r.random_number ?? r?.raw?.result);
  const ts = r.finalized_at;
  const roundId = String(r.round_id ?? r.round_index ?? '');
  const luckiesRaw = Array.isArray(r?.raw?.luckies) ? r.raw.luckies : [];
  const luckies = luckiesRaw.map(x=>({number:Number(x.num), multiplier:Number(x.multi)}))
    .filter(x=>Number.isInteger(x.number)&&x.number>=0&&x.number<=36&&Number.isFinite(x.multiplier)&&x.multiplier>0);
  if (!roundId || !ts || Number.isNaN(Date.parse(ts)) || !Number.isInteger(winner) || winner<0 || winner>36) continue;
  normalized.push({
    roundId,
    timestamp:new Date(ts).toISOString(),
    winner,
    lightningNumbers:luckies,
    source:'trackersino',
    upstreamRoundIndex:r.round_index ?? null,
    upstreamMultiplier:r.multiplier ?? null
  });
}

normalized.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
const root = 'loterias-ai/casino/lightning/data/raw';
fs.mkdirSync(root,{recursive:true});
const byDay = new Map();
for (const r of normalized) {
  const day=r.timestamp.slice(0,10);
  if(!byDay.has(day)) byDay.set(day,[]);
  byDay.get(day).push(r);
}
let inserted=0, files=0;
for (const [day, incoming] of byDay) {
  const file=path.join(root,`${day}.jsonl`);
  const existing=fs.existsSync(file)
    ? fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map(x=>JSON.parse(x))
    : [];
  const map=new Map(existing.map(x=>[x.roundId,x]));
  const before=map.size;
  for(const r of incoming) map.set(r.roundId,r);
  const out=[...map.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  fs.writeFileSync(file,out.map(x=>JSON.stringify(x)).join('\n')+'\n');
  inserted += map.size-before;
  files++;
}
console.log(JSON.stringify({status:'OK',fetched:rows.length,valid:normalized.length,inserted,files,realMoney:false},null,2));
