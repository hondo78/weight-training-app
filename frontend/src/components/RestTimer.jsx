import { useEffect, useRef, useState } from 'react';
import { Hourglass, X } from 'lucide-react';

let audioContext = null;

function beep() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    [0, 0.25, 0.5].forEach((offset) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, audioContext.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + offset + 0.2);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(audioContext.currentTime + offset);
      osc.stop(audioContext.currentTime + offset + 0.2);
    });
  } catch {
    // Kein Audio verfügbar
  }
  navigator.vibrate?.([200, 100, 200, 100, 200]);
}

// Bei einer Nutzeraktion aufrufen, damit der Browser später Ton abspielen darf
export function unlockAudio() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
  } catch {
    // ignorieren
  }
}

const format = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// timer: { endsAt (ms), total (s), label } | null
export default function RestTimer({ timer, onChange, onClose }) {
  const [now, setNow] = useState(Date.now());
  const firedFor = useRef(null);

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer]);

  const remaining = timer ? (timer.endsAt - now) / 1000 : 0;
  const finished = timer && remaining <= 0;

  useEffect(() => {
    if (finished && firedFor.current !== timer.endsAt) {
      firedFor.current = timer.endsAt;
      beep();
      const hide = setTimeout(onClose, 8000);
      return () => clearTimeout(hide);
    }
  }, [finished, timer, onClose]);

  if (!timer) return null;

  const progress = Math.min(1, Math.max(0, 1 - remaining / timer.total));
  const adjust = (delta) => {
    const endsAt = Math.max(Date.now(), timer.endsAt + delta * 1000);
    onChange({ ...timer, endsAt, total: Math.max(1, timer.total + delta) });
  };

  return (
    <div className="fixed left-0 right-0 bottom-20 md:bottom-4 md:left-20 lg:left-64 z-40 px-4 pointer-events-none">
      <div className={`max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl pointer-events-auto border ${
        finished ? 'bg-rust-600 border-rust-400' : 'bg-iron-900 border-iron-700'
      }`}>
        <div className="flex items-center gap-3 p-3">
          <Hourglass className={`w-5 h-5 shrink-0 ${finished ? 'text-white' : 'text-rust-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs truncate ${finished ? 'text-white/80' : 'text-iron-400'}`}>
              {finished ? 'Pause vorbei – nächster Satz!' : `Pause · ${timer.label}`}
            </p>
            <p className="metric-value text-2xl text-white leading-tight">{format(remaining)}</p>
          </div>
          {!finished && (
            <>
              <button onClick={() => adjust(-15)} className="px-3 py-2 rounded-lg bg-iron-800 hover:bg-iron-700 text-iron-200 text-sm font-mono">
                −15
              </button>
              <button onClick={() => adjust(15)} className="px-3 py-2 rounded-lg bg-iron-800 hover:bg-iron-700 text-iron-200 text-sm font-mono">
                +15
              </button>
            </>
          )}
          <button onClick={onClose} className={`p-2 rounded-lg ${finished ? 'text-white hover:bg-white/20' : 'text-iron-400 hover:text-iron-100 hover:bg-iron-800'}`} title="Pause beenden">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-1 bg-iron-800">
          <div className="h-full bg-rust-500 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
