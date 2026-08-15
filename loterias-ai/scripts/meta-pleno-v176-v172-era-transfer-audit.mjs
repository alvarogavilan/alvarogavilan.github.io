import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const SRC='loterias-ai/scripts/meta-pleno-v172-dual-drop-ticket-ranker.mjs';
if(!fs.existsSync(SRC)) throw new Error('v172 source required');
const original=fs.readFileSync(SRC,'utf8');

const folds=[
  {id:'A',dropStart:'2010-01-01',dropEnd:'2012-12-31',selectStart:'2013-01-01',selectEnd:'2014-12-31',midEnd:'2016-12-31'},
  {id:'B',dropStart:'2012-01-01',dropEnd:'2014-12-31',selectStart:'2015-01-01',selectEnd:'2016-12-31',midEnd:'2018-12-31'},
  {id:'C',dropStart:'2014-01-01',dropEnd:'2016-12-31',selectStart:'2017-01-01',selectEnd:'2018-12-31',midEnd:'2020-12-31'}
];

function transformed(f){
  let s=original;
  const out=`/tmp/meta-pleno-v176-fold-${f.id}.json`;
  s=s.replace("loterias-ai/data/research/meta-pleno-v172-dual-drop-ticket-ranker.json",out)
     .replace("version:'v172'","version:'v176-fold-${f.id}'")
     .replaceAll("2018-01-01",f.dropStart)
     .replaceAll("2020-12-31",f.dropEnd)
     .replaceAll("2021-01-01",f.selectStart)
     .replaceAll("2022-12-31",f.selectEnd)
     .replaceAll("2024-12-31",f.midEnd);
  return {s,out};
}

const results=[];
for(const f of folds){
  const {s,out}=transformed(f),tmp=`/tmp/meta-pleno-v176-${f.id}.mjs`;
  fs.writeFileSync(tmp,s);
  const r=spawnSync(process.execPath,[tmp],{encoding:'utf8',maxBuffer:1024*1024*30});
  if(r.status!==0) throw new Error(`fold ${f.id} failed: ${r.stderr||r.stdout}`);
  const d=JSON.parse(fs.readFileSync(out,'utf8'));
  const leader=d.leaders?.[0];
  results.push({
    fold:f,
    candidateConfigs:d.candidateConfigs,
    leaderConfig:leader?.config??null,
    twoEUR:{select:leader?.select?.['2']??null,mid:leader?.mid?.['2']??null,late:leader?.late?.['2']??null},
    fiveEUR:{select:leader?.select?.['5']??null,mid:leader?.mid?.['5']??null,late:leader?.late?.['5']??null},
    summary:d.summary
  });
}

const twoEURValidationFull=results.reduce((s,r)=>s+(r.twoEUR.mid?.h6||0)+(r.twoEUR.late?.h6||0),0);
const twoEURValidation5=results.reduce((s,r)=>s+(r.twoEUR.mid?.h5||0)+(r.twoEUR.late?.h5||0),0);
const out={
  generatedAt:new Date().toISOString(),version:'v176',gameId:'bonoloto',family:'V172_ERA_TRANSFER_AUDIT',
  methodology:'Architecture-level temporal transfer audit. The v172 code and 25 dual-drop ranking configurations are reused without inventing a new model family, but its training/selection/validation cutoffs are shifted into three earlier chronological folds. Each fold learns false-positive drop behavior and selects its leader only before its later validation eras. This does not erase architecture-level discovery history, but tests whether the mechanism transfers beyond the 2024-2025 cases that motivated it.',
  folds:results,
  aggregate:{twoEURValidationFull,twoEURValidation5,foldsWithTwoEURValidationFull:results.filter(r=>(r.twoEUR.mid?.h6||0)+(r.twoEUR.late?.h6||0)>0).length},
  interpretation:twoEURValidationFull>0?'TRANSFER_SIGNAL_REQUIRES_MATCHED_NULL_AND_FRESH_PROSPECTIVE':'NO_HISTORICAL_2EUR_FULL_TRANSFER_SIGNAL',
  realMoneyPass:false,realStakeEUR:0
};
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v176-v172-era-transfer-audit.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.aggregate));