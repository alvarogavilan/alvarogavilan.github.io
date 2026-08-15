import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v148-bonoloto-structural-gated-rescue.mjs';
if(!fs.existsSync(SRC))throw new Error('v148 source required');
let s=fs.readFileSync(SRC,'utf8');
const before='for(let d=5;d<8;d++)for(let a=8;a<14;a++)';
const after='for(let d=0;d<8;d++)for(let a=8;a<14;a++)';
if(!s.includes(before))throw new Error('Expected v148 candidate restriction not found');
s=s.replace(before,after)
 .replace("meta-pleno-v148-bonoloto-structural-gated-rescue.json","meta-pleno-v150-bonoloto-all-position-structural-rescue.json")
 .replace("version:'v148'","version:'v150'")
 .replace("family:'STRUCTURAL_GATED_SIXTH_RESCUE'","family:'ALL_POSITION_STRUCTURAL_SIXTH_RESCUE'")
 .replace("but a structural swap is executed only if its objective gain over the unchanged c12 pool exceeds a threshold.","and expands the one-swap candidate set so ANY of c12 ranks 1-8 may be dropped for ranks 9-14; a swap executes only if objective gain exceeds a threshold.")
 .replace("This tests whether selective structural intervention can preserve near-plenos while rescuing full hits.","This tests the concrete architectural limitation exposed by v149: some 5/6 pools have all false positives above rank 6, making the original v132 drop-only-ranks-6..8 rule incapable of a 6/6 rescue.");
const tmp='/tmp/meta-pleno-v150.mjs';fs.writeFileSync(tmp,s);await import(pathToFileURL(tmp).href);
