import fs from 'node:fs';
const src=fs.readFileSync('loterias-ai/scripts/loteria-nacional-v198-official-sales-geo.mjs','utf8')
  .replace("const OUT='loterias-ai/data/research/loteria-nacional-v198-official-sales-geo.json';","const OUT='loterias-ai/data/research/loteria-nacional-v204-official-sales-geo-2024.json';")
  .replace("const ARCH='loterias-ai/data/archive/loteria-nacional/2026.json';","const ARCH='loterias-ai/data/archive/loteria-nacional/2024.json';")
  .replace("version:'v198b'","version:'v204'")
  .replace("version:'v198'","version:'v204'")
  .replace("year:2026","year:2024");
const tmp='loterias-ai/scripts/.tmp-v204-official-sales-geo-2024.mjs';
fs.writeFileSync(tmp,src);
try{await import(new URL('./.tmp-v204-official-sales-geo-2024.mjs',import.meta.url));}finally{try{fs.unlinkSync(tmp)}catch{}}