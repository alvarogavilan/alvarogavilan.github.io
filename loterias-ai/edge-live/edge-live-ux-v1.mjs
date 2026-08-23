// EDGE LIVE presentation-only UX enhancer.
// Does not calculate or promote economic gates. It mirrors the already-rendered
// scientific decision and adds official Botemania artwork to identified lanes.

const ART_BY_NAME = new Map([
  ["Fishin' Frenzy: Jackpot King", 'https://assets.ballys.com/m/76ed09cf022ed4d0/original/es-gametiles-fishin-frenzy-jpk-fishin-frenzy-jpk-tile-25-972.webp'],
  ['Ultimate Video Poker — Jotas o Mejor Progresivo', 'https://assets.ballys.com/m/7e75074eb43be1d7/original/es-gametiles-ultimate-video-poker-ultimate-video-poker-tile-25-972.webp'],
  ['Danza de los Diamantes — Diamond Bonanza 25c', 'https://assets.ballys.com/m/6bf05c92590cc68b/original/es-gametiles-danza-de-los-diamantes-danza-de-los-diamantes-tile-25-972.webp'],
  ['Burbujas Saltarinas', 'https://assets.ballys.com/m/6f3c2297e54e8275/original/es-gametiles-bouncy-bubbles-bouncy-bubbles-tile-25-972.webp'],
  ['Tiki Templo', 'https://assets.ballys.com/m/2af47352b4975982/original/es-gametiles-tiki-templo-tiki-templo-tile-25-972.webp'],
]);

const $ = (id) => document.getElementById(id);
const text = (id) => ($(id)?.textContent || '').trim();

function decorateRadar() {
  for (const card of document.querySelectorAll('#radarList .laneCard')) {
    if (card.dataset.artDecorated === '1') continue;
    const top = card.querySelector('.laneTop');
    const title = top?.querySelector('b')?.textContent?.trim();
    if (!top || !title) continue;
    const art = ART_BY_NAME.get(title);
    const visual = art ? document.createElement('img') : document.createElement('div');
    visual.className = art ? 'laneVisual' : 'laneVisual laneVisualUnknown';
    if (art) {
      visual.src = art;
      visual.alt = title;
      visual.loading = 'lazy';
      visual.referrerPolicy = 'no-referrer';
    } else {
      visual.textContent = '?';
      visual.title = 'Arte no mostrado hasta cerrar la identidad exacta del juego';
    }
    top.prepend(visual);
    card.dataset.artDecorated = '1';
  }
}

function syncInstantSignal() {
  const box = $('instantSignal');
  if (!box) return;
  const decision = text('decision');
  const game = text('gameTitle') || 'EDGE LIVE';
  const stake = text('stakePerSpin');
  const spins = text('maxSpins');
  const expiry = text('expiry');
  const gameUrl = $('gameCard')?.href || '#';
  let mode = 'red';
  if (decision === 'JUGAR AHORA') mode = 'green';
  else if (decision === 'PREPÁRATE') mode = 'yellow';
  box.className = `instantSignal ${mode}`;
  const label = $('instantDecision');
  const detail = $('instantDetail');
  const go = $('instantGo');
  if (mode === 'green') {
    label.textContent = '🟢 JUGAR AHORA';
    detail.textContent = `${game} · ${stake} · máx. ${spins} jugadas · caduca ${expiry}`;
    go.textContent = 'ABRIR JUEGO →';
    go.href = gameUrl;
    go.hidden = false;
  } else if (mode === 'yellow') {
    label.textContent = '🟡 PREPÁRATE · NO APUESTES';
    detail.textContent = `${game} · abre el juego y espera VERDE`;
    go.textContent = 'ABRIR SIN APOSTAR →';
    go.href = gameUrl;
    go.hidden = false;
  } else {
    label.textContent = '🔴 SIN SEÑAL · 0 €';
    detail.textContent = 'No hay ninguna apuesta autorizada ahora. EDGE continúa vigilando.';
    go.hidden = true;
  }
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    decorateRadar();
    syncInstantSignal();
  });
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'class'] });
schedule();
setInterval(syncInstantSignal, 1000);
