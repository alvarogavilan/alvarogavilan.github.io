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

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
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
  const wantedClass = `instantSignal ${mode}`;
  if (box.className !== wantedClass) box.className = wantedClass;
  const label = $('instantDecision');
  const detail = $('instantDetail');
  const go = $('instantGo');
  if (mode === 'green') {
    setText(label, '🟢 JUGAR AHORA');
    setText(detail, `${game} · ${stake} · máx. ${spins} jugadas · caduca ${expiry}`);
    setText(go, 'ABRIR JUEGO →');
    if (go.href !== gameUrl) go.href = gameUrl;
    go.hidden = false;
  } else if (mode === 'yellow') {
    setText(label, '🟡 PREPÁRATE · NO APUESTES');
    setText(detail, `${game} · abre el juego y espera VERDE`);
    setText(go, 'ABRIR SIN APOSTAR →');
    if (go.href !== gameUrl) go.href = gameUrl;
    go.hidden = false;
  } else {
    setText(label, '🔴 SIN SEÑAL · 0 €');
    setText(detail, 'No hay ninguna apuesta autorizada ahora. EDGE continúa vigilando.');
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

// Observe only DOM content changes made by the scientific renderer. We do not
// observe attributes, so this module cannot recursively trigger itself when it
// changes signal colours, links or hidden state.
const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
schedule();
setInterval(syncInstantSignal, 1000);
