export function parseSpanishEuro(text){
  const s=String(text??'').trim().replace(/\s/g,'');
  if(!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$/.test(s)&&!/^\d+(?:,\d{1,2})?$/.test(s))return null;
  const n=Number(s.replace(/\./g,'').replace(',','.'));
  return Number.isFinite(n)&&n>=0?n:null;
}

export function extractJackpotAmountNearLabel(html,label){
  const raw=String(html??'');
  const decoded=raw.replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€');
  const plain=decoded.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  const i=plain.toLowerCase().indexOf(String(label??'').toLowerCase());
  if(i<0)return null;
  const after=plain.slice(i+String(label).length,i+String(label).length+500);
  const before=plain.slice(Math.max(0,i-250),i);
  const rx=/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*€/g;
  const candidates=[];
  for(const [segment,side] of [[after,'AFTER'],[before,'BEFORE']]){
    let m;while((m=rx.exec(segment))!==null){const value=parseSpanishEuro(m[1]);if(value!==null)candidates.push({value,side,distance:side==='AFTER'?m.index:segment.length-(m.index+m[0].length)});}
    rx.lastIndex=0;
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>a.distance-b.distance||(a.side==='AFTER'?-1:1));
  const best=candidates[0];
  return {amountEUR:best.value,side:best.side,distanceChars:best.distance,label:String(label)};
}
