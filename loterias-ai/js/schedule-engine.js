/* Loterías AI — Draw Schedule Engine */
(function(root){'use strict';
const DAY=['dom','lun','mar','mié','jue','vie','sáb'];
function pad(n){return String(n).padStart(2,'0')}
function localParts(d){return {y:d.getFullYear(),m:d.getMonth()+1,day:d.getDate(),dow:d.getDay(),hh:d.getHours(),mm:d.getMinutes()}}
function mkDate(base,dayOffset,time){const d=new Date(base);d.setHours(0,0,0,0);d.setDate(d.getDate()+dayOffset);const [h,m]=time.split(':').map(Number);d.setHours(h,m,0,0);return d}
function nextFixed(g,now){for(let i=0;i<8;i++){const d=mkDate(now,i,g.time);if(g.days.includes(d.getDay())&&d>now)return d}return null}
function nextMulti(g,now){let best=null;for(const s of g.slots){for(let i=0;i<8;i++){const d=mkDate(now,i,s.time);if(d.getDay()===s.day&&d>now&&(!best||d<best))best=d}}return best}
function nextAnnual(g,now){let y=now.getFullYear();let d=new Date(y,g.month-1,g.dayOfMonth,...g.time.split(':').map(Number),0,0);if(d<=now)d=new Date(y+1,g.month-1,g.dayOfMonth,...g.time.split(':').map(Number),0,0);return d}
function nextDraw(g,now=new Date()){if(g.mode==='FIXED_WEEKLY')return nextFixed(g,now);if(g.mode==='FIXED_WEEKLY_MULTI_TIME')return nextMulti(g,now);if(g.mode==='ANNUAL_SPECIAL')return nextAnnual(g,now);return null}
function isToday(g,now=new Date()){const n=nextDraw(g,new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,0));return !!n&&n.toDateString()===now.toDateString()}
function label(d){if(!d)return 'Horario variable';return `${DAY[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth()+1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function status(g,now=new Date()){const n=nextDraw(g,now);return {gameId:g.gameId,name:g.name,today:isToday(g,now),next:n,nextLabel:label(n),mode:g.mode,note:g.note||null}}
root.LotterySchedule={nextDraw,isToday,label,status};
})(typeof window!=='undefined'?window:globalThis);