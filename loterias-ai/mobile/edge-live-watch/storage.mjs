// Minimal IndexedDB wrapper for the EDGE Mobile watcher. Browser-only
// (uses the global `indexedDB`), not imported by the Node test suite.
const DB_NAME = 'edge-live-watch-v1';
const DB_VERSION = 1;
const SAMPLES_STORE = 'samples';
const RESETS_STORE = 'resetEvents';
const GAPS_STORE = 'gaps';
// Structurally separate from RESETS_STORE on purpose: contaminated events
// (a drop observed across a coverage gap) must never be reachable from the
// same store that JPK clean-window counting or Tiki/Alice pairing reads
// from - keeping them in a different store is a second, independent
// safeguard on top of processPoll() already never putting them in
// resetEvents in the first place.
const CONTAMINATED_STORE = 'contaminatedResetEvents';
const MAX_SAMPLES = 20000;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAMPLES_STORE)) db.createObjectStore(SAMPLES_STORE, { keyPath: 'rowId', autoIncrement: true });
      if (!db.objectStoreNames.contains(RESETS_STORE)) db.createObjectStore(RESETS_STORE, { keyPath: 'eventId' });
      if (!db.objectStoreNames.contains(GAPS_STORE)) db.createObjectStore(GAPS_STORE, { keyPath: 'gapId', autoIncrement: true });
      if (!db.objectStoreNames.contains(CONTAMINATED_STORE)) db.createObjectStore(CONTAMINATED_STORE, { keyPath: 'eventId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function addSamples(db, rows) {
  const store = tx(db, SAMPLES_STORE, 'readwrite');
  for (const r of rows) store.add(r);
  return new Promise((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

export async function trimSamples(db) {
  return new Promise((resolve, reject) => {
    const store = tx(db, SAMPLES_STORE, 'readwrite');
    const countReq = store.count();
    countReq.onsuccess = () => {
      const excess = countReq.result - MAX_SAMPLES;
      if (excess <= 0) return resolve();
      const cursorReq = store.openCursor();
      let removed = 0;
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && removed < excess) { cursor.delete(); removed++; cursor.continue(); }
        else resolve();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    };
    countReq.onerror = () => reject(countReq.error);
  });
}

export async function getAllSamples(db) {
  return new Promise((resolve, reject) => {
    const req = tx(db, SAMPLES_STORE, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addResetEvents(db, events) {
  const store = tx(db, RESETS_STORE, 'readwrite');
  for (const e of events) store.put(e);
  return new Promise((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

export async function getAllResetEvents(db) {
  return new Promise((resolve, reject) => {
    const req = tx(db, RESETS_STORE, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addGap(db, gap) {
  const store = tx(db, GAPS_STORE, 'readwrite');
  store.add(gap);
  return new Promise((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

export async function getAllGaps(db) {
  return new Promise((resolve, reject) => {
    const req = tx(db, GAPS_STORE, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addContaminatedEvents(db, events) {
  const store = tx(db, CONTAMINATED_STORE, 'readwrite');
  for (const e of events) store.put(e);
  return new Promise((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

export async function getAllContaminatedEvents(db) {
  return new Promise((resolve, reject) => {
    const req = tx(db, CONTAMINATED_STORE, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll(db) {
  for (const name of [SAMPLES_STORE, RESETS_STORE, GAPS_STORE, CONTAMINATED_STORE]) {
    await new Promise((resolve, reject) => {
      const store = tx(db, name, 'readwrite');
      store.clear();
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }
}

export { openDb };
