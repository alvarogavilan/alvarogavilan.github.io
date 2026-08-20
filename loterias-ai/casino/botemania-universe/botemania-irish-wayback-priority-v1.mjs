#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const URL='https://www.botemania.es/juegos/slots-online/irish-riches-megaways-jackpot-king';
const OUT='loterias-ai/casino/botemania-universe/evidence/botemania-irish-wayback-priority-v1.json';
const UA='loterias-ai-irish-wayback-priority/1.0';
const cdx=`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(URL)}&output=json&fl=timestamp,original,statuscode,digest,mimetype&filter=statuscode:200&filter=mimetype:text/html&collapse=digest&from=2020&to=2026`;
const cr=await fetch(cdx,{headers:{'user-agent':UA,accept:'application/json,text/plain,*/*'}});const ct=await cr.text();let table=null;try{table=JSON.parse(ct)}catch{}
const rows=Array.isArray(table)&&table.length>1?table.slice(1).map(r=>({timestamp:r[0],original:r[1],statuscode:r[2],digest:r[3],mimetype:r[4]})):[];
const selected=rows.length<=60?rows:rows.filter((_,i)=>i===0||i===rows.length-1||i%Math.ceil(rows.length/58)===0).slice(0,60);
const snapshots=[];
const textify=h=>String(h||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
const contexts=(txt,re,span=420)=>{const out=[];let m;const rg=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');while((m=rg.exec(txt))&&out.length<12){out.push(txt.slice(Math.max(0,m.index-span),Math.min(txt.length,m.index+m[0].length+span)));if(m[0].length===0)rg.lastIndex++;}return [...new Set(out)];};
for(const r of selected){const replay=`https://web.archive.org/web/${r.timestamp}id_/${r.original}`;try{const fr=await fetch(replay,{headers:{'user-agent':UA,accept:'text/html,*/*'},redirect:'follow'});const html=await fr.text(),text=textify(html);const rtp=contexts(text,/RTP|Retorno al Jugador|95[,.]93|96[,.]42|\+\s*1\s*%/gi);const contrib=contexts(text,/contribuci[oó]n|reserva|Bote Reserva|0[,.]38\s*%|0[,.]11\s*%|1[,.]5\s*%|1\s*%/gi);snapshots.push({...r,replayUrl:replay,httpStatus:fr.status,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),rtpContexts:rtp,contributionContexts:contrib});}catch(e){snapshots.push({...r,replayUrl:replay,error:String(e?.message||e)});}}
const signatures=[];for(const s of snapshots){for(const c of [...(s.rtpContexts||[]),...(s.contributionContexts||[])]){const matches=[...c.matchAll(/(?:95[,.]93|96[,.]42|0[,.]38|0[,.]11|1[,.]5|\+\s*1)\s*%?/gi)].map(x=>x[0]);signatures.push({timestamp:s.timestamp,context:c,numericTokens:[...new Set(matches)]});}}
const uniqueSignatures=[...new Map(signatures.map(x=>[x.context,x])).values()];
const hasExplicit038011=uniqueSignatures.some(x=>/0[,.]38/.test(x.context)&&/0[,.]11/.test(x.context));
const hasPlus1=uniqueSignatures.some(x=>/95[,.]93[\s€]*\+\s*1\s*%/i.test(x.context));
const hasReserve15=uniqueSignatures.some(x=>/1[,.]5\s*%[^.]{0,80}reserva|reserva[^.]{0,80}1[,.]5\s*%/i.test(x.context));
const out={version:'botemania-irish-wayback-priority-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',targetUrl:URL,cdx:{url:cdx,httpStatus:cr.status,bytes:ct.length,rows:rows.length,selected:selected.length},snapshots,uniqueSemanticContexts:uniqueSignatures,decision:{historicalSnapshotsRecovered:snapshots.some(x=>x.httpStatus===200),explicit038Plus011EverSeen:hasExplicit038011,plus1EverSeen:hasPlus1,reserve15EverSeen:hasReserve15,historicalSemanticsResolved:hasExplicit038011&&hasPlus1,economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicWaybackOnly:true,operatorPageHistoryOnly:true,noCrossOperatorSubstitution:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/botemania-universe/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({cdx:out.cdx,decision:out.decision,contexts:uniqueSignatures.slice(0,20)},null,2));
