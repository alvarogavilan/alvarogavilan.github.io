const Z={0.90:1.6448536269514722,0.95:1.959963984540054,0.99:2.5758293035489004};
export function wilsonInterval(successes,trials,confidence=0.99){
  if(!Number.isInteger(successes)||!Number.isInteger(trials)||trials<=0||successes<0||successes>trials) throw new Error('VALID_BINOMIAL_COUNTS_REQUIRED');
  const z=Z[confidence]; if(!z) throw new Error('SUPPORTED_CONFIDENCE_REQUIRED');
  const p=successes/trials,z2=z*z,den=1+z2/trials;
  const center=(p+z2/(2*trials))/den;
  const half=z*Math.sqrt((p*(1-p)+z2/(4*trials))/trials)/den;
  return {confidence,lower:Math.max(0,center-half),center:p,upper:Math.min(1,center+half)};
}
