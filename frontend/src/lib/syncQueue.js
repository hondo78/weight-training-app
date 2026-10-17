// Warteschlange für Satz-Updates bei schlechtem WLAN im Studio.
// PUT /api/logs/:id ist idempotent: pro URL zählt nur die letzte Änderung.

const STORAGE_KEY = 'ironlog.pendingUpdates';
const listeners = new Set();
let flushing = false;

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Speicher nicht verfügbar – Update geht im schlimmsten Fall verloren
  }
  listeners.forEach(listener => listener(Object.keys(queue).length));
}

const isRetryable = (res) => res.status >= 500;

async function send(url, body) {
  return fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function putWithRetry(url, body) {
  try {
    const res = await send(url, body);
    if (!isRetryable(res)) {
      const queue = readQueue();
      if (queue[url]) {
        delete queue[url];
        writeQueue(queue);
      }
      return { ok: res.ok, queued: false };
    }
  } catch {
    // Netzwerkfehler → in die Warteschlange
  }
  writeQueue({ ...readQueue(), [url]: { body, queuedAt: Date.now() } });
  return { ok: false, queued: true };
}

export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    for (const [url, entry] of Object.entries(readQueue())) {
      try {
        const res = await send(url, entry.body);
        if (isRetryable(res)) break;
        const queue = readQueue();
        if (queue[url]?.queuedAt === entry.queuedAt) {
          delete queue[url];
          writeQueue(queue);
        }
      } catch {
        break; // weiterhin offline
      }
    }
  } finally {
    flushing = false;
  }
}

export function pendingCount() {
  return Object.keys(readQueue()).length;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
  setInterval(() => {
    if (pendingCount() > 0) flushQueue();
  }, 15000);
  flushQueue();
}
