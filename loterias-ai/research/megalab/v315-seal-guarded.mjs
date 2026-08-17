#!/usr/bin/env node

function madridParts(now=new Date()){
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=t=>p.find(x=>x.type===t)?.value;
  return {date:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour')),minute:Number(get('minute'))};
}
function addDays(date,n){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dow(date){return new Date(`${date}T12:00:00Z`).getUTCDay()}
function nextScheduled(from){let d=from;for(let i=0;i<8;i++){if([1,4,6].includes(dow(d)))return d;d=addDays(d,1)}throw new Error('Could not resolve next scheduled Primitiva date');}

const now=madridParts();
const cutoffMinutes=20*60;
const nowMinutes=now.hour*60+now.minute;
const explicit=(process.env.TARGET_DRAW_DATE||'').trim();

if(explicit){
  if(explicit===now.date&&nowMinutes>=cutoffMinutes)throw new Error(`PRE_DRAW_CUTOFF_EXCEEDED: refusing to seal ${explicit} at ${String(now.hour).padStart(2,'0')}:${String(now.minute).padStart(2,'0')} Europe/Madrid`);
}else if([1,4,6].includes(dow(now.date))&&nowMinutes>=cutoffMinutes){
  process.env.TARGET_DRAW_DATE=nextScheduled(addDays(now.date,1));
  console.log(JSON.stringify({guard:'CURRENT_DRAW_SKIPPED_AFTER_20_00_MADRID',nextTarget:process.env.TARGET_DRAW_DATE}));
}

await import('./v315-seal-next-prospective.mjs');
