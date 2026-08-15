import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v154-specialist-add-drop.mjs';
if(!fs.existsSync(SRC)) throw new Error('v154 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v154-specialist-add-drop.json","meta-pleno-v155-frontier-graph-add.json")
 .replace("version:'v154'","version:'v155'")
 .replace("family:'SPECIALIST_GRAPH_ADD_FALSEPOS_DROP'","family:'FRONTIER_PENALIZED_GRAPH_ADD_FALSEPOS_DROP'")
 .replace("const configs=[];for(const maxRank of[9,10,12,14])for(const adv of[0,4,8,12,16,20])configs.push({id:`r${maxRank}-a${adv}`,maxRank,adv});",
"const configs=[];for(const maxRank of[9,10,12,14])for(const adv of[0,4,8,12,16,20])for(const beta of[0,.5,1,2,4,8,16])configs.push({id:`r${maxRank}-a${adv}-b${beta}`,maxRank,adv,beta});")
 .replace(".sort((a,b)=>a.graphRank-b.graphRank||a.rank-b.rank),addC=adds[0];const graphAdv=addC?Number(day.gr[drop.x.n])-addC.graphRank:-Infinity,doSwap=!!addC&&graphAdv>=c.adv,",
".sort((a,b)=>(a.graphRank+c.beta*(a.rank-9))-(b.graphRank+c.beta*(b.rank-9))||a.rank-b.rank),addC=adds[0];const addComposite=addC?addC.graphRank+c.beta*(addC.rank-9):Infinity,graphAdv=addC?Number(day.gr[drop.x.n])-addComposite:-Infinity,doSwap=!!addC&&graphAdv>=c.adv,")
 .replace("graphAdvantage:graphAdv})","graphAdvantage:graphAdv,frontierPenaltyBeta:c.beta,addCompositeScore:addC?addC.graphRank+c.beta*(addC.rank-9):null})")
 .replace("Specialist decomposition. ADD is chosen among c12 ranks 9..maxRank by the independently frozen v138 graph ranking. DROP is chosen among c12 top8 by a false-positive discriminant trained only on 2018-2020, using pre-draw c12/graph features. maxRank and graph-advantage gate are selected only on 2021-2022 and frozen before 2023+. This directly tests the complementary error observed in 2025: v147 identified add=34 while v153 identified drop=31.",
"Specialist decomposition with frontier regularization. ADD is chosen among c12 ranks 9..maxRank by frozen v138 graph rank plus beta times distance from c12 rank 9, so graph evidence must justify moving deeper from the border. DROP is chosen among c12 top8 by the same false-positive discriminant trained only on 2018-2020. beta, maxRank and intervention gate are selected only on 2021-2022 and frozen before 2023+. This tests whether the ADD specialist should prefer near-border candidates when graph evidence is close, without using 2023+ outcomes for selection.")
 .replace("decision:'EXPLORATORY_REQUIRE_MATCHED_NULL_AND_FRESH_PROSPECTIVE'","decision:'EXPLORATORY_FRONTIER_GRAPH_REQUIRE_MATCHED_NULL_AND_FRESH_PROSPECTIVE'");
const tmp='/tmp/meta-pleno-v155.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
