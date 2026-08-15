import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const target = process.argv[2];
if (!target) throw new Error('usage: node run-fixed-financial-aggregator.mjs <aggregator>');
const source = fs.readFileSync(target, 'utf8');
const fixes = [
  ["const R=rng(0x990000+q*7919),stake=0,ret=0,full=0,sum=0;", "const R=rng(0x990000+q*7919);let stake=0,ret=0,full=0,sum=0;"],
  ["const R=rng(0x881100+q*8191),stake=0,ret=0,full=0,sum=0;", "const R=rng(0x881100+q*8191);let stake=0,ret=0,full=0,sum=0;"]
];
let fixed = source;
let replacements = 0;
for (const [from, to] of fixes) {
  if (fixed.includes(from)) {
    fixed = fixed.replace(from, to);
    replacements++;
  }
}
if (!replacements) throw new Error(`No known const-mutation pattern found in ${target}`);
const temp = `/tmp/${path.basename(target, '.mjs')}-runtime-fixed.mjs`;
fs.writeFileSync(temp, fixed);
console.log(JSON.stringify({ target, temp, replacements }));
await import(pathToFileURL(temp).href + `?t=${Date.now()}`);
