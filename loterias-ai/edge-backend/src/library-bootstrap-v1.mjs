export const LIBRARY_SOURCES=[
  {sourceId:'es-selae-results',authorityClass:'PRIMARY_OFFICIAL',jurisdiction:'ES',publisher:'SELAE',sourceUrl:'https://www.loteriasyapuestas.es/es/resultados',coverageNote:'Official draw results, combinations, categories, advertised jackpot, stakes/receipts and prizes when published.'},
  {sourceId:'es-selae-primitiva-feed',authorityClass:'PRIMARY_OFFICIAL',jurisdiction:'ES',publisher:'SELAE',sourceUrl:'https://www.loteriasyapuestas.es/es/la-primitiva/resultados/.formatoRSSa',coverageNote:'Official result timestamps/listing for La Primitiva.'},
  {sourceId:'es-selae-euromillones-results',authorityClass:'PRIMARY_OFFICIAL',jurisdiction:'ES',publisher:'SELAE',sourceUrl:'https://www.loteriasyapuestas.es/es/euromillones/resultados',coverageNote:'Official Euromillones draw archive and detail pages.'},
  {sourceId:'es-once-history',authorityClass:'PRIMARY_OFFICIAL',jurisdiction:'ES',publisher:'ONCE',sourceUrl:'https://www.juegosonce.es/sorteos-anteriores',coverageNote:'Official ONCE previous-draw access; coupon historic results available from 1996.'},
  {sourceId:'es-once-eurojackpot-history',authorityClass:'PRIMARY_OFFICIAL',jurisdiction:'ES',publisher:'ONCE',sourceUrl:'https://www.juegosonce.es/historico-resultados-eurojackpot-junio-2026',coverageNote:'Official monthly Eurojackpot historical results.'},
  {sourceId:'es-botemania-live-jackpots',authorityClass:'PRIMARY_OPERATOR',jurisdiction:'ES',publisher:'Botemania',sourceUrl:'https://www.botemania.es/es/graphql',coverageNote:'Direct public canonical jackpot feed used by EDGE telemetry.'},
  {sourceId:'edge-direct-telemetry',authorityClass:'INTERNAL_DIRECT_OBSERVATION',jurisdiction:'ES',publisher:'EDGE',sourceUrl:null,coverageNote:'Durable direct observations, ATH, cycles and scientific events produced by EDGE.'}
];

function draw({uid,game,eventAt,eventTimePrecision='SECOND',numbers=[],secondary=[],extra={},jackpotEUR=null,betsReceived=null,receiptsEUR=null,prizesEUR=null,sourceId,sourceUrl}){
  return {
    recordUid:uid,domain:'LOTTERY',recordType:'DRAW_RESULT',jurisdiction:'ES',operator:'SELAE',provider:null,
    gameOrDraw:game,gameOrDrawId:game.toLowerCase().replace(/[^a-z0-9]+/g,'-'),poolOrTier:null,
    eventAt,eventTimePrecision,currency:'EUR',amountValue:jackpotEUR,numbers,secondary,
    metadata:{...extra,advertisedJackpotEUR:jackpotEUR,betsReceived,receiptsEUR,prizesEUR},
    sourceId,sourceUrl,sourceClass:'PRIMARY_OFFICIAL',confidence:'VERIFIED_PRIMARY',archivePartition:`ES:LOTTERY:${game.replace(/\s+/g,'_').toUpperCase()}:${eventAt.slice(0,4)}`
  };
}

export const LIBRARY_BOOTSTRAP_RECORDS=[
  draw({uid:'es:selae:euromillones:2026-08-21',game:'Euromillones',eventAt:'2026-08-21T00:00:00+02:00',eventTimePrecision:'DATE_ONLY',numbers:[10,14,15,19,45],secondary:[4,12],extra:{elMillon:'FJW72362'},jackpotEUR:49000000,betsReceived:4258575,receiptsEUR:9368865,prizesEUR:4684432.50,sourceId:'es-selae-results',sourceUrl:'https://www.loteriasyapuestas.es/es/euromillones/resultados/euromillones-resultados-del-21-de-agosto-de-2026'}),
  draw({uid:'es:selae:primitiva:2026-08-22',game:'La Primitiva',eventAt:'2026-08-22T21:50:09+02:00',numbers:[5,22,30,34,45,49],secondary:[46,8],extra:{complementario:46,reintegro:8,joker:'8352771'},jackpotEUR:2300000,betsReceived:9492899,receiptsEUR:9492899,prizesEUR:5221094.45,sourceId:'es-selae-results',sourceUrl:'https://www.loteriasyapuestas.es/es/resultados'}),
  draw({uid:'es:selae:bonoloto:2026-08-22',game:'Bonoloto',eventAt:'2026-08-22T21:35:09+02:00',numbers:[6,16,18,19,32,43],secondary:[8,1],extra:{complementario:8,reintegro:1},jackpotEUR:2400000,betsReceived:5510046,receiptsEUR:2755023,prizesEUR:1515262.65,sourceId:'es-selae-results',sourceUrl:'https://www.loteriasyapuestas.es/es/resultados'}),
  draw({uid:'es:selae:primitiva:2026-08-08',game:'La Primitiva',eventAt:'2026-08-08T21:50:09+02:00',numbers:[12,21,25,26,43,49],secondary:[19,2],extra:{complementario:19,reintegro:2,joker:'8880558'},sourceId:'es-selae-primitiva-feed',sourceUrl:'https://www.loteriasyapuestas.es/es/la-primitiva/resultados/la-primitiva-resultados-del-08-de-agosto-de-2026'}),
  draw({uid:'es:selae:bonoloto:2026-08-08',game:'Bonoloto',eventAt:'2026-08-08T21:34:58+02:00',numbers:[19,30,35,38,43,46],secondary:[3,2],extra:{complementario:3,reintegro:2},sourceId:'es-selae-results',sourceUrl:'https://www.loteriasyapuestas.es/es/bonoloto/resultados/bonoloto-resultados-del-08-de-agosto-de-2026'}),
  draw({uid:'es:selae:euromillones:2026-08-14',game:'Euromillones',eventAt:'2026-08-14T21:24:10+02:00',numbers:[5,29,39,48,49],secondary:[4,8],extra:{elMillon:'FFW60872'},sourceId:'es-selae-euromillones-results',sourceUrl:'https://www.loteriasyapuestas.es/es/euromillones/resultados/euromillones-resultados-del-14-de-agosto-de-2026'}),
  draw({uid:'es:selae:euromillones:2026-07-10',game:'Euromillones',eventAt:'2026-07-10T21:30:09+02:00',numbers:[2,14,28,33,48],secondary:[8,10],extra:{elMillon:'DNK04598'},sourceId:'es-selae-euromillones-results',sourceUrl:'https://www.loteriasyapuestas.es/es/euromillones/resultados/euromillones-resultados-del-10-de-julio-de-2026'}),
  ...[
    ['2026-06-30',[12,19,34,44,50],[3,8]],['2026-06-26',[17,25,35,39,41],[5,9]],['2026-06-23',[24,27,43,48,50],[4,12]],
    ['2026-06-19',[16,27,37,42,45],[5,12]],['2026-06-16',[9,26,29,37,42],[1,7]],['2026-06-12',[2,4,14,18,28],[9,11]],
    ['2026-06-09',[1,14,22,39,48],[8,11]],['2026-06-05',[21,23,44,47,50],[1,7]],['2026-06-02',[2,36,38,40,46],[7,8]]
  ].map(([date,numbers,secondary])=>({
    recordUid:`es:once:eurojackpot:${date}`,domain:'LOTTERY',recordType:'DRAW_RESULT',jurisdiction:'ES',operator:'ONCE',provider:'Eurojackpot',
    gameOrDraw:'Eurojackpot',gameOrDrawId:'eurojackpot',poolOrTier:null,eventAt:`${date}T00:00:00+02:00`,eventTimePrecision:'DATE_ONLY',currency:'EUR',amountValue:null,numbers,secondary,
    metadata:{officialMonthlyArchive:true},sourceId:'es-once-eurojackpot-history',sourceUrl:'https://www.juegosonce.es/historico-resultados-eurojackpot-junio-2026',sourceClass:'PRIMARY_OFFICIAL',confidence:'VERIFIED_PRIMARY',archivePartition:`ES:LOTTERY:EUROJACKPOT:${date.slice(0,4)}`
  }))
];
