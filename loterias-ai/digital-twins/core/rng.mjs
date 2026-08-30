export function createRng(seed=0x9e3779b9){
  let x=(Number(seed)>>>0)||0x9e3779b9;
  return ()=>{
    x^=x<<13; x^=x>>>17; x^=x<<5; x>>>=0;
    return x/0x100000000;
  };
}
