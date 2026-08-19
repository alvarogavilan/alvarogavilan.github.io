import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai/data/archive';
const OUT='loterias-ai/data/research/national-minimum-stake-walkforward-v1.json';
const GAMES=[
  {id:'bonoloto',dir:'bonoloto',family:'numeric',main:{field:'main',max:49,pick:6},extra:{field:'reintegro',max:10,pick:1,zero:true}},
  {id:'primitiva',dir:'primitiva',family:'numeric',main:{field:'main',max:49,pick:6},extra:{field:'reintegro',max:10,pick:1,zero:true}},
  {id:'euromillones',dir:'euromillones',family:'numeric',main:{field:'main',max:50,pick:5},extra:{field:'stars',max:12,pick:2}},
  {id:'gordo',dir:'gordo-primitiva',family:'numeric',main:{field:'main',max:54,pick:5},extra:{field:'key',max:10,pick:1,zero:true}},
  {id:'eurodreams',dir:'eurodreams',family:'numeric',main:{field:'main',max:40,pick:6},extra:{field:'dream',max:5,pick:1}},
  {id:'loteria-nacional',dir:'loteria-nacional',family:'number5'},
  {id:'quiniela',dir:'quiniela',family:'football'},
  {id:'elige8',dir:'elige8',family:'football8'},
  {id:'quinigol',dir:'quinigol',family:'football-score'},
  {id:'lototurf',dir:'lototurf',family:'lototurf'},
  {id:'quintuple-plus',dir:'quintuple-plus',family:'quintuple'}
];

function loadRows(dir){
  const p=path.join(ROOT,dir);
  if(!fs.existsSync(p)) return [];
  const rows=[];
  for(const f of fs.readdirSync(p).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    try{
      const z=JSON.parse(fs.readFileSync(path.join(p,f),'utf8'));
      for(const r of z.records||[]) rows.push(r);
    }catch{}
  }
  const seen=new Set();
  return rows.filter(r=>{
    const k=r.drawId||`${r.drawDate}|${JSON.stringify(r.result||{})}`;
    if(!r.drawDate||seen.has(k)) return false;
    seen.add(k); return true;
  }).sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
}

const hashInt=s=>parseInt(crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,8),16)>>>0;
function shuffled(domain,seed){
  const a=[...domain]; let x=hashInt(seed)||1;
  const rnd=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
const catPrize=(r,cat)=>Number((r.economics?.categories||[]).find(x=>Number(x.category)===Number(cat))?.prize||0);
const getCost=r=>Number(r.economics?.ticketCost||0);

const MODES=['hot','cold','overdue','hybrid'];
const WINDOWS=[10,25,50,100,200];
const CANDIDATES=[]; for(const mode of MODES)for(const w of WINDOWS)CANDIDATES.push({mode,window:w});

function scalarValues(rows,i,field){
  const v=rows[i]?.result?.[field];
  if(Array.isArray(v)) return v;
  return v==null?[]:[v];
}
function rankDomain(rows,i,field,max,pick,c,zero=false){
  const domain=Array.from({length:max},(_,k)=>k+(zero?0:1));
  const start=Math.max(0,i-c.window), hist=rows.slice(start,i);
  const counts=new Map(domain.map(n=>[n,0])), last=new Map(domain.map(n=>[n,-1]));
  for(let j=0;j<hist.length;j++) for(const n of scalarValues(hist,j,field)){if(counts.has(n)){counts.set(n,counts.get(n)+1);last.set(n,j)}}
  const den=Math.max(1,hist.length);
  const scored=domain.map(n=>{
    const f=counts.get(n)/den;
    const gap=last.get(n)<0?1:Math.min(1,(hist.length-1-last.get(n))/Math.max(1,c.window));
    const lastHit=scalarValues(rows,i-1,field).includes(n)?1:0;
    let s=0;
    if(c.mode==='hot') s=f;
    else if(c.mode==='cold') s=-f;
    else if(c.mode==='overdue') s=gap;
    else s=f+0.25*gap-0.15*lastHit;
    return [s,n];
  });
  scored.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
  return scored.slice(0,pick).map(x=>x[1]).sort((a,b)=>a-b);
}

function numericPrediction(g,rows,i,c){
  const main=rankDomain(rows,i,g.main.field,g.main.max,g.main.pick,c,false);
  let extra=[];
  if(g.extra) extra=rankDomain(rows,i,g.extra.field,g.extra.max,g.extra.pick,c,Boolean(g.extra.zero));
  return {main,extra};
}
function numericControl(g,r){
  const mainDom=Array.from({length:g.main.max},(_,k)=>k+1);
  const main=shuffled(mainDom,`${g.id}|${r.drawDate}|main`).slice(0,g.main.pick).sort((a,b)=>a-b);
  let extra=[];
  if(g.extra){
    const dom=Array.from({length:g.extra.max},(_,k)=>k+(g.extra.zero?0:1));
    extra=shuffled(dom,`${g.id}|${r.drawDate}|extra`).slice(0,g.extra.pick).sort((a,b)=>a-b);
  }
  return {main,extra};
}
function numericHits(g,r,p){
  const truth=r.result?.[g.main.field]||[];
  const mainHits=p.main.filter(n=>truth.includes(n)).length;
  let extraHits=0;
  if(g.extra){
    const tv=scalarValues([r],0,g.extra.field);
    extraHits=p.extra.filter(n=>tv.includes(n)).length;
  }
  return {mainHits,extraHits};
}
function numericReturn(g,r,p){
  const h=numericHits(g,r,p); let ret=0, top=false;
  if(g.id==='bonoloto'){
    const comp=r.result?.complementary;
    const hasC=comp!=null&&p.main.includes(comp);
    if(h.mainHits===6){ret+=catPrize(r,1);top=true}
    else if(h.mainHits===5&&hasC)ret+=catPrize(r,2);
    else if(h.mainHits===5)ret+=catPrize(r,3);
    else if(h.mainHits===4)ret+=catPrize(r,4);
    else if(h.mainHits===3)ret+=catPrize(r,5);
    if(h.extraHits===1) ret+=catPrize(r,6);
  }else if(g.id==='primitiva'){
    const comp=r.result?.complementary,hasC=comp!=null&&p.main.includes(comp),rr=h.extraHits===1;
    if(h.mainHits===6&&rr){ret+=catPrize(r,1);top=true}
    else if(h.mainHits===6){ret+=catPrize(r,2);top=true}
    else if(h.mainHits===5&&hasC)ret+=catPrize(r,3);
    else if(h.mainHits===5)ret+=catPrize(r,4);
    else if(h.mainHits===4)ret+=catPrize(r,5);
    else if(h.mainHits===3)ret+=catPrize(r,6);
    if(rr){
      const rc=(r.economics?.categories||[]).find(x=>/reintegro/i.test(x.label||''));
      if(rc)ret+=Number(rc.prize||0);
    }
  }else if(g.id==='euromillones'){
    const compact=x=>String(x||'').replace(/\s/g,'');
    const target=`${h.mainHits}+${h.extraHits}`;
    const c=(r.economics?.categories||[]).find(x=>compact(x.label).includes(target));
    if(c)ret+=Number(c.prize||0);
    top=h.mainHits===5&&h.extraHits===2;
  }else if(g.id==='gordo'){
    const key=`${h.mainHits}+${h.extraHits}`;
    ret+=Number(r.economics?.payouts?.[key]||0);
    if(!ret&&h.extraHits===1) ret+=Number(r.economics?.payouts?.reintegro||0);
    top=h.mainHits===5&&h.extraHits===1;
  }else if(g.id==='eurodreams'){
    const cats=r.economics?.categories||[];
    let re=null;
    if(h.mainHits===6&&h.extraHits===1)re=/6\+1/;
    else if(h.mainHits===6)re=/6\+0/;
    else if(h.mainHits>=2&&h.mainHits<=5)re=new RegExp(`${h.mainHits}.*0\/1`);
    const c=re&&cats.find(x=>re.test(String(x.label||'').replace(/\s/g,'')));
    if(c)ret+=Number(c.prize||0);
    top=h.mainHits===6&&h.extraHits===1;
  }
  if(top&&ret===0&&Number(r.economics?.jackpot)>0) ret=Number(r.economics.jackpot);
  return {...h,ret,top};
}

function fiveDigitPred(rows,i,window,mode){
  const hist=rows.slice(Math.max(0,i-window),i);
  let s='';
  for(let pos=0;pos<5;pos++){
    const cnt=Array(10).fill(0);
    for(const r of hist){const n=String(r.result?.firstPrize||'').padStart(5,'0'); if(/^\d{5}$/.test(n))cnt[Number(n[pos])]++}
    let order=Array.from({length:10},(_,d)=>d);
    order.sort((a,b)=>{
      if(mode==='cold')return cnt[a]-cnt[b]||a-b;
      if(mode==='overdue'){
        const ga=gapDigit(hist,pos,a),gb=gapDigit(hist,pos,b);return gb-ga||a-b;
      }
      return cnt[b]-cnt[a]||a-b;
    });
    s+=order[0];
  }
  return s;
}
function gapDigit(hist,pos,d){for(let j=hist.length-1;j>=0;j--){const n=String(hist[j].result?.firstPrize||'').padStart(5,'0');if(Number(n[pos])===d)return hist.length-1-j}return hist.length}
function fiveDigitReturn(r,n){
  let ret=0,top=false;
  if(n===String(r.result?.firstPrize||'').padStart(5,'0')){ret+=Number((r.economics?.categories||[]).find(x=>/Primer Premio/i.test(x.label||''))?.prize||0);top=true}
  else if(n===String(r.result?.secondPrize||'').padStart(5,'0'))ret+=Number((r.economics?.categories||[]).find(x=>/Segundo Premio/i.test(x.label||''))?.prize||0);
  const last=Number(n.at(-1)); if((r.result?.reintegro||[]).includes(last))ret+=Number((r.economics?.categories||[]).find(x=>/Reintegro/i.test(x.label||''))?.prize||0);
  return {mainHits:top?1:0,extraHits:0,ret,top};
}

const SIGNS=['1','X','2'];
function footballModelState(rows,end){
  const team=new Map();const global={h:[1,1,1],a:[1,1,1],scoreHome:[1,1,1,1],scoreAway:[1,1,1,1]};
  const gs=x=>x>=3?3:Math.max(0,x);
  for(let i=0;i<end;i++){
    for(const m of rows[i].result?.matches||[]){
      const si=SIGNS.indexOf(m.sign); if(si<0)continue;
      if(!team.has(m.home))team.set(m.home,{home:[1,1,1],away:[1,1,1],hg:[1,1,1,1],ag:[1,1,1,1]});
      if(!team.has(m.away))team.set(m.away,{home:[1,1,1],away:[1,1,1],hg:[1,1,1,1],ag:[1,1,1,1]});
      team.get(m.home).home[si]++;team.get(m.away).away[si]++;global.h[si]++;global.a[si]++;
      const [hg,ag]=String(m.score||'0-0').split('-').map(Number);
      if(Number.isFinite(hg)&&Number.isFinite(ag)){team.get(m.home).hg[gs(hg)]++;team.get(m.away).ag[gs(ag)]++;global.scoreHome[gs(hg)]++;global.scoreAway[gs(ag)]++}
    }
  }
  return {team,global};
}
const norm=a=>{const s=a.reduce((x,y)=>x+y,0);return a.map(x=>x/s)};
function signPrediction(st,m){
  const h=st.team.get(m.home)?.home||st.global.h,a=st.team.get(m.away)?.away||st.global.a;
  const ph=norm(h),pa=norm(a);const p=ph.map((x,j)=>(x+pa[j])/2);let k=0;for(let j=1;j<3;j++)if(p[j]>p[k])k=j;return {sign:SIGNS[k],conf:p[k]};
}
function bucketGoals(x){return x>=3?'M':String(Math.max(0,x))}
function plenoPrediction(st,m){
  const h=st.team.get(m.home)?.hg||st.global.scoreHome,a=st.team.get(m.away)?.ag||st.global.scoreAway;
  let ih=0,ia=0;for(let j=1;j<4;j++){if(h[j]>h[ih])ih=j;if(a[j]>a[ia])ia=j}
  return `${bucketGoals(ih)}-${bucketGoals(ia)}`;
}
function quinielaPrediction(rows,i){
  const st=footballModelState(rows,i),ms=rows[i].result?.matches||[];
  const signs=ms.slice(0,14).map(m=>signPrediction(st,m).sign);
  const pleno=ms[14]?plenoPrediction(st,ms[14]):null;
  return {signs,pleno};
}
function quinielaControl(r){
  const signs=(r.result?.matches||[]).slice(0,14).map((_,j)=>shuffled(SIGNS,`quiniela|${r.drawDate}|${j}`)[0]);
  const codes=['0','1','2','M'];return {signs,pleno:`${shuffled(codes,`qh|${r.drawDate}`)[0]}-${shuffled(codes,`qa|${r.drawDate}`)[0]}`};
}
function quinielaReturn(r,p){
  const truth=(r.result?.outcomes||[]).slice(0,14),hits=p.signs.filter((x,j)=>x===truth[j]).length;
  const pleno=String(r.result?.outcomes?.[14]||'')===p.pleno;let cat=null;
  if(hits===14&&pleno)cat=1;else if(hits===14)cat=2;else if(hits===13)cat=3;else if(hits===12)cat=4;else if(hits===11)cat=5;else if(hits===10)cat=6;
  let ret=cat?catPrize(r,cat):0;if(cat===1&&ret===0&&Number(r.economics?.jackpot)>0)ret=Number(r.economics.jackpot);
  return {mainHits:hits,extraHits:pleno?1:0,ret,top:hits===14&&pleno};
}
function eligePrediction(quinRows,elRow){
  const date=elRow.drawDate;
  const prior=quinRows.filter(r=>r.drawDate<date);
  const st=footballModelState(prior,prior.length),ms=elRow.result?.selectableMatches||[];
  const scored=ms.map((m,j)=>({...signPrediction(st,m),j})).sort((a,b)=>b.conf-a.conf||a.j-b.j).slice(0,8);
  return {picks:scored.map(x=>({position:x.j+1,sign:x.sign}))};
}
function eligeControl(r){
  const ms=r.result?.selectableMatches||[],idx=shuffled(ms.map((_,j)=>j),`elige|${r.drawDate}`).slice(0,8);
  return {picks:idx.map(j=>({position:j+1,sign:shuffled(SIGNS,`elige|${r.drawDate}|${j}`)[0]}))};
}
function eligeReturn(r,p){
  const truth=r.result?.selectableMatches||[];const hits=p.picks.filter(x=>truth[x.position-1]?.sign===x.sign).length;
  const ret=hits===8?catPrize(r,1):0;return {mainHits:hits,extraHits:0,ret,top:hits===8};
}

const SCORE_CODES=['0-0','0-1','0-2','0-M','1-0','1-1','1-2','1-M','2-0','2-1','2-2','2-M','M-0','M-1','M-2','M-M'];
function qgPrediction(rows,i){
  const hist=rows.slice(0,i),counts=new Map(SCORE_CODES.map(x=>[x,1]));
  for(const r of hist)for(const c of r.result?.codes||[])counts.set(c,(counts.get(c)||1)+1);
  const mode=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];
  return {codes:(rows[i].result?.codes||[]).map(()=>mode)};
}
function qgControl(r){return {codes:(r.result?.codes||[]).map((_,j)=>shuffled(SCORE_CODES,`qg|${r.drawDate}|${j}`)[0])}}
function qgReturn(r,p){const t=r.result?.codes||[],h=p.codes.filter((x,j)=>x===t[j]).length;let ret=0;if(h>=2)ret=catPrize(r,7-h);if(h===6&&ret===0&&Number(r.economics?.jackpot)>0)ret=Number(r.economics.jackpot);return{mainHits:h,extraHits:0,ret,top:h===6}}

function lototurfPrediction(rows,i,c){
  const main=rankDomain(rows,i,'main',31,6,c,false),horse=rankDomain(rows,i,'horse',20,1,c,false)[0],rein=rankDomain(rows,i,'reintegro',10,1,c,true)[0];
  return {main,horse,rein};
}
function lototurfControl(r){return {main:shuffled(Array.from({length:31},(_,k)=>k+1),`lt|${r.drawDate}`).slice(0,6).sort((a,b)=>a-b),horse:shuffled(Array.from({length:20},(_,k)=>k+1),`lth|${r.drawDate}`)[0],rein:shuffled(Array.from({length:10},(_,k)=>k),`ltr|${r.drawDate}`)[0]}}
function lototurfReturn(r,p){const h=p.main.filter(n=>(r.result?.main||[]).includes(n)).length,horse=p.horse===r.result?.horse,rein=p.rein===r.result?.reintegro;let cat=null;if(h===6&&horse)cat=1;else if(h===6)cat=2;else if(h===5&&horse)cat=3;else if(h===5)cat=4;else if(h===4&&horse)cat=5;else if(h===4)cat=6;else if(h===3&&horse)cat=7;let ret=cat?catPrize(r,cat):0;if(rein){const c=(r.economics?.categories||[]).find(x=>/Reintegro/i.test(x.label||''));ret+=Number(c?.prize||0)}if(cat===1&&ret===0&&Number(r.economics?.jackpot)>0)ret=Number(r.economics.jackpot);return{mainHits:h,extraHits:horse?1:0,ret,top:h===6&&horse}}

function quintPred(rows,i,c){
  const hist=rows.slice(Math.max(0,i-c.window),i),res=[];
  for(let pos=0;pos<5;pos++){const cnt=new Map();for(const r of hist){const n=r.result?.winners?.[pos];if(Number.isFinite(n))cnt.set(n,(cnt.get(n)||0)+1)}const keys=[...cnt.keys()];if(!keys.length){res.push(1);continue}keys.sort((a,b)=>c.mode==='cold'?(cnt.get(a)-cnt.get(b)||a-b):(cnt.get(b)-cnt.get(a)||a-b));res.push(keys[0])}
  const cnt2=new Map();for(const r of hist){const n=r.result?.secondFifth;if(Number.isFinite(n))cnt2.set(n,(cnt2.get(n)||0)+1)}const k2=[...cnt2.keys()].sort((a,b)=>(cnt2.get(b)||0)-(cnt2.get(a)||0)||a-b)[0]||1;
  return {winners:res,second:k2};
}
function quintControl(r){return {winners:(r.result?.winners||[]).map((_,j)=>shuffled(Array.from({length:20},(_,k)=>k+1),`qp|${r.drawDate}|${j}`)[0]),second:shuffled(Array.from({length:20},(_,k)=>k+1),`qps|${r.drawDate}`)[0]}}
function quintReturn(r,p){const t=r.result?.winners||[],h=p.winners.filter((x,j)=>x===t[j]).length,s=p.second===r.result?.secondFifth;let cat=null;if(h===5&&s)cat=2;else if(h===5)cat=3;else if(h===4&&s)cat=4;else if(h===4)cat=5;let ret=cat?catPrize(r,cat):0;return{mainHits:h,extraHits:s?1:0,ret,top:h===5&&s}}

function evalIndices(g,rows,indices,c,control=false,quinRows=null){
  let stake=0,ret=0,top=0,sumHits=0,best=0,prizeDraws=0;
  for(const i of indices){
    const r=rows[i];if(!r.economics)continue;const cost=getCost(r);if(!(cost>0))continue;
    let p,o;
    if(g.family==='numeric'){p=control?numericControl(g,r):numericPrediction(g,rows,i,c);o=numericReturn(g,r,p)}
    else if(g.family==='number5'){p=control?String(shuffled(Array.from({length:100000},(_,k)=>String(k).padStart(5,'0')),`${g.id}|${r.drawDate}`)[0]):fiveDigitPred(rows,i,c.window,c.mode);o=fiveDigitReturn(r,p)}
    else if(g.family==='football'){p=control?quinielaControl(r):quinielaPrediction(rows,i);o=quinielaReturn(r,p)}
    else if(g.family==='football8'){p=control?eligeControl(r):eligePrediction(quinRows||[],r);o=eligeReturn(r,p)}
    else if(g.family==='football-score'){p=control?qgControl(r):qgPrediction(rows,i);o=qgReturn(r,p)}
    else if(g.family==='lototurf'){p=control?lototurfControl(r):lototurfPrediction(rows,i,c);o=lototurfReturn(r,p)}
    else if(g.family==='quintuple'){p=control?quintControl(r):quintPred(rows,i,c);o=quintReturn(r,p)}
    stake+=cost;ret+=o.ret||0;if(o.top)top++;sumHits+=o.mainHits||0;best=Math.max(best,o.mainHits||0);if((o.ret||0)>0)prizeDraws++;
  }
  const n=indices.length;return{draws:n,stakeEUR:stake,returnEUR:ret,plEUR:ret-stake,roi:stake?ret/stake-1:null,topHits:top,prizeDraws,meanPrimaryHits:n?sumHits/n:null,bestPrimaryHits:best};
}

function chooseCandidate(g,rows,disc,quinRows){
  if(['football','football8','football-score'].includes(g.family)) return {mode:'fixed-causal-team-or-frequency',window:null};
  let best=null;
  for(const c of CANDIDATES){
    const e=evalIndices(g,rows,disc,c,false,quinRows);const sc=(e.topHits||0)*1e12+(e.prizeDraws||0)*1e6+(e.meanPrimaryHits||0)*1e3+(e.returnEUR||0);
    if(!best||sc>best.sc)best={c,e,sc};
  }
  return best?.c||CANDIDATES[0];
}

const allRows=Object.fromEntries(GAMES.map(g=>[g.id,loadRows(g.dir)]));
const quinRows=allRows.quiniela||[];
const results=[];
for(const g of GAMES){
  const rows=allRows[g.id]||[];
  const eligible=rows.map((r,i)=>[r,i]).filter(([r,i])=>i>=Math.min(200,Math.max(30,Math.floor(rows.length*0.1)))&&r.economics&&getCost(r)>0).map(x=>x[1]);
  if(eligible.length<40){results.push({gameId:g.id,status:'INSUFFICIENT_ECONOMIC_HISTORY',rows:rows.length,eligible:eligible.length});continue}
  const n=eligible.length,a=Math.floor(n*0.5),b=Math.floor(n*0.75),disc=eligible.slice(0,a),val=eligible.slice(a,b),hold=eligible.slice(b);
  const c=chooseCandidate(g,rows,disc,quinRows);
  const discovery=evalIndices(g,rows,disc,c,false,quinRows),validation=evalIndices(g,rows,val,c,false,quinRows),holdout=evalIndices(g,rows,hold,c,false,quinRows),control=evalIndices(g,rows,hold,c,true,quinRows);
  const costs=hold.map(i=>getCost(rows[i])).filter(x=>x>0),minCost=costs.length?Math.min(...costs):null,medCost=costs.length?costs.sort((x,y)=>x-y)[Math.floor(costs.length/2)]:null;
  results.push({gameId:g.id,family:g.family,status:'RETROSPECTIVE_CAUSAL_WALK_FORWARD',fixedCandidate:c,split:{discovery:disc.length,validation:val.length,holdout:hold.length,firstHoldoutDate:rows[hold[0]]?.drawDate,lastHoldoutDate:rows[hold.at(-1)]?.drawDate},minimumObservedUnitStakeEUR:minCost,medianHoldoutUnitStakeEUR:medCost,discovery,validation,holdout,matchedControlHoldout:control,holdoutVsControl:{roiDelta:(holdout.roi??0)-(control.roi??0),meanPrimaryHitsDelta:(holdout.meanPrimaryHits??0)-(control.meanPrimaryHits??0),topHitDelta:holdout.topHits-control.topHits},guards:{eachPredictionUsesOnlyEarlierRows:true,candidateSelectedOnDiscoveryOnly:true,validationAndHoldoutNotUsedForCandidateChoice:true,realMoney:false}});
}
const ranked=[...results].filter(x=>x.holdout).sort((a,b)=>(b.holdout.roi??-99)-(a.holdout.roi??-99));
const out={version:'national-minimum-stake-walkforward-v1',generatedAt:new Date().toISOString(),purpose:'Evaluate one minimum-unit virtual ticket per historical draw using only earlier information, with discovery-only candidate selection and untouched validation/holdout.',scope:{activeGames:GAMES.map(x=>x.id),seasonalDeferred:['navidad','nino'],historicalRecords:Object.fromEntries(GAMES.map(g=>[g.id,allRows[g.id].length]))},methodology:{candidateFamily:{modes:MODES,windows:WINDOWS},split:'50% discovery / 25% validation / 25% holdout after causal warmup',economicPolicy:'Use archived per-draw ticketCost and published payouts. If a hypothetical ticket is sole top-category winner where archived prize is 0, archived jackpot is used only as a flagged counterfactual approximation.',control:'Deterministic matched random minimum-unit ticket per draw.',limitations:['Historical walk-forward is stronger than in-sample fitting but is not a live prospective result.','Loteria Nacional return is conservative: exact first/second and reintegro only; other extraction prizes are not credited.','Quintuple Plus lacks horse identities/odds in archive; only starting-position history is testable here.','Football models use only prior archived team outcomes and are deliberately simple baselines.']},results,rankingByHoldoutROI:ranked.map(x=>({gameId:x.gameId,roi:x.holdout.roi,stakeEUR:x.holdout.stakeEUR,returnEUR:x.holdout.returnEUR,topHits:x.holdout.topHits,controlROI:x.matchedControlHoldout.roi,roiDelta:x.holdoutVsControl.roiDelta})),decision:{realMoneyPass:false,automaticBetting:false,claim:'NO_LIVE_EDGE_CLAIM_FROM_RETROSPECTIVE_WALK_FORWARD'}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ranking:out.rankingByHoldoutROI,decision:out.decision},null,2));
