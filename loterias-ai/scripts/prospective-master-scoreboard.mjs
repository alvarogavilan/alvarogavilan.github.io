import fs from 'node:fs';
const ROOT='loterias-ai/data/shadow',OUT=`${ROOT}/prospective-master-scoreboard.json`;
const files=fs.existsSync(ROOT)?fs.readdirSync(ROOT).filter(f=>f.endsWith('.json')):[];
const rows=[];
for(const f of files){
  let z;try{z=JSON.parse(fs.readFileSync(`${ROOT}/${f}`,'utf8'))}catch{continue}
  const text=JSON.stringify(z);
  if(!/(PROSPECTIVE|AWAITING_REQUIRED_PREVIOUS_DRAW|FROZEN|EVALUAT)/i.test(text))continue;
  const status=z.status||z.state||z.classification||'UNKNOWN';
  const target=z.targetDrawDate||z.targetDate||z.officialTarget?.targetDate||null;
  const stake=z.realStakeEUR??z.budget?.realStakeEUR??z.pleno15?.realStakeEUR??null;
  const pass=z.realMoneyPass??false;
  rows.push({file:f,status,targetDrawDate:target,engine:z.engine||z.sourceEngine||null,sealSHA256:z.sealSHA256||z.full15Hash||z.forecastHash||null,realStakeEUR:stake,realMoneyPass:pass});
}
rows.sort((a,b)=>String(a.targetDrawDate||'9999').localeCompare(String(b.targetDrawDate||'9999'))||a.file.localeCompare(b.file));
const counts={total:rows.length,pending:rows.filter(x=>/AWAIT|PENDING/i.test(x.status)).length,frozen:rows.filter(x=>/FROZEN/i.test(x.status)).length,evaluated:rows.filter(x=>/EVALUAT|SETTLED|SCORED|COMPLETE/i.test(x.status)).length,realMoneyPass:rows.filter(x=>x.realMoneyPass===true).length};
const out={generatedAt:new Date().toISOString(),engine:'Prospective-Master-Scoreboard',counts,entries:rows,policy:{maxRealStakeEURPerGameDraw:15,realMoneyPass:false,note:'Research/shadow entries may exceed 15 EUR theoretical coverage, but no real-money proposal may exceed 15 EUR aggregate per game/draw.'}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(counts));