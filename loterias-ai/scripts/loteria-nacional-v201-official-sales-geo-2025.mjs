import fs from 'node:fs';
const src=fs.readFileSync('loterias-ai/scripts/loteria-nacional-v198-official-sales-geo.mjs','utf8')
  .replace("const OUT='loterias-ai/data/research/loteria-nacional-v198-official-sales-geo.json';","const OUT='loterias-ai/data/research/loteria-nacional-v201-official-sales-geo-2025.json';")
  .replace("const ARCH='loterias-ai/data/archive/loteria-nacional/2026.json';","const ARCH='loterias-ai/data/archive/loteria-nacional/2025.json';")
  .replace("version:'v198b'","version:'v201'")
  .replace("version:'v198'","version:'v201'")
  .replace("year:2026","year:2025");
const tmp='loterias-ai/scripts/.tmp-v201-official-sales-geo-2025.mjs';
fs.writeFileSync(tmp,src);
try{await import(new URL('./.tmp-v201-official-sales-geo-2025.mjs',import.meta.url));}finally{try{fs.unlinkSync(tmp)}catch{}}
