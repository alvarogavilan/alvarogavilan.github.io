export const SPAIN_PLAYABLE_UNIVERSE={
  version:'spain-playable-universe-v1',
  generatedAt:'2026-08-24T12:29:00+02:00',
  jurisdiction:'ES',
  purpose:'AUTHORITATIVE_SCOPE_FOR_EDGE_RESEARCH_AND_LIBRARY',
  sources:[
    {sourceId:'es-selae-help-games',authorityClass:'PRIMARY_OFFICIAL',publisher:'SELAE',url:'https://www.loteriasyapuestas.es/es/centro-de-ayuda/centro-de-informacion-y-ayuda'},
    {sourceId:'es-selae-result-feeds',authorityClass:'PRIMARY_OFFICIAL',publisher:'SELAE',url:'https://www.loteriasyapuestas.es/es/resultados-ultimos-sorteos'},
    {sourceId:'es-once-lottery',authorityClass:'PRIMARY_OFFICIAL',publisher:'ONCE',url:'https://www.juegosonce.es/loteria'},
    {sourceId:'es-once-hours',authorityClass:'PRIMARY_OFFICIAL',publisher:'ONCE',url:'https://www.juegosonce.es/horarios'},
    {sourceId:'es-dgoj-regulated-games',authorityClass:'PRIMARY_REGULATOR',publisher:'DGOJ',url:'https://www.ordenacionjuego.es/operadores-juego/juegos-regulados/juegos-sujetos-licencia'},
    {sourceId:'es-dgoj-operators',authorityClass:'PRIMARY_REGULATOR',publisher:'DGOJ',url:'https://www.ordenacionjuego.es/operadores-juego/operadores-licencia/operadores'},
    {sourceId:'es-dgoj-illegal-scope',authorityClass:'PRIMARY_REGULATOR',publisher:'DGOJ',url:'https://www.ordenacionjuego.es/participantes-juego/juego-ilegal'}
  ],
  stateReservedLotteries:{
    operators:['SELAE','ONCE'],
    selae:[
      {id:'euromillones',name:'Euromillones',extras:['El Millón']},
      {id:'la-primitiva',name:'La Primitiva',extras:['Joker']},
      {id:'bonoloto',name:'Bonoloto'},
      {id:'el-gordo-primitiva',name:'El Gordo de la Primitiva'},
      {id:'eurodreams',name:'EuroDreams'},
      {id:'loteria-nacional',name:'Lotería Nacional',extras:['Lotería de Navidad']},
      {id:'la-quiniela',name:'La Quiniela',extras:['Elige8']},
      {id:'quinigol',name:'El Quinigol'},
      {id:'lototurf',name:'Lototurf'},
      {id:'quintuple-plus',name:'Quíntuple Plus'}
    ],
    once:[
      {id:'cupon-diario',name:'Cupón Diario'},
      {id:'cuponazo',name:'Cuponazo'},
      {id:'sueldazo-fin-semana',name:'Sueldazo Fin de Semana'},
      {id:'eurojackpot',name:'Eurojackpot'},
      {id:'super-11',name:'Super 11'},
      {id:'triplex',name:'Triplex de la ONCE'},
      {id:'mi-dia',name:'Mi día de la ONCE'},
      {id:'dupla',name:'Dupla de la ONCE'},
      {id:'sorteos-extraordinarios-once',name:'Sorteos extraordinarios ONCE'},
      {id:'rascas-once',name:'Rascas ONCE',recordingMode:'INSTANT_GAME_CATALOG_AND_PRIZE_STRUCTURE'}
    ]
  },
  dgojOnlineLicensed:{
    registryObservedOperators:78,
    registryObservedAt:'2026-08-24',
    gameTypes:[
      'Apuestas cruzadas',
      'Apuestas deportivas mutuas',
      'Apuestas deportivas de contrapartida',
      'Apuestas hípicas mutuas',
      'Apuestas hípicas de contrapartida',
      'Otras apuestas de contrapartida',
      'Concursos',
      'Bingo',
      'Black Jack',
      'Juegos complementarios',
      'Máquinas de azar',
      'Póquer',
      'Punto y banca',
      'Ruleta'
    ],
    highPriorityEdgeSubclasses:[
      'SLOT_PROGRESSIVE',
      'MUST_HIT_BY',
      'MUST_WIN_BY',
      'SHARED_PROGRESSIVE',
      'PROGRESSIVE_VIDEO_POKER',
      'PERSISTENT_STATE_SLOT',
      'ROULETTE',
      'PROMOTION_PLUS_RTP',
      'BINGO_PROGRESSIVE',
      'OTHER_VERIFIABLE_POSITIVE_EV_MECHANISM'
    ]
  },
  regionalLandBased:{
    regulatorScope:'AUTONOMOUS_COMMUNITIES',
    status:'CATALOG_REQUIRED_PER_AUTONOMOUS_COMMUNITY',
    include:['casinos','salones de juego','bingo presencial','máquinas de azar presenciales','promociones y jackpots presenciales legalmente accesibles'],
    note:'DGOJ states traditional land-based gambling is regulated by each Autonomous Community; EDGE must build separate regional catalogs before claiming nationwide completeness.'
  },
  inclusionRule:'A product belongs in the operational library only if participation is legally available in Spain under an applicable Spanish/state/autonomous authorization or reserved-lottery regime.',
  foreignDataPolicy:{
    operationalLibraryAllowed:false,
    executionCandidateAllowed:false,
    allowedUse:'MECHANISM_OR_ARCHITECTURE_REFERENCE_ONLY_WHEN_EXPLICITLY_LABELED_NON_TRANSFERABLE',
    foreignHistoricalRowsInOperationalLibrary:0
  },
  hardGuards:{
    operationalLibraryJurisdictionMustBeES:true,
    nonSpanishLotteryRowsRejected:true,
    nonSpanishCasinoRowsRejected:true,
    foreignThresholdCannotBecomeSpanishThreshold:true,
    foreignHistoricalPatternCannotPromoteExecution:true,
    unknownRegionalCoverageCannotPretendNationwideCompleteness:true,
    realMoneyAllowed:false
  }
};
