import fs from 'node:fs';
const root='loterias-ai/data/backtests';
const defs=[
 {id:'primitiva',name:'La Primitiva',file:'primitiva-official-financial-validation.json'},
 {id:'bonoloto',name:'Bonoloto',file:'bonoloto-official-financial-tournament.json'},
 {id:'gordo-primitiva',name:'El Gordo de la Primitiva',file:'gordo-primitiva-official-financial-tournament.json'},
 {id:'euromillones',name:'Euromillones',file:'euromillones-official-financial-tournament.json'},
 {id:'eurodreams',name:'EuroDreams',file:'eurodreams-official-financial-tournament.json'},
 {id:'loteria-nacional',name:'Lotería Nacional',file:'loteria-nacional-official-financial-tournament.json'},
 {id:'quiniela',name:'La Quiniela',file:'quiniela-official-financial-tournament.json'},
 {id:'elige8',name:'Elige8',file:'elige8-official-financial-tournament.json'},
 {id:'quinigol',name:'Quinigol',file:'quinigol-official-financial-tournament.json'},
 {id:'lototurf',name:'Lototurf',file:'lototurf-official-financial-tournament.json'},
 {id:'quintuple-plus',name:'Quíntuple Plus',file:'quintuple-plus-official-financial-tournament.json'}
];
const games=defs.map(d=>{if(!d.file||!fs.existsSync(`${root}/${d.file}`))return{id:d.id,name:d.name,status:'PENDING',realMoneyPass:false,reason:'Official financial gate not completed'};const j=JSON.parse(fs.readFileSync(`${root}/${d.file}`,'utf8')),h=j.holdout||{},official=j.officialEconomicDraws??null,pass=j.realMoneyPass===true,blocked=j.status==='BLOCKED_DATA'||j.status==='INSUFFICIENT_SAMPLE',shadow=!pass&&!blocked&&Number(h.draws)>=100&&Number(h.roi)>0;return{id:d.id,name:d.name,status:blocked?'BLOCKED':pass?'ELIGIBLE':shadow?'CANDIDATE_SHADOW':'REJECTED',realMoneyPass:pass,officialEconomicDraws:official,holdoutDraws:h.draws??j.holdoutDraws??null,holdoutStake:h.stake??null,holdoutReturn:h.return??null,holdoutPL:h.pl??null,holdoutROI:h.roi??null,selected:j.selected??j.winner??{strategy:j.strategy,tickets:j.tickets},baseline:j.randomBaseline??null,source:j.source??null,reason:blocked?(j.reason||'Insufficient official reconstructable data'):pass?'All completed official gates passed':shadow?'Positive locked holdout but full baseline gate not passed; Shadow only, real stake remains 0':'Completed official financial gate did not pass'}});
const eligible=games.filter(g=>g.status==='ELIGIBLE'),shadow=games.filter(g=>g.status==='CANDIDATE_SHADOW'),rejected=games.filter(g=>g.status==='REJECTED'),blocked=games.filter(g=>g.status==='BLOCKED'),pending=games.filter(g=>g.status==='PENDING');const out={generatedAt:new Date().toISOString(),policy:{realMoneyRequires:'official economics + locked holdout + positive ROI + matched random baselines + sufficient sample + prospective shadow before allocation',defaultAllocationEUR:0},summary:{eligible:eligible.length,shadowCandidates:shadow.length,rejected:rejected.length,blocked:blocked.length,pending:pending.length,approvedStakeTodayEUR:0},games};fs.mkdirSync('loterias-ai/data/gates',{recursive:true});fs.writeFileSync('loterias-ai/data/gates/real-money-status.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary,null,2));