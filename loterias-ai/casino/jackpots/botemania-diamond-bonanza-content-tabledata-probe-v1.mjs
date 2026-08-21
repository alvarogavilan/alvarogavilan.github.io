#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT='https://www.botemania.es/es/graphql';
const VENTURE='botemania_es';
const SLUG='danza-de-los-diamantes';
const PAGE_PATH=`/juegos/slots-online/${SLUG}`;
const REFERER=`https://www.botemania.es${PAGE_PATH}`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-diamond-bonanza-content-tabledata-probe-v1.json';
const headers={accept:'application/json','content-type':'application/json',venture:VENTURE,referer:REFERER,origin:'https://www.botemania.es','user-agent':'loterias-ai-diamond-content-tabledata/1.0'};

async function gql(query,variables){
  const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({query,variables}),redirect:'follow',signal:AbortSignal.timeout(15000)});
  const text=await r.text(); let body=null; try{body=JSON.parse(text)}catch{}
  return {httpStatus:r.status,body,responseSha256:crypto.createHash('sha256').update(text).digest('hex'),rawPreview:body?null:text.slice(0,800)};
}

const fields=`
  id
  title
  introduction
  heroCaption
  canonical
  howToPlay
  providerId
  provider { name legalInfo bynderImage { transformBaseUrl name } }
  gameFeatures { enabled value type }
  content {
    type
    props {
      text
      imageUrl
      imageAlt
      imageCaption
      videoUrl
      videoAlt
      videoThumbnail
      tableData
    }
  }
  jackpot { id amount }
  jsonld
`;

const specs=[
  ['contentfulGameExtended',`query DiamondContent($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:SLUG}],
  ['pageOrGameExtended',`query DiamondPage($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:PAGE_PATH}],
];
const probes=[];
for(const [name,query,variables] of specs){
  try{const x=await gql(query,variables);probes.push({name,httpStatus:x.httpStatus,data:x.body?.data||null,errors:(x.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,20),responseSha256:x.responseSha256,rawPreview:x.rawPreview});}
  catch(e){probes.push({name,httpStatus:null,data:null,errors:[String(e?.message||e)]});}
}
const games=[];
for(const p of probes){const g=p.data?.contentfulGame||p.data?.pageOrGame?.game;if(g&&typeof g==='object')games.push({source:p.name,...g});}

const needles=['25c','25 c','0,25','0.25','50c','50 c','0,50','0.50','1€','1 €','95,44','95.44','95.01','5.66','5,66','93.52','bote','jackpot','progressive','progresivo','diamante','diamond','2000','seed','contribution','contribución','max bet','apuesta máxima','5 líneas','5 lineas','payline','línea 5','linea 5'];
function walk(value,path='$',out=[]){
  if(out.length>=500)return out;
  if(typeof value==='string'){const lower=value.toLowerCase();const matched=needles.filter(n=>lower.includes(n.toLowerCase()));if(matched.length)out.push({path,matched,value:value.slice(0,5000)});return out;}
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,`${path}[${i}]`,out));return out;}
  if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))walk(v,`${path}.${k}`,out);
  return out;
}
const semanticHits=walk(games);
const tableDataBlocks=[];
for(const g of games)for(let i=0;i<(g.content||[]).length;i++){const b=g.content[i];if(b?.props?.tableData!=null)tableDataBlocks.push({source:g.source,blockIndex:i,type:b.type??null,tableData:b.props.tableData});}
const howToPlayBlocks=games.filter(g=>typeof g.howToPlay==='string'&&g.howToPlay.trim()).map(g=>({source:g.source,howToPlay:g.howToPlay}));
const jackpotBlocks=games.filter(g=>g.jackpot&&typeof g.jackpot==='object').map(g=>({source:g.source,jackpot:g.jackpot}));
const serialized=JSON.stringify({games,tableDataBlocks,howToPlayBlocks,semanticHits}).toLowerCase();
const signals={
  coin25:/(25c|25 c|0[,.]25)/i.test(serialized),
  coin50:/(50c|50 c|0[,.]50)/i.test(serialized),
  coin1eur:/1\s*€/i.test(serialized),
  rtp9544:/95[,.]44/.test(serialized),
  contribution566:/5[,.]66/.test(serialized),
  rtp9352:/93[,.]52/.test(serialized),
  multiplier2000:/\b2000\b/.test(serialized),
  fifthLine:/linea\s*5|línea\s*5|fifth\s+payline|payline\s*5/i.test(serialized),
  maxBet:/max\s+bet|apuesta\s+máxima|apuesta\s+maxima/i.test(serialized),
  seed:/\bseed\b|semilla/i.test(serialized),
};
const out={
  version:'botemania-diamond-bonanza-content-tabledata-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{game:'Danza de los Diamantes / Diamond Bonanza',slug:SLUG,page:REFERER,monitorKey:'generic:diamondbonanza25BTM'},
  schemaProvenance:{source:'PUBLIC_CURRENT_BOTEMANIA_CLIENT_BUNDLE_GAMEFRAGMENT',noIntrospection:true,queriedKnownFields:true},
  probes,games,
  extracted:{gameCount:games.length,providerIds:[...new Set(games.map(g=>g.providerId).filter(Boolean))],providerNames:[...new Set(games.map(g=>g.provider?.name).filter(Boolean))],tableDataBlockCount:tableDataBlocks.length,tableDataBlocks,howToPlayBlockCount:howToPlayBlocks.length,howToPlayBlocks,jackpotBlocks,semanticHits,signals},
  decision:{metadataRecovered:games.length>0,structuredTableDataRecovered:tableDataBlocks.length>0,exactSpainSeedRecovered:signals.seed&&signals.multiplier2000,exactSpainJackpotContributionRecovered:signals.contribution566,exactSpainProgressiveTriggerRecovered:signals.fifthLine&&signals.maxBet,exactSpainDenominationSetRecovered:signals.coin25&&signals.coin50&&signals.coin1eur,exactSpainPaytableRecovered:false,breakEvenModelVerified:false,economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicGraphqlOnly:true,knownBundleFieldsOnly:true,noIntrospection:true,noAuthentication:true,noCookies:true,noMutation:true,noBetting:true,noCrossMarketSubstitution:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({extracted:{gameCount:out.extracted.gameCount,providerIds:out.extracted.providerIds,providerNames:out.extracted.providerNames,tableDataBlockCount:out.extracted.tableDataBlockCount,howToPlayBlockCount:out.extracted.howToPlayBlockCount,jackpotBlocks:out.extracted.jackpotBlocks,signals:out.extracted.signals,semanticHits:out.extracted.semanticHits.slice(0,25)},decision:out.decision},null,2));
