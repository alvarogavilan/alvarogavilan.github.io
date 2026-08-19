#!/usr/bin/env node
import fs from 'node:fs';
const SRC='loterias-ai/casino/playuzu/evidence/shared-jackpot-networks-v1.json';
const PROTOCOL='loterias-ai/casino/playuzu/evidence/progressive-network-observation-protocol-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/progressive-network-monitor-plan-v1.json';
const j=JSON.parse(fs.readFileSync(SRC,'utf8')),p=JSON.parse(fs.readFileSync(PROTOCOL,'utf8'));
if(p.version!=='progressive-network-observation-protocol-v1'||p.guards?.immutable!==true)throw new Error('observation protocol drift');
const nets=(j.sharedNetworks||[]).filter(n=>Number(n.distinctTitles)>=2);
const pageSet=[...new Set(nets.flatMap(n=>(n.titles||[]).map(t=>Number(t.page)).filter(Number.isInteger)))].sort((a,b)=>a-b);
const titlesOn=(n,page)=>new Set((n.titles||[]).filter(t=>Number(t.page)===page).map(t=>String(t.name)));
const coverage=(selected,n)=>{const s=new Set();for(const pg of selected)for(const x of titlesOn(n,pg))s.add(x);return s.size};
let solution=null;
function choose(start,left,acc){
  if(solution)return;
  if(left===0){if(nets.every(n=>coverage(acc,n)>=2))solution=[...acc];return;}
  for(let i=start;i<=pageSet.length-left;i++){acc.push(pageSet[i]);choose(i+1,left-1,acc);acc.pop();if(solution)return;}
}
for(let k=1;k<=pageSet.length&&!solution;k++)choose(0,k,[]);
if(!solution)throw new Error('no page subset can corroborate every shared network');
const networks=nets.map(n=>{const observedTitles=[...new Set(solution.flatMap(pg=>(n.titles||[]).filter(t=>Number(t.page)===pg).map(t=>String(t.name))))];return{networkId:n.networkId,rawCounterAtDiscovery:n.rawCounter,distinctTitlesAtDiscovery:n.distinctTitles,providers:n.providers||[],selectedPages:solution.filter(pg=>(n.titles||[]).some(t=>Number(t.page)===pg)),selectedTitles:observedTitles,corroborationCount:observedTitles.length};});
const out={version:'progressive-network-monitor-plan-v1',generatedAt:new Date().toISOString(),source:SRC,protocol:p.version,selectionPolicy:'EXACT_MINIMUM_PAGE_SUBSET_FOR_AT_LEAST_TWO_DISTINCT_TITLES_PER_DISCOVERED_SHARED_NETWORK',selectedPages:solution,pageCount:solution.length,allCandidatePages:pageSet,networkCount:networks.length,networks,guards:{selectionUsesDiscoverySnapshotOnly:true,futureGrowthOrResetNotUsed:true,minimumTwoTitlesPerNetwork:true,currencyTrusted:false,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({selectedPages:solution,pageCount:solution.length,networks:networks.map(n=>({networkId:n.networkId,titles:n.corroborationCount,pages:n.selectedPages}))},null,2));