/* Loterías AI — Archive Integrity Engine */
(function(root){
  'use strict';
  function dateKey(x){ return String(x && x.drawDate || ''); }
  function idKey(x){ return String(x && x.drawId || ''); }
  function analyze(records){
    const rows=Array.isArray(records)?records:[];
    const ids=new Set(), dates=new Set(), checksums=new Set();
    const issues=[];
    let validated=0, official=0;
    for(let i=0;i<rows.length;i++){
      const r=rows[i]||{};
      if(!idKey(r)) issues.push({index:i,type:'missing_draw_id'});
      else if(ids.has(idKey(r))) issues.push({index:i,type:'duplicate_draw_id',value:idKey(r)}); else ids.add(idKey(r));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey(r))) issues.push({index:i,type:'invalid_date'}); else dates.add(dateKey(r));
      if(r.checksum){ if(checksums.has(r.checksum)) issues.push({index:i,type:'duplicate_checksum'}); checksums.add(r.checksum); }
      if(r.source && r.source.official===true) official++;
      if(r.verification && r.verification.status==='VALIDATED') validated++;
    }
    const ordered=rows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(dateKey(r))).slice().sort((a,b)=>dateKey(a).localeCompare(dateKey(b)));
    return {
      total:rows.length,validated,official,issues,
      earliest:ordered.length?dateKey(ordered[0]):null,
      latest:ordered.length?dateKey(ordered[ordered.length-1]):null,
      uniqueDrawIds:ids.size,uniqueDates:dates.size,
      integrityPass:issues.length===0 && rows.length===validated,
      analyticalEligible:rows.length>0 && issues.length===0 && rows.length===validated
    };
  }
  function completeness({validatedCount,expectedCount,gaps}){
    const v=Math.max(0,Number(validatedCount)||0), e=Math.max(0,Number(expectedCount)||0), g=Array.isArray(gaps)?gaps:[];
    return {validated:v,expected:e,gaps:g,ratio:e?Math.min(1,v/e):null,state:e&&v>=e&&g.length===0?'COMPLETE_TO_EARLIEST_VERIFIABLE':g.length?'GAPS_DETECTED':v?'PARTIAL':'NOT_STARTED'};
  }
  root.LotteryArchiveIntegrity={analyze,completeness};
})(typeof window!=='undefined'?window:globalThis);