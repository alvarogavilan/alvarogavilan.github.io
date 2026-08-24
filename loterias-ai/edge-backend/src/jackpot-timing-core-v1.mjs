export function finite(v){return v!==null&&v!==undefined&&Number.isFinite(Number(v));}
export function quantile(values,q){
  const a=values.filter(finite).map(Number).sort((x,y)=>x-y);
  if(!a.length)return null;
  if(a.length===1)return a[0];
  const pos=(a.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
  return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);
}
export function summarizeDurations(values){
  const a=values.filter(finite).map(Number).filter(x=>x>=0);
  if(!a.length)return {n:0,meanMs:null,stdevMs:null,coefficientOfVariation:null,minMs:null,p10Ms:null,p25Ms:null,medianMs:null,p75Ms:null,p90Ms:null,maxMs:null};
  const meanMs=a.reduce((s,x)=>s+x,0)/a.length;
  const stdevMs=a.length<2?null:Math.sqrt(a.reduce((s,x)=>s+(x-meanMs)*(x-meanMs),0)/(a.length-1));
  return {n:a.length,meanMs,stdevMs,coefficientOfVariation:meanMs>0&&stdevMs!==null?stdevMs/meanMs:null,minMs:Math.min(...a),p10Ms:quantile(a,.10),p25Ms:quantile(a,.25),medianMs:quantile(a,.50),p75Ms:quantile(a,.75),p90Ms:quantile(a,.90),maxMs:Math.max(...a)};
}
export function elapsedPercentile(durations,elapsedMs){
  const a=durations.filter(finite).map(Number).filter(x=>x>=0);
  if(!a.length||!finite(elapsedMs)||Number(elapsedMs)<0)return null;
  return a.filter(x=>x<=Number(elapsedMs)).length/a.length;
}
