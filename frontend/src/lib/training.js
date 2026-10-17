// Trainingslogik: geschätztes 1RM und Progressionsvorschlag

// Epley-Formel; bei 1 Wdh ist das Gewicht selbst das 1RM
export function estimateOneRepMax(weight, reps) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

// "8-12" → { min: 8, max: 12 }, "5" → { min: 5, max: 5 }
export function parseTargetReps(targetReps) {
  const text = String(targetReps || '8-12');
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return { min: parseInt(range[1]), max: parseInt(range[2]) };
  const single = text.match(/(\d+)/);
  if (single) return { min: parseInt(single[1]), max: parseInt(single[1]) };
  return { min: 8, max: 12 };
}

const roundTo = (value, step) => Math.round(value / step) * step;

// Doppelte Progression auf Basis der letzten Session dieser Übung.
// history: Sätze absteigend nach Datum (wie /api/exercises/:id/history)
export function suggestNextWeight(history, currentSessionId, targetReps) {
  const sets = (history || []).filter(log =>
    log.session_id !== currentSessionId && (parseInt(log.reps) || 0) > 0
  );
  if (sets.length === 0) return null;

  const lastSessionId = sets[0].session_id;
  const lastSets = sets.filter(log => log.session_id === lastSessionId);
  const topWeight = Math.max(...lastSets.map(log => parseFloat(log.weight_kg) || 0));
  if (topWeight <= 0) return null; // Körpergewichtsübung ohne Zusatzgewicht

  const topSets = lastSets.filter(log => (parseFloat(log.weight_kg) || 0) === topWeight);
  const { min, max } = parseTargetReps(targetReps);
  const rpes = topSets.map(log => parseInt(log.rpe)).filter(Boolean);
  const maxRpe = rpes.length ? Math.max(...rpes) : null;
  const step = topWeight >= 20 ? 2.5 : 1;
  const base = { basedOn: lastSets[0].session_date, lastWeight: topWeight, targetReps: targetReps || '8-12' };

  if (topSets.every(log => log.reps >= max) && (maxRpe === null || maxRpe <= 9)) {
    return { ...base, weight: topWeight + step, action: 'increase', reason: `Alle Sätze mit ${max}+ Wdh geschafft` };
  }

  const belowMin = topSets.filter(log => log.reps < min).length;
  if (belowMin > topSets.length / 2) {
    const reduced = Math.max(step, roundTo(topWeight * 0.9, step));
    return { ...base, weight: reduced, action: 'decrease', reason: `Meist unter ${min} Wdh – etwas leichter` };
  }

  return { ...base, weight: topWeight, action: 'hold', reason: `Gewicht halten, Wdh Richtung ${max} steigern` };
}

export const formatKg = (value) =>
  (Math.round((parseFloat(value) || 0) * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
