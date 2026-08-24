export const SPAIN_RESERVED_LOTTERY_PRODUCTS=[
  {gameId:'la-primitiva',name:'La Primitiva',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/la-primitiva'},
  {gameId:'euromillones',name:'Euromillones',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/euromillones'},
  {gameId:'bonoloto',name:'Bonoloto',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/bonoloto'},
  {gameId:'el-gordo-de-la-primitiva',name:'El Gordo de la Primitiva',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/el-gordo-de-la-primitiva'},
  {gameId:'eurodreams',name:'EuroDreams',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/eurodreams'},
  {gameId:'loteria-nacional',name:'Lotería Nacional',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/loteria-nacional'},
  {gameId:'la-quiniela',name:'La Quiniela',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/la-quiniela'},
  {gameId:'el-quinigol',name:'El Quinigol',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/es/el-quinigol'},
  {gameId:'lototurf',name:'Lototurf',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/'},
  {gameId:'quintuple-plus',name:'Quíntuple Plus',operator:'SELAE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.loteriasyapuestas.es/'},
  {gameId:'eurojackpot',name:'Eurojackpot',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/eurojackpot'},
  {gameId:'cupon-diario',name:'Cupón Diario',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'cuponazo',name:'Cuponazo',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'sueldazo-fin-de-semana',name:'Sueldazo Fin de Semana',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'super-11',name:'Super 11',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'triplex',name:'Triplex',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'mi-dia',name:'Mi Día',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'dupla',name:'Dupla',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'},
  {gameId:'rascas-once',name:'Rascas ONCE',operator:'ONCE',channelClass:'SPAIN_RESERVED_LOTTERY',officialUrl:'https://www.juegosonce.es/'}
];

export const SPAIN_LICENSED_OPERATOR_DOMAINS=[
  {operatorId:'gamesys-spain-sa',operator:'GAMESYS SPAIN, S.A.',brand:'Botemanía',domain:'www.botemania.es',licenceClasses:['Máquinas de azar','Ruleta','Black Jack','Bingo','Apuestas deportivas de contrapartida','Otras apuestas de contrapartida'],dgojUrl:'https://www.ordenacionjuego.es/operadores-juego/operadores-licencia/operadores/gamesys-spain-sa'},
  {operatorId:'games-spain-operations-sa',operator:'GAMES SPAIN OPERATIONS, S.A.',brand:'Monopolycasino',domain:'www.monopolycasino.es',licenceClasses:['Máquinas de azar','Ruleta','Black Jack','Bingo','Apuestas deportivas de contrapartida','Otras apuestas de contrapartida'],dgojUrl:'https://www.ordenacionjuego.es/operadores-juego/operadores-licencia/operadores/games-spain-operations-sa'},
  {operatorId:'hillside-espana-leisure-sa',operator:'HILLSIDE ESPAÑA LEISURE, SA',brand:'bet365',domain:'casino.bet365.es',licenceClasses:['Máquinas de azar'],dgojUrl:'https://www.ordenacionjuego.es/operadores-juego/operadores-licencia/operadores'}
];

export const SPAIN_ELIGIBILITY_POLICY={
  version:'spain-playability-policy-v1',
  lotteryRule:'Only SELAE or ONCE products explicitly sold in Spain are operationally eligible.',
  onlineGamingRule:'Only games offered by an operator/domain with a current Spanish DGOJ title habilitante for the corresponding game class are operationally eligible.',
  foreignLotteryRule:'Foreign lottery histories such as Powerball, Mega Millions, UK Lotto or French LOTO are excluded from the operational library unless the exact product is officially commercialised in Spain by SELAE or ONCE.',
  crossMarketResearchRule:'Foreign technical evidence may exist only outside the playable catalogue and may never satisfy Spain identity, rules, threshold or execution gates.',
  hardGuards:{
    jurisdictionMustBeSpainForOperationalLibrary:true,
    exactProductMustBePlayableFromSpain:true,
    lotteryOperatorMustBeSELAEOrONCE:true,
    onlineOperatorMustHaveDGOJTitle:true,
    foreignLotteryHistoryRejectedByDefault:true,
    foreignEvidenceCannotEnableExecution:true,
    executionContractRemainsSoleGreenAuthority:true
  }
};
