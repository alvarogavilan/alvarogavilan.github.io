import fs from 'node:fs';
const src=fs.readFileSync('loterias-ai/scripts/loteria-nacional-v198-official-sales-geo.mjs','utf8')
  .replace("const OUT='loterias-ai/data/research/loteria-nacional-v198-official-sales-geo.json';","const OUT='loterias-ai/data/research/loteria-nacional-v218-official-sales-geo-2023.json';")
  .replace("const ARCH='loterias-ai/data/archive/loteria-nacional/2026.json';","const ARCH='loterias-ai/data/archive/loteria-nacional/2023.json';")
  .replace("version:'v198b'","version:'v218'")
  .replace("version:'v198'","version:'v218'")
  .replace("year:2026","year:2023");
const tmp='loterias-ai/scripts/.tmp-v218-official-sales-geo-2023.mjs';
fs.writeFileSync(tmp,src);
try{await import(new URL('./.tmp-v218-official-sales-geo-2023.mjs',import.meta.url));}finally{try{fs.unlinkSync(tmp)}catch{}}