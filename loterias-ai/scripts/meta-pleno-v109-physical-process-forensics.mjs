import fs from 'node:fs';

const OUT='loterias-ai/data/research/meta-pleno-v109-physical-process-forensics.json';

const sources=[
  {
    id:'SELAE-BONOLOTO-NORMATIVA',
    authority:'SELAE',
    title:'Normas que regulan el juego BonoLoto',
    url:'https://www.loteriasyapuestas.es/es/normativa/normativa-de-los-juegos/bonoloto',
    observed:[
      'SELAE publishes an official Bonoloto regulations entry point.'
    ],
    machineId:false,
    ballSetId:false,
    ballReplacementDate:false,
    incidentHistory:false
  },
  {
    id:'BOE-A-2023-21775',
    authority:'BOE / IGAE / SELAE',
    title:'Resolucion de 18 de octubre de 2023 sobre asistencia a actos preparatorios y ejecutivos de sorteos',
    url:'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-21775',
    effectiveContext:'published 2023-10-23; agreement amendment dated 2023-10-11',
    observed:[
      'Public oversight covers preparatory and executive draw acts and applicable procedures.',
      'The published schedule lists Bonoloto draws Monday through Saturday at 21:30.',
      'SELAE communicates the scrutiny centre and schedule to the monitoring commission.',
      'Procedure changes affecting independent oversight are to be communicated to the relevant IGAE officials.'
    ],
    machineId:false,
    ballSetId:false,
    ballReplacementDate:false,
    incidentHistory:false
  }
];

const metadataCoverage={
  game:'bonoloto',
  fields:{
    machineId:{publicHistoricalSeries:false,status:'ABSENT_IN_AUDITED_PUBLIC_SOURCES'},
    ballSetId:{publicHistoricalSeries:false,status:'ABSENT_IN_AUDITED_PUBLIC_SOURCES'},
    machineChangeDate:{publicHistoricalSeries:false,status:'ABSENT_IN_AUDITED_PUBLIC_SOURCES'},
    ballReplacementDate:{publicHistoricalSeries:false,status:'ABSENT_IN_AUDITED_PUBLIC_SOURCES'},
    incidentLog:{publicHistoricalSeries:false,status:'ABSENT_IN_AUDITED_PUBLIC_SOURCES'},
    drawRoom:{publicHistoricalSeries:false,status:'NOT_RESOLVED_AS_DRAW_LEVEL_SERIES'},
    operatorIdentity:{publicHistoricalSeries:false,status:'NOT_RESOLVED_AS_DRAW_LEVEL_SERIES'},
    oversightProcedure:{publicEvidence:true,status:'PARTIAL_PUBLIC_PROCEDURAL_EVIDENCE'},
    drawSchedule:{publicEvidence:true,status:'PUBLIC_REGIME_EVIDENCE_AVAILABLE'}
  }
};

const regimeRegistry=[
  {
    regimeId:'PUBLIC-PROCEDURE-2023-10',
    evidenceSource:'BOE-A-2023-21775',
    from:'2023-10-23',
    to:null,
    usableForPrediction:false,
    reason:'This is a public procedural/schedule boundary, not evidence of a distinct machine or ball population. It must not be converted into a hardware regime without draw-level physical metadata.'
  }
];

const out={
  engine:'MetaPleno-v109-physical-process-forensics',
  asOf:'2026-08-15',
  purpose:'Audit whether public official sources support leakage-free physical-regime modelling before any machine/ball conditioned lottery experiment.',
  scientificStatus:'PHYSICAL_HARDWARE_SERIES_NOT_AVAILABLE_FROM_AUDITED_PUBLIC_SOURCES',
  sources,
  metadataCoverage,
  regimeRegistry,
  gates:{
    inventMetadata:false,
    hardwareConditionedBacktestAllowed:false,
    reason:'No verified draw-level historical machine ID, ball-set ID, replacement-date or incident series has been established.',
    futureUnlock:'Only enable hardware-conditioned models after an official or independently auditable draw-level series is acquired and frozen before evaluation.'
  },
  searchAccounting:{
    nominalConfigurations:0,
    mathematicallyEffectiveConfigurations:0,
    candidatePool:0,
    criterion:'metadata availability audit only; no predictive candidate selected',
    selectionPeriod:null,
    laterPeriods:[],
    familiesInvestigated:['physical-process-metadata-audit']
  },
  budget:{maxEURPerGameDraw:15,realStakeEUR:0},
  realMoneyPass:false,
  decision:'DO_NOT_FABRICATE_PHYSICAL_REGIMES'
};

fs.mkdirSync('loterias-ai/data/research',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({engine:out.engine,status:out.scientificStatus,decision:out.decision}));
