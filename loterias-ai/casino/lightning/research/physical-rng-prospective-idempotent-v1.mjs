#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const OUT='loterias-ai/casino/lightning/evidence/physical-rng-prospective-status-v1.json';
const SCRIPT='loterias-ai/casino/lightning/research/physical-rng-prospective-v1.mjs';
const oldRaw=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):null;
const semantic=raw=>{if(!raw)return null;const x=JSON.parse(raw);delete x.generatedAt;return JSON.stringify(x)};
const oldSemantic=semantic(oldRaw);
const r=spawnSync(process.execPath,[SCRIPT],{stdio:'inherit'});
if(r.status!==0)process.exit(r.status??1);
if(!fs.existsSync(OUT))throw new Error('physical prospective evaluator produced no status');
const newRaw=fs.readFileSync(OUT,'utf8'),newSemantic=semantic(newRaw);
const changed=oldSemantic!==newSemantic;
if(!changed&&oldRaw!==null)fs.writeFileSync(OUT,oldRaw);
console.log(JSON.stringify({status:'PHYSICAL_RNG_PROSPECTIVE_WRAPPER',changed,hadPrevious:oldRaw!==null}));
