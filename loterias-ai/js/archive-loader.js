/* Loterías AI — Archive Loader */
(function(root){'use strict';
const games=['bonoloto','primitiva','euromillones','eurodreams','gordo-primitiva','loteria-nacional'];
async function loadYear(game,year){const r=await fetch(`../data/archive/${game}/${year}.json`,{cache:'no-store'});if(!r.ok)return{gameId:game,year,records:[]};return r.json();}
async function loadCore2026(){const rows=await Promise.all(games.map(g=>loadYear(g,2026)));return rows;}
function summary(parts){return parts.map(x=>{const r=Array.isArray(x.records)?x.records:[];return{gameId:x.gameId,year:x.year,count:r.length,earliest:r[0]?.drawDate||null,latest:r.at(-1)?.drawDate||null,hasPrizeTables:r.filter(d=>Array.isArray(d.prizes)&&d.prizes.length).length};});}
root.LotteryArchiveLoader={games,loadYear,loadCore2026,summary};
})(typeof window!=='undefined'?window:globalThis);