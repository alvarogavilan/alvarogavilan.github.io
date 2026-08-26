const KEY_RE=/(new_jackpotxml\.php|webtickers|initialResources|sljp-1|tonymc|jackpotsCasino|jackpotsCasinoUrl|liveEndpointUrl|guaranteedHitTime|instanceCode|\bcurrency\b|\blocal\b|\bwinc\b)/i;
const URL_RE=/https?:\/\/[^\s"'<>]+/gi;

const uniq=a=>[...new Set(a.filter(Boolean))];
const clean=s=>String(s??'').replace(/\u0000/g,'').trim();

function maybeDecode(s){
  let v=clean(s);
  for(let i=0;i<2;i++){
    try{
      const d=decodeURIComponent(v.replace(/\+/g,' '));
      if(d===v)break;
      v=d;
    }catch{break;}
  }
  return v;
}

function textParts(entry){
  const req=entry?.request||{};
  const res=entry?.response||{};
  const out=[];
  if(req.url)out.push(['request.url',String(req.url)]);
  if(req.postData?.text)out.push(['request.postData.text',String(req.postData.text)]);
  for(const h of req.headers||[]) if(h?.name||h?.value) out.push([`request.header.${h.name||''}`,`${h.name||''}: ${h.value||''}`]);
  if(res.content?.text)out.push(['response.content.text',String(res.content.text)]);
  for(const h of res.headers||[]) if(h?.name||h?.value) out.push([`response.header.${h.name||''}`,`${h.name||''}: ${h.value||''}`]);
  return out;
}

function paramsFromUrl(url){
  const out={};
  try{
    const u=new URL(url);
    for(const [k,v] of u.searchParams){
      if(!out[k])out[k]=[];
      out[k].push(maybeDecode(v));
    }
  }catch{}
  return out;
}

function fieldCandidates(text){
  const s=maybeDecode(text);
  const fields={};
  const names=['casino','currency','local','winc','game','instanceCode','instancecode','guaranteedHitTime','jackpotsCasino','jackpotsCasinoUrl','liveEndpointUrl'];
  for(const name of names){
    const vals=[];
    const attr=new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`,'ig');
    const json=new RegExp(`["']${name}["']\\s*[:=]\\s*["']?([^"'\\s,;}<>&]+)`,'ig');
    for(const re of [attr,json]) for(const m of s.matchAll(re)) vals.push(clean(m[1]));
    if(vals.length)fields[name]=uniq(vals);
  }
  return fields;
}

function mergeFields(dst,src){
  for(const [k,vals] of Object.entries(src||{})) dst[k]=uniq([...(dst[k]||[]),...vals]);
  return dst;
}

export function analyzeBetfairSportingHar(har,{sourceName='capture.har'}={}){
  const obj=typeof har==='string'?JSON.parse(har):har;
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const relevant=[];
  const allFields={};
  const allUrls=[];

  entries.forEach((entry,index)=>{
    const parts=textParts(entry);
    const joined=parts.map(([,v])=>v).join('\n');
    if(!KEY_RE.test(maybeDecode(joined)))return;
    const requestUrl=String(entry?.request?.url||'');
    const decoded=maybeDecode(joined);
    const fields={};
    mergeFields(fields,fieldCandidates(decoded));
    const qp=paramsFromUrl(requestUrl);
    for(const [k,vals] of Object.entries(qp)){
      if(['casino','currency','local','winc','game','instanceCode','instancecode','guaranteedHitTime'].includes(k)) fields[k]=uniq([...(fields[k]||[]),...vals]);
      for(const v of vals) mergeFields(fields,fieldCandidates(v));
    }
    mergeFields(allFields,fields);
    const urls=uniq([requestUrl,...(decoded.match(URL_RE)||[])]).filter(u=>KEY_RE.test(maybeDecode(u))||/playtech|betfair|malmegas/i.test(u));
    allUrls.push(...urls);
    relevant.push({
      index,
      startedDateTime:entry?.startedDateTime||null,
      request:{method:entry?.request?.method||null,url:requestUrl||null},
      response:{status:Number.isFinite(entry?.response?.status)?entry.response.status:null,mimeType:entry?.response?.content?.mimeType||null},
      markers:{
        newJackpotXml:/new_jackpotxml\.php/i.test(decoded),
        webtickers:/webtickers/i.test(decoded),
        sljp1:/\bsljp-1\b/i.test(decoded),
        tonymc:/\btonymc\b/i.test(decoded),
        guaranteedHitTime:/\bguaranteedHitTime\b/i.test(decoded),
        initialResources:/initialResources/i.test(decoded),
      },
      fields,
      urls,
      provenance:parts.filter(([,v])=>KEY_RE.test(maybeDecode(v))).map(([where])=>where),
    });
  });

  const exactTickerEntryCandidates=relevant.filter(r=>
    r.markers.newJackpotXml && r.markers.sljp1 &&
    ((r.fields.game||[]).some(v=>/\bsljp-1\b/i.test(v)) || /(?:[?&]|%26)game(?:=|%3D)(?:sljp-1|sljp%2D1)/i.test(maybeDecode(r.request.url||'')))
  );
  const imsCandidates=uniq([
    ...(allFields.casino||[]),
    ...(allFields.jackpotsCasino||[]),
    ...(allFields.instanceCode||[]),
    ...(allFields.instancecode||[]),
  ]);
  const tickerUrlCandidates=uniq(allUrls.filter(u=>/new_jackpotxml\.php|webtickers/i.test(maybeDecode(u))));

  return {
    version:'betfair-sporting-har-discovery-v1',
    mode:'OFFLINE_PASSIVE_HAR_DISCOVERY_NO_PLAY',
    sourceName,
    entryCount:entries.length,
    relevantEntryCount:relevant.length,
    discovery:{
      imsCandidates,
      tickerUrlCandidates,
      fields:allFields,
      exactTickerEntryCandidates,
      relevantEntries:relevant,
      exactBetfairSpainTickerImsBindingVerified:false,
      currentSljp1RowRecovered:exactTickerEntryCandidates.length>0,
      currentDailyAmountExactVerified:false,
      currentGuaranteedHitTimeExactVerified:false,
    },
    scientificUse:'Offline HAR discovery only. A captured sljp-1 row is evidence of what the exact browser session requested/received, but execution remains blocked until exact Betfair Spain IMS/ticker identity, freshness, same-cycle continuity, deadline and unawarded server state are independently validated by the final gate.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,noCredentials:true,noCookiesEmitted:true,noWagerProbe:true,noAutomaticBetting:true,harEvidenceCannotAuthorizeGreen:true},
  };
}
