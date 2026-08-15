import fs from 'node:fs';
const shadowPath='loterias-ai/data/shadow/gordo-2026-08-16-metapleno-v14.json';
const archivePath='loterias-ai/data/archive/gordo-primitiva/2026.json';
const outPath='loterias-ai/data/shadow/gordo-2026-08-16-metapleno-v14-settlement.json';
if(!fs.existsSync(shadowPath)||!fs.existsSync(archivePath)){console.log('WAITING_FOR_FILES');process.exit(0)}
const s=JSON.parse(fs.readFileSync(shadowPath,'utf8')),a=JSON.parse(fs.readFileSync(archivePath,'utf8'));
const r=(a.records||[]).find(x=>x.drawDate===s.targetDrawDate&&Array.isArray(x.result?.main));
if(!r){console.log('WAITING_FOR_OFFICIAL_RESULT');process.exit(0)}
const hits=s.numbers.filter(n=>r.result.main.includes(n)).length,keyMatch=Number(s.key)===Number(r.result.key);
const label=hits===5?(keyMatch?'5+1':'5+0'):hits===4?(keyMatch?'4+1':'4+0'):hits===3?(keyMatch?'3+1':'3+0'):hits===2?(keyMatch?'2+1':'2+0'):(keyMatch?'reintegro':'sin premio');
const cats=r.economics?.categories||[];const norm=x=>String(x||'').replace(/\s+/g,'').toLowerCase();
let prize=0;for(const c of cats){const l=norm(c.label);if((label==='reintegro'&&l.includes('reintegro'))||l.includes(label.replace('+','\+'))||l.includes(label)){prize=Number(c.prize||0);break}}
const out={settledAt:new Date().toISOString(),status:'SETTLED_OFFICIAL',game:'gordo-primitiva',drawDate:s.targetDrawDate,sealSHA256:s.sealSHA256,prediction:{numbers:s.numbers,key:s.key},official:{numbers:r.result.main,key:r.result.key,source:r.economics?.source||r.source||null},hits,keyMatch,category:label,stakeEUR:Number(s.theoreticalCostEUR||1.5),grossReturnEUR:prize,plEUR:prize-Number(s.theoreticalCostEUR||1.5),roi:(prize-Number(s.theoreticalCostEUR||1.5))/Number(s.theoreticalCostEUR||1.5),realStakeSource:'USER_REPORTED_EXTERNAL_PURCHASE',realMoneyGateAtFreeze:false};
fs.mkdirSync('loterias-ai/data/shadow',{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));