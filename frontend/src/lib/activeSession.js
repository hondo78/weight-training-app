// Merkt sich das laufende Training pro Gerät, damit es beim Seitenwechsel
// oder Neuladen automatisch fortgesetzt wird und die Navigation es anzeigen kann.

const STORAGE_KEY = 'ironlog.activeSession';
const listeners = new Set();

export function getActiveSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

// session: { id, started_at, plan_name } | null
export function setActiveSession(session) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: session.id,
        started_at: session.started_at,
        plan_name: session.plan_name || null
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Speicher nicht verfügbar – dann eben ohne Fortsetzen
  }
  listeners.forEach(listener => listener(getActiveSession()));
}

export function subscribeActiveSession(listener) {
  listeners.add(listener);
  const onStorage = (e) => e.key === STORAGE_KEY && listener(getActiveSession());
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}
