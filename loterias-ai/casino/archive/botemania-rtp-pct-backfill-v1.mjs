#!/usr/bin/env node
import fs from 'node:fs';
import { parseRtpPctsFromContexts } from './botemania-rtp-pct-parser-v1.mjs';

const CENSUS='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const census=JSON.parse(fs.readFileSync(CENSUS,'utf8'));
let changed=0;
const changes=[];
for(const game of census.games||[]){
  const before=Array.isArray(game.rtpPcts)?game.rtpPcts:[];
  const after=parseRtpPctsFromContexts(game.rtpContexts);
  if(JSON.stringify(before)!==JSON.stringify(after)){
    changes.push({slug:game.slug,before,after});
    game.rtpPcts=after;
    changed++;
  }
}
census.summary={...(census.summary||{}),withRtp:(census.games||[]).filter(x=>Array.isArray(x.rtpPcts)&&x.rtpPcts.length>0).length};
fs.writeFileSync(CENSUS,JSON.stringify(census,null,2)+'\n');
console.log(JSON.stringify({gamesChanged:changed,totalGames:(census.games||[]).length,changes},null,2));
