/* Loterías AI — SELAE Adapter */
(function(root){
  'use strict';
  function text(v){ return v==null?'':String(v).trim(); }
  function toDateISO(s){
    const v=text(s); let m=v.match(/(\d{2})\/(\d{2})\/(\d{4})/); if(m) return `${m[3]}-${m[2]}-${m[1]}`;
    m=v.match(/(\d{4})-(\d{2})-(\d{2})/); return m?`${m[1]}-${m[2]}-${m[3]}`:null;
  }
  function uniqueNums(arr){ return [...new Set((arr||[]).map(Number).filter(Number.isFinite))]; }
  function parseNumericCombination(s){
    const nums=(text(s).match(/\b\d{1,2}\b/g)||[]).map(Number);
    return nums;
  }
  function extractPrimitivaFromDetailText(raw){
    const s=text(raw); const date=toDateISO(s);
    const comboMatch=s.match(/(?:combinaci[oó]n ganadora[^\d]*)(\d{1,2}(?:\s*[-–·,]\s*\d{1,2}){5})/i);
    const main=comboMatch?uniqueNums(parseNumericCombination(comboMatch[1])).slice(0,6):[];
    const c=s.match(/Complementario\s*[:]?\s*(?:C\()?\s*(\d{1,2})/i);
    const r=s.match(/Reintegro\s*[:]?\s*(?:R\()?\s*(\d)/i);
    return {gameId:'primitiva',drawDate:date,main,complementary:c?Number(c[1]):null,reintegro:r?Number(r[1]):null};
  }
  function parseListingDates(raw){
    const s=text(raw); const found=[]; const re=/(\d{2}\/\d{2}\/\d{4})/g; let m;
    while((m=re.exec(s))) found.push(toDateISO(m[1]));
    return [...new Set(found)].filter(Boolean).sort();
  }
  function validateNumericDraw(draw,{pick,max}){
    const issues=[]; if(!draw||!/^\d{4}-\d{2}-\d{2}$/.test(text(draw.drawDate))) issues.push('invalid_date');
    const main=Array.isArray(draw&&draw.main)?draw.main:[];
    if(main.length!==pick) issues.push('invalid_pick_count');
    if(new Set(main).size!==main.length) issues.push('duplicate_main_number');
    if(main.some(n=>!Number.isInteger(n)||n<1||n>max)) issues.push('main_out_of_range');
    return {ok:issues.length===0,issues};
  }
  function buildCanonical(draw,source){
    return {
      drawId:`${draw.gameId}-${draw.drawDate}`,
      gameId:draw.gameId,
      drawDate:draw.drawDate,
      result:{main:draw.main,complementary:draw.complementary??null,reintegro:draw.reintegro??null,extra:draw.extra??null},
      source:{official:true,provider:'SELAE',url:source&&source.url||null,format:source&&source.format||'html'},
      verification:{status:'VALIDATED_BY_PARSER',validatedAt:new Date().toISOString(),issues:[]}
    };
  }
  root.SELAEAdapter={toDateISO,parseNumericCombination,extractPrimitivaFromDetailText,parseListingDates,validateNumericDraw,buildCanonical};
})(typeof window!=='undefined'?window:globalThis);