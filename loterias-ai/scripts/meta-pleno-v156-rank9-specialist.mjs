import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v154-specialist-add-drop.mjs';
if(!fs.existsSync(SRC)) throw new Error('v154 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v154-specialist-add-drop.json","meta-pleno-v156-rank9-specialist.json")
 .replace("version:'v154'","version:'v156'")
 .replace("family:'SPECIALIST_GRAPH_ADD_FALSEPOS_DROP'","family:'RANK9_FRONTIER_ADD_FALSEPOS_DROP'")
 .replace("const configs=[];for(const maxRank of[9,10,12,14])for(const adv of[0,4,8,12,16,20])configs.push({id:`r${maxRank}-a${adv}`,maxRank,adv});",
"const configs=[];for(const adv of[0,4,8,12,16,20,24,28,32,36,40])configs.push({id:`r9-a${adv}`,maxRank:9,adv});")
 .replace("Specialist decomposition. ADD is chosen among c12 ranks 9..maxRank by the independently frozen v138 graph ranking. DROP is chosen among c12 top8 by a false-positive discriminant trained only on 2018-2020, using pre-draw c12/graph features. maxRank and graph-advantage gate are selected only on 2021-2022 and frozen before 2023+. This directly tests the complementary error observed in 2025: v147 identified add=34 while v153 identified drop=31.",
"Exploratory boundary specialist. ADD is fixed to c12 rank 9, the immediate number outside the Budget8 frontier. DROP is selected by the false-positive discriminant trained only on 2018-2020. Only the intervention graph-advantage gate is selected on 2021-2022 and frozen before 2023+. This architecture was motivated after inspecting the 2025 near-pleno anatomy, so any historical full hit is exploratory and requires fresh prospective replication.")
 .replace("decision:'EXPLORATORY_REQUIRE_MATCHED_NULL_AND_FRESH_PROSPECTIVE'","decision:'EXPLORATORY_POST_ANATOMY_REQUIRE_FRESH_PROSPECTIVE'");
const tmp='/tmp/meta-pleno-v156.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
