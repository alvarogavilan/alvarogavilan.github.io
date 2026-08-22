import fs from 'node:fs';

const path='loterias-ai/data/probes/nacional-sales-endpoint.json';
const d=JSON.parse(fs.readFileSync(path,'utf8'));
const EPS_SERIES=1e-6;
const EPS_EUR=0.02;

function key(name){return String(name??'').trim().toLocaleLowerCase('es-ES')}

function territoryHeadroom(salesRows=[],consignationRows=[],level){
  const sales=new Map(salesRows.map(x=>[key(x.name),x]));
  const consignation=new Map(consignationRows.map(x=>[key(x.name),x]));
  const names=[...new Set([...sales.keys(),...consignation.keys()])].sort();
  return names.map(k=>{
    const s=sales.get(k)||null;
    const c=consignation.get(k)||null;
    if(!s||!c){
      return {
        level,
        name:s?.name??c?.name??k,
        comparable:false,
        reason:!s?'MISSING_IN_SALES':'MISSING_IN_CONSIGNATION',
        sales:s?{series:s.series,amountEUR:s.amountEUR}:null,
        consignation:c?{series:c.series,amountEUR:c.amountEUR}:null,
        seriesHeadroom:null,
        amountHeadroomEUR:null
      };
    }
    return {
      level,
      name:s.name,
      comparable:true,
      sales:{series:s.series,amountEUR:s.amountEUR},
      consignation:{series:c.series,amountEUR:c.amountEUR},
      seriesHeadroom:c.series-s.series,
      amountHeadroomEUR:c.amountEUR-s.amountEUR
    };
  });
}

const sales=d?.ventas;
const consignation=d?.consignacion;
const both=sales?.dataAvailable===true&&consignation?.dataAvailable===true;

const provinceRows=territoryHeadroom(sales?.structured?.provincias,consignation?.structured?.provincias,'province');
const communityRows=territoryHeadroom(sales?.structured?.comunidades,consignation?.structured?.comunidades,'community');

let aggregate=null;
if(both){
  const soldSeries=sales.structured?.provinceSeriesTotal??null;
  const consignedSeries=consignation.structured?.provinceSeriesTotal??null;
  const soldEUR=sales.structured?.provinceAmountEUR??null;
  const consignedEUR=consignation.structured?.provinceAmountEUR??null;
  aggregate={
    soldSeries,
    consignedSeries,
    soldAmountEUR:soldEUR,
    consignedAmountEUR:consignedEUR,
    seriesHeadroom:consignedSeries-soldSeries,
    amountHeadroomEUR:consignedEUR-soldEUR,
    seriesTolerance:EPS_SERIES,
    amountToleranceEUR:EPS_EUR,
    nonNegativeWithinTolerance:(consignedSeries-soldSeries)>=-EPS_SERIES&&(consignedEUR-soldEUR)>=-EPS_EUR
  };
}

const comparableTerritories=[...provinceRows,...communityRows].filter(x=>x.comparable);
const missingTerritories=[...provinceRows,...communityRows].filter(x=>!x.comparable);
const negativeHeadroom=comparableTerritories.filter(x=>x.seriesHeadroom<-EPS_SERIES||x.amountHeadroomEUR<-EPS_EUR);
const headroomQualityPass=both&&aggregate?.nonNegativeWithinTolerance===true&&missingTerritories.length===0&&negativeHeadroom.length===0;

d.crossSurfaceHeadroom={
  definition:'consignation-minus-sales',
  officialOnly:true,
  noInference:true,
  zeroFillMissingTerritories:false,
  aggregate,
  provinces:provinceRows,
  communities:communityRows,
  missingTerritories,
  negativeHeadroom,
  qualityPass:headroomQualityPass
};
d.aggregateHeadroomPersisted=aggregate!==null;
d.salesConsignationHeadroomRequired=true;

if(d.bothSurfacesReady===true){
  d.qualityPass=d.qualityPass===true&&headroomQualityPass;
  d.analysisReady=d.analysisReady===true&&headroomQualityPass;
  if(!headroomQualityPass){
    d.readinessReason='SALES_EXCEED_CONSIGNATION_OR_CROSS_SURFACE_RECONCILIATION_FAILED';
  }
}

fs.writeFileSync(path,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({
  drawDate:d.drawDate,
  drawId:d.drawId,
  bothSurfacesReady:d.bothSurfacesReady,
  aggregateHeadroomPersisted:d.aggregateHeadroomPersisted,
  aggregate:d.crossSurfaceHeadroom.aggregate,
  missingTerritories:d.crossSurfaceHeadroom.missingTerritories.length,
  negativeHeadroom:d.crossSurfaceHeadroom.negativeHeadroom.length,
  headroomQualityPass:d.crossSurfaceHeadroom.qualityPass,
  analysisReady:d.analysisReady,
  readinessReason:d.readinessReason
},null,2));
