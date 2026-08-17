#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/data/shadow';
const OUT=path.join(ROOT,'public-attempts-v1.json');
const files=fs.readdirSync(ROOT).filter(f=>/evaluation\.json$/i.test(f)).sort();

const arr=v=>Array.isArray(v)?v.map(Number).filter(Number.isFinite):[];
const first=(...xs)=>xs.find(v=>v!==undefined&&v!==null&&v!=='');
const inferGame=f=>f.split('-202')[0].replaceAll('-',' ');
const inferDate=f=>f.match(/\d{4}-\d{2}-\d{2}/)?.[0]||null;
const num=v=>Number.isFinite(Number(v))?Number(v):null;

function normalize(file){
  let x;
  try{x=JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));}catch{return null;}
  const targetDrawDate=first(x.targetDrawDate,x.target?.drawDate,x.drawDate,inferDate(file));
  const officialMain=arr(first(x.officialResult?.main,x.target?.main,x.official?.main,x.result?.main));
  const ticketSource=Array.isArray(x.tickets)?x.tickets:Array.isArray(x.outcome?.tickets)?x.outcome.tickets:[];
  const tickets=ticketSource.map((t,i)=>({
    label:first(t.ticket,t.rank?`rank ${t.rank}`:null,`ticket ${i+1}`),
    numbers:arr(first(t.numbers,t.main)),
    mainHits:num(first(t.mainHits,t.hits)),
    complementaryHit:Boolean(first(t.complementaryHit,false)),
    classLabel:first(t.classLabel,null)
  })).filter(t=>t.numbers.length);
  const pool=arr(first(x.freeze?.pool,x.pool));
  const bestHits=num(first(x.bestResult?.mainHits,x.outcome?.mainHits,tickets.length?Math.max(...tickets.map(t=>t.mainHits??-1)):null));
  const full=Boolean(first(x.successFlags?.full6,x.outcome?.full6of6,bestHits===6));
  const theoreticalCostEUR=num(first(x.theoreticalCostEUR,x.budget?.theoreticalCostEUR,x.costEUR));
  const realStakeEUR=num(first(x.realStakeEUR,x.budget?.realStakeEUR,0));
  const prospectiveIntegrity=first(x.scientific?.prospectiveIntegrity,x.immutableSource,x.sealedBeforeResult,null);
  const causalAttribution=full?'SUCCESS':'UNKNOWN';
  const failureClass=full?'FULL_TARGET_HIT':'ATTEMPT_MISSED_TARGET';
  let learning;
  if(full) learning='El intento congelado alcanzó el objetivo principal. Requiere replicación independiente antes de inferir ventaja.';
  else if(pool.length&&bestHits!==null) learning=`El pool congelado cubrió ${bestHits} número(s) principal(es). Al no contener los seis, ninguna combinación simple formada sólo con ese pool podía alcanzar 6/6.`;
  else if(bestHits!==null) learning=`El mejor candidato congelado obtuvo ${bestHits}/6. Un intento aislado no identifica una causa ni demuestra calibración; se acumula evidencia prospectiva.`;
  else learning='El artefacto fue evaluado, pero su esquema legado no expone un contador principal normalizado. Se conserva la fuente para auditoría.';
  return {
    id:file.replace(/\.json$/i,''),
    source:`../data/shadow/${file}`,
    game:inferGame(file),
    engine:first(x.engine,x.model,x.strategy,'unknown'),
    status:first(x.status,'EVALUATED'),
    targetDrawDate,
    evaluatedAt:first(x.evaluatedAt,x.generatedAt,null),
    frozenAt:first(x.freeze?.frozenAt,x.frozenAt,null),
    sealSHA256:first(x.freeze?.sealSHA256,x.freeze?.frozenSealSHA256,x.frozenSealSHA256,x.sealSHA256,null),
    officialResult:{
      main:officialMain,
      complementary:num(first(x.officialResult?.complementary,x.target?.complementary,null)),
      reintegro:num(first(x.officialResult?.reintegro,x.target?.reintegro,null)),
      verification:first(x.officialResult?.verification,x.target?.verification,officialMain.length?'PERSISTED_RESULT':'UNKNOWN')
    },
    tickets,
    coveragePool:pool,
    bestMainHits:bestHits,
    fullTargetHit:full,
    theoreticalCostEUR,
    realStakeEUR,
    mode:realStakeEUR>0?'REAL':'PAPER',
    prospectiveIntegrity:prospectiveIntegrity===null?'UNKNOWN':Boolean(prospectiveIntegrity),
    selectionReason:first(x.selectionReason,x.hypothesis,'La selección exacta pertenece al artefacto congelado del motor. Si el esquema legado no guardó una explicación normalizada, no se reconstruye retrospectivamente.'),
    postmortem:{
      failureClass,
      causalAttribution,
      explanation:full?'Resultado principal alcanzado; la causa de cualquier ventaja sigue sin demostrarse hasta replicación.':'El resultado observado no permite afirmar por qué no acertó. Puede ser variabilidad aleatoria, señal insuficiente o un modelo sin ventaja; no se inventa causalidad.',
      learning,
      nextAction:full?'Replicar con la regla intacta en nuevos sorteos prospectivos.':'Mantener el freeze, acumular intentos comparables y juzgar la familia por su distribución prospectiva, no por una sola derrota.'
    }
  };
}

const attempts=files.map(normalize).filter(Boolean).filter(a=>a.targetDrawDate).sort((a,b)=>String(b.targetDrawDate).localeCompare(String(a.targetDrawDate))||a.id.localeCompare(b.id));
const evaluated=attempts.filter(a=>a.officialResult.main.length||a.bestMainHits!==null);
const output={
  version:'public-attempts-v1',
  generatedAt:new Date().toISOString(),
  sourcePolicy:'Generated only from persisted *evaluation.json artifacts. No result is reconstructed from chat history.',
  counts:{filesScanned:files.length,attempts:attempts.length,evaluated:evaluated.length,fullTargetHits:attempts.filter(a=>a.fullTargetHit).length,realMoneyAttempts:attempts.filter(a=>a.realStakeEUR>0).length},
  attempts
};
fs.writeFileSync(OUT,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.counts));
