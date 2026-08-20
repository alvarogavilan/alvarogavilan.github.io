#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const URL='https://fileservice.blueprintgaming.com/?affiliate=&customer=BOTEMANIA&fileType=help&gameEngineID=irishriches&language=ES&profile=jackpotkingdeluxe3';
const OUT='loterias-ai/casino/jackpots/evidence/blueprint-botemania-irish-help-probe-v1.json';
const r=await fetch(URL,{headers:{accept:'text/html,*/*','user-agent':'loterias-ai-blueprint-botemania-irish-help-probe/1.1','cache-control':'no-cache'},redirect:'follow'});
const html=await r.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&oacute;/gi,'ó').replace(/&iacute;/gi,'í').replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&uacute;/gi,'ú').replace(/&ntilde;/gi,'ñ').replace(/\s+/g,' ').trim();
const moneyMatches=s=>[...s.matchAll(/(?:€\s*)?(\d{1,6}(?:[.,]\d{1,2})?)\s*€/g)].map(m=>({raw:m[0],value:Number(m[1].replace(',','.'))})).filter(x=>Number.isFinite(x.value));
const needles=['APUESTA TOTAL','TOTAL BET','reserva','Bote Reserva','contribución','contribution','Royal','Regal','Must Be Won','Debe ser ganado antes de','Debe ganarse antes de','jackpot','95,93','1%','1,5%'];
const contexts={};
for(const n of needles){const arr=[];let p=0,c=0,low=text.toLowerCase(),needle=n.toLowerCase();while(c<12){const at=low.indexOf(needle,p);if(at<0)break;arr.push(text.slice(Math.max(0,at-700),Math.min(text.length,at+needle.length+1300)));p=at+needle.length;c++;}contexts[n]=[...new Set(arr)];}
const euroAmounts=[...new Set(moneyMatches(text).map(x=>x.raw))].slice(0,200);
const pct=[...new Set([...text.matchAll(/\d{1,3}(?:[.,]\d+)?\s*%/g)].map(m=>m[0]))].slice(0,100);

// Fail-closed total-bet ladder extraction: only monetary values located immediately around a TOTAL BET selector instruction qualify.
const totalBetContexts=[];
for(const phrase of ['APUESTA TOTAL','TOTAL BET']){
  let p=0;const low=text.toLowerCase(),needle=phrase.toLowerCase();
  while(true){const at=low.indexOf(needle,p);if(at<0)break;const window=text.slice(Math.max(0,at-120),Math.min(text.length,at+650));const monies=moneyMatches(window);if(monies.length)totalBetContexts.push({phrase,context:window,amountsEUR:monies.map(x=>x.value)});p=at+needle.length;}
}
const exactBetValues=[...new Set(totalBetContexts.flatMap(x=>x.amountsEUR).filter(v=>v>0&&v<=1000))].sort((a,b)=>a-b);
const exactStakeLadderRecovered=exactBetValues.length>=3;

// Search both visible text and raw HTML around MBWB language. Currency-labelled numbers are required for numeric recovery.
const mbwbNeedles=['Debe ser ganado antes de','Debe ganarse antes de','Must Be Won By'];
const mustDropContexts=[];
for(const source of [{name:'visible_text',value:text},{name:'raw_html',value:html}]){
  const low=source.value.toLowerCase();
  for(const n of mbwbNeedles){let p=0,c=0,needle=n.toLowerCase();while(c<20){const at=low.indexOf(needle,p);if(at<0)break;const context=source.value.slice(Math.max(0,at-900),Math.min(source.value.length,at+needle.length+1500));const amounts=moneyMatches(context).filter(x=>x.value>=50&&x.value<10000000);const tiers=[];if(/\bRoyal\b|Bote\s+Real/i.test(context))tiers.push('ROYAL');if(/\bRegal\b|Majestuoso|Bote\s+Majestuoso/i.test(context))tiers.push('REGAL');mustDropContexts.push({source:source.name,phrase:n,tiers,amountsEUR:[...new Set(amounts.map(x=>x.value))],context:context.slice(0,3000)});p=at+needle.length;c++;}}
}
const mbwbNumericCandidates=[];
for(const row of mustDropContexts){if(row.tiers.length!==1||row.amountsEUR.length!==1)continue;mbwbNumericCandidates.push({tier:row.tiers[0],amountEUR:row.amountsEUR[0],source:row.source,phrase:row.phrase,context:row.context});}
const dedupMbwb=[...new Map(mbwbNumericCandidates.map(x=>[`${x.tier}:${x.amountEUR}`,x])).values()];
const royalValues=[...new Set(dedupMbwb.filter(x=>x.tier==='ROYAL').map(x=>x.amountEUR))];
const regalValues=[...new Set(dedupMbwb.filter(x=>x.tier==='REGAL').map(x=>x.amountEUR))];
const exactMbwbValuesRecovered=royalValues.length===1&&regalValues.length===1;

// Exact contribution split requires two explicitly labelled percentages in one contribution/reserve context; no peer or cross-operator imputation.
const splitContexts=[];
for(const m of text.matchAll(/(?:contribuci[oó]n|contribution|reserva)[\s\S]{0,500}/gi)){
  const s=m[0];const pcts=[...s.matchAll(/(\d{1,2}(?:[.,]\d+)?)\s*%/g)].map(x=>Number(x[1].replace(',','.'))).filter(Number.isFinite);if(pcts.length>=2)splitContexts.push({context:s,percentages:[...new Set(pcts)]});
}
const exactSpainContributionSplitRecovered=splitContexts.some(x=>x.percentages.length>=2&&/contribuci[oó]n|contribution/i.test(x.context)&&/reserva/i.test(x.context));

const out={
  version:'blueprint-botemania-irish-help-probe-v1.1-fail-closed',generatedAt:new Date().toISOString(),operator:'botemania-es',game:'Irish Riches Megaways: Jackpot King',
  source:{url:URL,httpStatus:r.status,ok:r.ok,finalUrl:r.url,contentType:r.headers.get('content-type'),bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),gameEngineID:'irishriches',profile:'jackpotkingdeluxe3',customer:'BOTEMANIA',language:'ES'},
  contexts,euroAmounts,pct,totalBetContexts,exactTotalBetOptionsEUR:exactStakeLadderRecovered?exactBetValues:[],mustDropContexts,mbwbNumericCandidates:dedupMbwb,exactMbwbValues:exactMbwbValuesRecovered?{ROYAL:royalValues[0],REGAL:regalValues[0]}:null,splitContexts,visibleTextPreview:text.slice(0,7500),
  decision:{
    officialBotemaniaHelpRecovered:r.ok&&text.length>1000,
    totalBetInstructionsPresent:/APUESTA TOTAL|TOTAL BET/i.test(text),
    exactStakeLadderRecovered,
    exactSpainContributionSplitRecovered,
    reserveSemanticsTextPresent:/reserva/i.test(text),
    contributionSemanticsTextPresent:/contribuci[oó]n|contribution/i.test(text),
    mustBeWonBySemanticsRecovered:/Debe ser ganado antes de|Debe ganarse antes de|Must Be Won By/i.test(text),
    exactMbwbValuesRecovered,
    realMoneyAllowed:false
  },
  guards:{officialBlueprintHostOnly:true,customerBotemania:true,languageES:true,publicUnauthenticatedOnly:true,noIntrospection:true,noPeerParameterImputation:true,noCrossOperatorSubstitution:true,noCoinValueAsTotalBet:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({source:out.source,decision:out.decision,exactTotalBetOptionsEUR:out.exactTotalBetOptionsEUR,exactMbwbValues:out.exactMbwbValues,mbwbNumericCandidates:out.mbwbNumericCandidates,pct:out.pct,euroAmounts:out.euroAmounts},null,2));
