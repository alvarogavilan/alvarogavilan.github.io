#!/usr/bin/env node
// Freeze trigger v1: intentional no-op touch so the dedicated workflow runs after workflow creation.
import fs from 'node:fs';
import crypto from 'node:crypto';
const replay=JSON.parse(fs.readFileSync('loterias-ai/casino/lightning/evidence/historical-replay-grid-v1.json','utf8'));
const rows=fs.readFileSync('loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>Number.isInteger(r.winner)&&r.timestamp);
rows.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
const candidates=(replay.robustCandidates||replay.topRobust||replay.topTrain||[]).filter(x=>x.c?.mode==='cold').slice(0,8).map(x=>({id:x.id,lookback:x.c.lookback,pickCount:x.c.pickCount,mode:'cold',historical:{train:x.train,validation:x.validation,test:x.test}}));
const freeze={version:'lightning-cold-prospective-freeze-v1',createdAt:new Date().toISOString(),freezeRoundCount:rows.length,freezeLastRoundId:rows.at(-1)?.roundId||null,freezeLastTimestamp:rows.at(-1)?.timestamp||null,candidateCount:candidates.length,candidates,retuningAllowed:false,selectionRule:'at each future round rank 0..36 by ascending count in previous lookback rounds; tie-break numeric ascending; select first pickCount',futureOnly:true,realMoney:false,minimumProspectiveRounds:500,claimAllowed:false};
freeze.freezeHash=crypto.createHash('sha256').update(JSON.stringify({freezeRoundCount:freeze.freezeRoundCount,freezeLastRoundId:freeze.freezeLastRoundId,candidates})).digest('hex');
fs.writeFileSync('loterias-ai/casino/lightning/evidence/cold-prospective-freeze-v1.json',JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify(freeze,null,2));
