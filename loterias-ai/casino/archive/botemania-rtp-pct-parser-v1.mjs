// Shared, unit-tested RTP percentage parser for Botemania rules-page text
// contexts.
//
// Bug this fixes: Botemania's own page markup does not always attach a
// literal "%" to the base RTP figure. La Isla de Tiki Trópico Dorado's page
// says "Porcentaje de Retorno al Jugador: 95,39 (Base)" - no "%" next to
// 95,39 at all - while the contribution on the SAME page ("Contribución al
// Bote: 0,38%") does have one. A regex that requires a trailing "%" silently
// drops the base figure in that case (rtpPcts ended up [0.38], missing the
// base entirely, so baseRtpPct downstream became null even though the real
// text clearly states 95.39).
//
// Fix: accept either a trailing "%" or a trailing "(Base)"/"(base)" as a
// valid RTP terminator. rtpContexts is already pre-filtered to windows found
// near "Porcentaje de Retorno al Jugador"/"RTP". Percentage decimals may be
// written with either Spanish comma or a dot; neither form is a thousands
// separator here because valid RTP values are constrained to (0,100).
const dec = (s) => Number(String(s).replace(',', '.'));

export function parseRtpPctsFromContexts(rtpContexts) {
  const out = new Set();
  for (const c of rtpContexts || []) {
    for (const m of String(c).matchAll(/(?<!\d)(\d{1,2}(?:[.,]\d{1,3})?)\s*(?:%|\(base\))/gi)) {
      const v = dec(m[1]);
      if (v > 0 && v < 100) out.add(v);
    }
  }
  return [...out];
}
