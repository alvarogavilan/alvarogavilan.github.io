#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/specialists/official-game-specialists-v1.json';
const OUT='loterias-ai/casino/specialists/economic-priority-queue-v1.json';
const j=JSON.parse(fs.readFileSync(IN,'utf8'));
const score=x=>{
  const n=String(x.game||'').toLowerCase();let s=0,reasons=[];
  if(/jackpot king|\bjpk\b/.test(n)){s+=100;reasons.push('JACKPOT_KING_STATE_DEPENDENT_NETWORK');}
  if(x.class==='JACKPOT'){s+=70;reasons.push('PROGRESSIVE_OR_JACKPOT');}
  if(/age of the gods/.test(n)){s+=65;reasons.push('NETWORK_PROGRESSIVE_PLAYTECH');}
  if(x.class==='CRASH'){s+=50;reasons.push('TRANSPARENT_STATE_OR_CASHOUT_MECHANICS');}
  if(/bonus|super scatter|feature buy|buy/.test(n)){s+=35;reasons.push('POSSIBLE_MODE_SPECIFIC_RTP');}
  if(x.class==='LIVE_TABLE'){s+=25;reasons.push('LIVE_PHYSICAL_OR_TABLE_STREAM');}
  if(x.class==='SLOT_OR_RNG'){s+=5;reasons.push('ORDINARY_RNG_LOW_PRIOR');}
  if(x.operator==='pokerstars-es')s+=2;if(x.operator==='playuzu-es')s+=2;
  return{...x,priorityScore:s,priorityReasons:reasons,analysisContract:{phase1:'Verify official provider rules, exact RTP/configuration, stake dependence, progressive/state variables and cadence.',phase2:'Only test patterns with a plausible mechanism; measure spin/round speed as a covariate, never assume speed creates predictability.',phase3:'Freeze any candidate before untouched future observations.',economicPass:'Positive expected value lower confidence bound > 1 after exact stake/rule costs.',realMoneyAllowed:false}};
};
const queue=(j.specialists||[]).map(score).sort((a,b)=>b.priorityScore-a.priorityScore||String(a.game).localeCompare(String(b.game)));
const tiers={P0:queue.filter(x=>x.priorityScore>=100),P1:queue.filter(x=>x.priorityScore>=70&&x.priorityScore<100),P2:queue.filter(x=>x.priorityScore>=50&&x.priorityScore<70),P3:queue.filter(x=>x.priorityScore<50)};
const out={version:'economic-priority-queue-v1',generatedAt:new Date().toISOString(),policy:{officialOperatorsOnly:['pokerstars-es','playuzu-es'],mechanismFirst:true,spinSpeedIsCovariateNotAssumedEdge:true,oneSpecialistMinimumPerCataloguedGame:true},summary:{specialists:queue.length,P0:tiers.P0.length,P1:tiers.P1.length,P2:tiers.P2.length,P3:tiers.P3.length},priorityQueue:queue,guards:{automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary,null,2));
