import { useEffect } from 'react';

// Hält den Bildschirm wach, solange `active` true ist.
// Funktioniert nur in einem sicheren Kontext (HTTPS oder localhost).
export default function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    let cancelled = false;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        lock = null;
      }
      if (cancelled) lock?.release();
    };

    // Das System gibt den Lock frei, wenn der Tab in den Hintergrund geht
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release();
    };
  }, [active]);
}
