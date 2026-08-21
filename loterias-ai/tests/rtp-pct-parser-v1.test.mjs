import assert from 'node:assert/strict';
import { parseRtpPctsFromContexts } from '../casino/archive/botemania-rtp-pct-parser-v1.mjs';

{
  const ctx=['Porcentaje de Retorno al Jugador: 95,39 (Base) Contribución al Bote: 0,38%'];
  assert.deepEqual(parseRtpPctsFromContexts(ctx),[95.39,0.38]);
}
{
  assert.deepEqual(parseRtpPctsFromContexts(['RTP: 94,85% (base)']),[94.85]);
}
{
  assert.deepEqual(parseRtpPctsFromContexts(['RTP: 94.85% (Base) Contribución al Bote: 0.60%']),[94.85,0.6]);
}
{
  const got=parseRtpPctsFromContexts(['RTP: 80,51 % - 88,21 % (Base) Contribución al Bote: 6,70%']).sort((a,b)=>a-b);
  assert.deepEqual(got,[6.7,80.51,88.21]);
}
{
  assert.deepEqual(parseRtpPctsFromContexts(['RTP: 100% 0% 950 (Base)']),[]);
}
{
  assert.deepEqual(parseRtpPctsFromContexts(null),[]);
  assert.deepEqual(parseRtpPctsFromContexts(['RTP: 95,39 (Base)','RTP: 95,39 (Base)']),[95.39]);
}
console.log('rtp-pct-parser-v1.test.mjs: PASS');
