import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, Plus, Check, Trash2, Timer, ChevronDown, X, Sparkles, WifiOff, RotateCcw,
  Info, Minus, Flag, Dumbbell, CalendarDays, Trophy, BookOpen
} from 'lucide-react';
import RestTimer, { unlockAudio } from '../components/RestTimer';
import ExercisePicker from '../components/ExercisePicker';
import ExerciseGuide from '../components/ExerciseGuide';
import { PageHeader, Spinner, EmptyState, useFeedback } from '../components/ui';
import useWakeLock from '../hooks/useWakeLock';
import { putWithRetry, subscribe, pendingCount } from '../lib/syncQueue';
import { suggestNextWeight, formatKg, parseTargetReps } from '../lib/training';
import { getActiveSession, setActiveSession as storeActiveSession, formatDuration } from '../lib/activeSession';

const API_BASE = '/api';
const DEFAULT_SETS = 3;

// Komma oder Punkt als Dezimaltrenner zulassen
const toNumber = (value) => parseFloat(String(value ?? '').replace(',', '.')) || 0;
const isDone = (log) => (parseInt(log.reps) || 0) > 0;

const formatDate = (date, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
  new Date(date).toLocaleDateString('de-DE', options);

function relativeDay(date) {
  if (!date) return null;
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(new Date(date))) / 86400000);
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 14) return 'vor 1 Woche';
  return `vor ${Math.floor(days / 7)} Wochen`;
}

// Übungsliste einer Session: Planübungen in Planreihenfolge, danach frei hinzugefügte
function buildExerciseList(planExercises, logs) {
  const list = planExercises.map(pe => ({
    id: pe.exercise_id,
    name: pe.name,
    muscle_group: pe.muscle_group,
    rest_seconds: pe.rest_seconds,
    target_reps: pe.target_reps
  }));
  const known = new Set(list.map(e => e.id));
  logs.forEach(log => {
    if (!known.has(log.exercise_id)) {
      known.add(log.exercise_id);
      list.push({ id: log.exercise_id, name: log.exercise_name, muscle_group: log.muscle_group });
    }
  });
  return list;
}

// ============ Satzzeile ============

function SetRow({ set, index, previous, placeholder, onSave }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const repsRef = useRef(null);
  // Zustand beim Antippen merken: das Blur des Eingabefelds speichert evtl. schon vor dem Klick
  const doneAtPress = useRef(null);
  const done = isDone(set);

  useEffect(() => {
    setWeight(toNumber(set.weight_kg) ? String(toNumber(set.weight_kg)).replace('.', ',') : '');
    setReps(parseInt(set.reps) > 0 ? String(set.reps) : '');
    setRpe(set.rpe ? String(set.rpe) : '');
  }, [set.weight_kg, set.reps, set.rpe]);

  const values = () => ({
    weight_kg: toNumber(weight),
    reps: parseInt(reps) || 0,
    rpe: Math.min(10, Math.max(0, parseInt(rpe) || 0)) || null
  });

  const handleBlur = () => onSave(set, values());

  // Abhaken übernimmt leere Felder aus dem Vorschlag (letzte Session / vorheriger Satz)
  const toggleDone = () => {
    const wasDone = doneAtPress.current ?? done;
    doneAtPress.current = null;
    if (wasDone) {
      onSave(set, { ...values(), reps: 0 });
      return;
    }
    const next = values();
    if (!weight && placeholder.weight) next.weight_kg = placeholder.weight;
    if (!reps && placeholder.reps) next.reps = placeholder.reps;
    if (!next.reps) {
      repsRef.current?.focus();
      return;
    }
    onSave(set, next);
  };

  return (
    <div className={`grid grid-cols-[1.75rem_3.5rem_1fr_1fr_2.75rem_2.75rem] gap-1.5 items-center px-2 py-1.5 rounded-xl transition-colors ${
      done ? 'bg-emerald-500/10' : ''
    }`}>
      <span className={`text-center text-sm font-mono font-semibold ${done ? 'text-emerald-400' : 'text-iron-500'}`}>
        {index + 1}
      </span>
      <span className="text-center text-xs text-iron-500 font-mono truncate" title="Letztes Training">
        {previous ? `${formatKg(previous.weight_kg)}×${previous.reps}` : '–'}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={`Satz ${index + 1} Gewicht in kg`}
        placeholder={placeholder.weight ? formatKg(placeholder.weight) : 'kg'}
        value={weight}
        onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
        className={`set-input ${done ? 'bg-transparent' : ''}`}
      />
      <input
        ref={repsRef}
        type="text"
        inputMode="numeric"
        aria-label={`Satz ${index + 1} Wiederholungen`}
        placeholder={placeholder.reps ? String(placeholder.reps) : 'Wdh'}
        value={reps}
        onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
        className={`set-input ${done ? 'bg-transparent' : ''}`}
      />
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Satz ${index + 1} RPE`}
        placeholder="–"
        value={rpe}
        onChange={(e) => setRpe(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={handleBlur}
        onFocus={(e) => e.target.select()}
        className={`set-input !text-sm ${done ? 'bg-transparent' : ''}`}
      />
      <button
        onPointerDown={() => { doneAtPress.current = done; }}
        onClick={toggleDone}
        aria-label={done ? 'Satz wieder öffnen' : 'Satz erledigt'}
        className={`h-11 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
          done
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
            : 'bg-iron-800 text-iron-500 hover:text-iron-200 hover:bg-iron-700'
        }`}
      >
        <Check className="w-5 h-5" strokeWidth={3} />
      </button>
    </div>
  );
}

// ============ Übungskarte ============

function ExerciseCard({ exercise, logs, sessionId, expanded, onToggle, onSaveSet, onAddSet, onRemoveLastSet, onRemoveExercise, cardRef }) {
  const [stats, setStats] = useState(null);
  const [showRpeInfo, setShowRpeInfo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const doneCount = logs.filter(isDone).length;
  const complete = logs.length > 0 && doneCount === logs.length;

  useEffect(() => {
    if (!expanded || stats) return;
    (async () => {
      try {
        const [historyRes, recordsRes] = await Promise.all([
          fetch(`${API_BASE}/exercises/${exercise.id}/history`),
          fetch(`${API_BASE}/exercises/${exercise.id}/records`)
        ]);
        const history = await historyRes.json();
        const records = await recordsRes.json();
        const previousSets = history.filter(l => l.session_id !== sessionId);
        const lastSessionId = previousSets[0]?.session_id;
        setStats({
          suggestion: suggestNextWeight(history, sessionId, exercise.target_reps),
          lastSets: previousSets.filter(l => l.session_id === lastSessionId).sort((a, b) => a.set_number - b.set_number),
          lastDate: previousSets[0]?.session_date || null,
          maxWeight: toNumber(records?.max_weight) || null,
          repsAtMax: records?.reps_at_max || null,
          bestE1rm: toNumber(records?.best_e1rm) || null
        });
      } catch (error) {
        console.error('Error loading exercise stats:', error);
        setStats({ lastSets: [] });
      }
    })();
  }, [expanded, stats, exercise.id, exercise.target_reps, sessionId]);

  const targetMin = exercise.target_reps ? parseTargetReps(exercise.target_reps).min : null;

  // Platzhalter pro Satz: vorheriger erledigter Satz dieser Session > Vorschlag > gleicher Satz vom letzten Mal
  const placeholderFor = (index) => {
    const lastTime = stats?.lastSets?.[index];
    const prevInSession = index > 0 && isDone(logs[index - 1]) ? logs[index - 1] : null;
    return {
      weight: toNumber(prevInSession?.weight_kg) || stats?.suggestion?.weight || toNumber(lastTime?.weight_kg) || null,
      reps: parseInt(lastTime?.reps) || parseInt(prevInSession?.reps) || targetMin || null
    };
  };

  const applySuggestion = () => {
    const weight = stats?.suggestion?.weight;
    if (!weight) return;
    logs.filter(l => !isDone(l) && !toNumber(l.weight_kg))
      .forEach(l => onSaveSet(exercise, l, { weight_kg: weight, reps: 0, rpe: l.rpe || null }));
  };

  return (
    <div ref={cardRef} className={`card overflow-hidden scroll-mt-40 transition-colors ${complete && !expanded ? 'opacity-70' : ''}`}>
      <div className="flex items-center hover:bg-iron-800/40 transition-colors">
        <button onClick={onToggle} className="flex-1 min-w-0 flex items-center gap-3 p-4 pr-2 text-left">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            complete ? 'bg-emerald-500 text-white' : 'bg-iron-800 text-rust-400'
          }`}>
            {complete
              ? <Check className="w-5 h-5" strokeWidth={3} />
              : <span className="font-mono font-bold text-sm">{doneCount}/{logs.length}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-iron-50 font-semibold truncate">{exercise.name}</p>
            <p className="text-iron-500 text-sm truncate">
              {exercise.muscle_group}
              {exercise.target_reps && <> · Ziel {logs.length}×{exercise.target_reps}</>}
            </p>
          </div>
          <ChevronDown className={`w-5 h-5 text-iron-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => setShowGuide(true)} className="icon-btn mr-2 shrink-0" title="Ausführung anzeigen" aria-label={`Ausführung von ${exercise.name} anzeigen`}>
          <BookOpen className="w-5 h-5" />
        </button>
      </div>
      {showGuide && <ExerciseGuide exerciseId={exercise.id} name={exercise.name} onClose={() => setShowGuide(false)} />}

      {expanded && (
        <div className="px-2 sm:px-4 pb-4">
          {/* Kennzahlen */}
          {stats && (stats.maxWeight || stats.lastDate) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-3 text-xs text-iron-400">
              {stats.lastDate && <span>Zuletzt {relativeDay(stats.lastDate)}</span>}
              {stats.maxWeight && (
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-iron-200 font-medium">{formatKg(stats.maxWeight)} kg</span>
                  {stats.repsAtMax && <>× {stats.repsAtMax}</>}
                </span>
              )}
              {stats.bestE1rm && <span>e1RM <span className="text-iron-200 font-medium">{formatKg(stats.bestE1rm)} kg</span></span>}
            </div>
          )}

          {/* Progressionsvorschlag */}
          {stats?.suggestion && (
            <div className="mx-2 mb-3 p-3 bg-rust-500/10 border border-rust-500/25 rounded-xl flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-rust-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-iron-100 text-sm">
                  Heute: <span className="font-semibold text-rust-400">{formatKg(stats.suggestion.weight)} kg</span>
                  <span className="text-iron-400"> × {stats.suggestion.targetReps}</span>
                </p>
                <p className="text-iron-500 text-xs">{stats.suggestion.reason}</p>
              </div>
              {logs.some(l => !isDone(l) && !toNumber(l.weight_kg)) && (
                <button onClick={applySuggestion} className="px-3 py-2 rounded-lg bg-rust-500 hover:bg-rust-600 text-white text-xs font-semibold shrink-0">
                  Übernehmen
                </button>
              )}
            </div>
          )}

          {/* Kopfzeile */}
          <div className="grid grid-cols-[1.75rem_3.5rem_1fr_1fr_2.75rem_2.75rem] gap-1.5 px-2 pb-1 text-[11px] uppercase tracking-wider text-iron-500 text-center">
            <span>Satz</span>
            <span>Vorher</span>
            <span>kg</span>
            <span>Wdh</span>
            <button onClick={() => setShowRpeInfo(v => !v)} className="flex items-center justify-center gap-0.5 hover:text-iron-200" aria-label="RPE erklären">
              RPE <Info className="w-3 h-3" />
            </button>
            <span />
          </div>

          {showRpeInfo && (
            <div className="mx-2 mb-2 p-3 bg-iron-800/60 rounded-xl text-xs text-iron-400 grid grid-cols-2 gap-1">
              <span className="col-span-2 text-iron-300 font-medium">RPE – gefühlte Anstrengung (optional)</span>
              <span>1–6: leicht bis moderat</span>
              <span>7: 3 Wdh Reserve</span>
              <span>8: 2 Wdh Reserve</span>
              <span>9–10: 1–0 Wdh Reserve</span>
            </div>
          )}

          <div className="space-y-0.5">
            {logs.map((log, i) => (
              <SetRow
                key={log.id}
                set={log}
                index={i}
                previous={stats?.lastSets?.[i]}
                placeholder={placeholderFor(i)}
                onSave={(set, values) => onSaveSet(exercise, set, values)}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-3 px-2">
            <button onClick={() => onAddSet(exercise)} className="btn-secondary flex-1 !py-2.5">
              <Plus className="w-4 h-4" /> Satz
            </button>
            {logs.length > 0 && (
              <button onClick={() => onRemoveLastSet(exercise)} className="btn-secondary !px-3.5" aria-label="Letzten Satz entfernen" title="Letzten Satz entfernen">
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => onRemoveExercise(exercise)} className="btn-secondary !px-3.5 hover:!text-red-400" aria-label="Übung entfernen" title="Übung aus dem Training entfernen">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Seite ============

export default function Workout() {
  const { confirm, toast } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();

  const [plans, setPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Geöffnete Session: aktiv (läuft) oder zum Nachbearbeiten
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState(null); // 'active' | 'edit' | null
  const [sessionExercises, setSessionExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const cardRefs = useRef({});

  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [restTimer, setRestTimer] = useState(null);
  const [pendingSync, setPendingSync] = useState(pendingCount());
  const [starting, setStarting] = useState(false);

  const isActive = mode === 'active';
  useWakeLock(isActive);
  useEffect(() => subscribe(setPendingSync), []);

  const startRest = useCallback((seconds, label) => {
    unlockAudio();
    setRestTimer({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  }, []);
  const closeRest = useCallback(() => setRestTimer(null), []);

  const loadSessions = useCallback(async () => {
    const res = await fetch(`${API_BASE}/sessions`);
    setRecentSessions((await res.json()).slice(0, 15));
  }, []);

  const openSession = useCallback(async (sessionId, openMode) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Session nicht gefunden');
    const data = await res.json();
    let planExercises = [];
    if (data.plan_id && openMode === 'active') {
      const planRes = await fetch(`${API_BASE}/plans/${data.plan_id}`);
      if (planRes.ok) planExercises = (await planRes.json()).exercises || [];
    }
    const list = buildExerciseList(planExercises, data.logs || []);
    setSession(data);
    setLogs(data.logs || []);
    setSessionExercises(list);
    setMode(openMode);
    // Erste Übung mit offenen Sätzen aufklappen
    const firstOpen = list.find(ex => (data.logs || []).some(l => l.exercise_id === ex.id && !isDone(l))) || list[0];
    setExpanded(new Set(openMode === 'active' && firstOpen ? [firstOpen.id] : []));
    if (openMode === 'active') storeActiveSession(data);
    window.scrollTo({ top: 0 });
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [plansRes, exercisesRes] = await Promise.all([
          fetch(`${API_BASE}/plans`),
          fetch(`${API_BASE}/exercises`),
          loadSessions()
        ]);
        const plansData = await plansRes.json();
        setPlans(plansData);
        setExercises(await exercisesRes.json());

        const planParam = parseInt(searchParams.get('plan'));
        if (planParam && plansData.some(p => p.id === planParam)) setSelectedPlan(planParam);

        // Laufendes Training dieses Geräts automatisch fortsetzen
        const stored = getActiveSession();
        if (stored?.id) {
          try {
            const data = await openSession(stored.id, 'active');
            if (data.completed_at) {
              // Auf einem anderen Gerät beendet
              storeActiveSession(null);
              setSession(null);
              setMode(null);
            }
          } catch {
            storeActiveSession(null);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isActive || !session?.started_at) return;
    const update = () => setElapsed((Date.now() - new Date(session.started_at).getTime()) / 1000);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isActive, session]);

  const closeSession = () => {
    if (mode === 'active') storeActiveSession(null);
    setSession(null);
    setMode(null);
    setLogs([]);
    setSessionExercises([]);
    setExpanded(new Set());
    setRestTimer(null);
  };

  // ---------- Session-Aktionen ----------

  const startSession = async () => {
    setStarting(true);
    unlockAudio();
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan || null,
          session_date: new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD in lokaler Zeit
        })
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      if (searchParams.has('plan')) setSearchParams({}, { replace: true });
      await openSession(created.id, 'active');
      if (!selectedPlan) setShowPicker(true);
    } catch {
      toast('Training konnte nicht gestartet werden', 'error');
    } finally {
      setStarting(false);
    }
  };

  const summary = useMemo(() => {
    const done = logs.filter(isDone);
    return {
      sets: done.length,
      total: logs.length,
      volume: done.reduce((sum, l) => sum + toNumber(l.weight_kg) * l.reps, 0),
      exercises: new Set(done.map(l => l.exercise_id)).size
    };
  }, [logs]);

  const completeSession = async (sessionId) => {
    const id = sessionId || session?.id;
    if (!id) return;
    if (!sessionId) {
      const open = summary.total - summary.sets;
      const ok = await confirm({
        title: 'Training beenden?',
        message: summary.sets === 0
          ? 'Du hast noch keinen Satz abgehakt. Das Training wird trotzdem gespeichert.'
          : `${summary.sets} Sätze aus ${summary.exercises} ${summary.exercises === 1 ? 'Übung' : 'Übungen'}, ${formatKg(summary.volume)} kg Volumen.${open > 0 ? ` ${open} offene Sätze werden ignoriert.` : ''}`,
        confirmLabel: 'Beenden'
      });
      if (!ok) return;
    }
    try {
      await fetch(`${API_BASE}/sessions/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!sessionId || sessionId === session?.id) {
        closeSession();
        toast(summary.sets > 0 ? `Stark! ${summary.sets} Sätze gespeichert` : 'Training abgeschlossen');
      } else {
        toast('Training abgeschlossen');
      }
      await loadSessions();
    } catch {
      toast('Abschließen fehlgeschlagen', 'error');
    }
  };

  const deleteSession = async (sessionId) => {
    const ok = await confirm({
      title: 'Training löschen?',
      message: 'Alle Sätze dieses Trainings werden entfernt. Das kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Löschen',
      danger: true
    });
    if (!ok) return;
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
      if (session?.id === sessionId) closeSession();
      await loadSessions();
      toast('Training gelöscht');
    } catch {
      toast('Löschen fehlgeschlagen', 'error');
    }
  };

  // ---------- Satz-Aktionen ----------

  const logsFor = (exerciseId) =>
    logs.filter(l => l.exercise_id === exerciseId).sort((a, b) => a.set_number - b.set_number || a.id - b.id);

  const createSets = async (exercise, count, startNumber, weight = 0) => {
    const created = [];
    for (let i = 0; i < count; i++) {
      const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          exercise_id: exercise.id,
          set_number: startNumber + i,
          weight_kg: weight,
          reps: 0
        })
      });
      if (!res.ok) throw new Error();
      created.push({ ...(await res.json()), exercise_name: exercise.name, muscle_group: exercise.muscle_group });
    }
    setLogs(current => [...current, ...created]);
  };

  const expandNext = (exerciseId, updatedLogs) => {
    const idx = sessionExercises.findIndex(e => e.id === exerciseId);
    const next = sessionExercises.slice(idx + 1).concat(sessionExercises.slice(0, idx))
      .find(e => updatedLogs.some(l => l.exercise_id === e.id && !isDone(l)));
    setExpanded(current => {
      const s = new Set(current);
      s.delete(exerciseId);
      if (next) s.add(next.id);
      return s;
    });
    if (next) {
      setTimeout(() => cardRefs.current[next.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  };

  const saveSet = (exercise, set, values) => {
    const previous = logs.find(l => l.id === set.id);
    if (!previous) return;
    const unchanged = toNumber(previous.weight_kg) === values.weight_kg &&
      (parseInt(previous.reps) || 0) === values.reps &&
      (previous.rpe || null) === values.rpe;
    if (unchanged) return;

    const updatedLogs = logs.map(l => (l.id === set.id ? { ...l, ...values } : l));
    setLogs(updatedLogs);

    const justDone = !isDone(previous) && values.reps > 0;
    if (justDone && isActive) {
      const exerciseLogs = updatedLogs.filter(l => l.exercise_id === exercise.id);
      if (exerciseLogs.every(isDone)) {
        expandNext(exercise.id, updatedLogs);
        if (updatedLogs.every(isDone)) {
          toast('Alle Sätze erledigt – Training beenden?', 'info');
        } else {
          startRest(exercise.rest_seconds || 90, exercise.name);
        }
      } else {
        startRest(exercise.rest_seconds || 90, exercise.name);
      }
    }

    putWithRetry(`${API_BASE}/logs/${set.id}`, values);
  };

  const addSet = async (exercise) => {
    const existing = logsFor(exercise.id);
    const last = existing[existing.length - 1];
    try {
      await createSets(exercise, 1, (last?.set_number || 0) + 1, toNumber(last?.weight_kg));
    } catch {
      toast('Satz konnte nicht angelegt werden', 'error');
    }
  };

  const removeSets = async (setIds) => {
    await Promise.all(setIds.map(id => fetch(`${API_BASE}/logs/${id}`, { method: 'DELETE' })));
    setLogs(current => current.filter(l => !setIds.includes(l.id)));
  };

  const removeLastSet = async (exercise) => {
    const existing = logsFor(exercise.id);
    const last = existing[existing.length - 1];
    if (!last) return;
    if (isDone(last) && !(await confirm({ title: 'Satz entfernen?', message: `Satz ${existing.length} (${formatKg(last.weight_kg)} kg × ${last.reps}) wird gelöscht.`, confirmLabel: 'Entfernen', danger: true }))) return;
    await removeSets([last.id]);
  };

  const removeExercise = async (exercise) => {
    const existing = logsFor(exercise.id);
    if (existing.some(isDone) && !(await confirm({
      title: `${exercise.name} entfernen?`,
      message: `${existing.filter(isDone).length} erledigte Sätze werden gelöscht.`,
      confirmLabel: 'Entfernen',
      danger: true
    }))) return;
    await removeSets(existing.map(l => l.id));
    setSessionExercises(current => current.filter(e => e.id !== exercise.id));
  };

  const addExerciseToSession = async (exercise) => {
    setShowPicker(false);
    const entry = { id: exercise.id, name: exercise.name, muscle_group: exercise.muscle_group };
    setSessionExercises(current => [...current, entry]);
    setExpanded(current => new Set(isActive ? [entry.id] : [...current, entry.id]));
    try {
      await createSets(entry, DEFAULT_SETS, 1);
      setTimeout(() => cardRefs.current[entry.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } catch {
      toast('Übung konnte nicht hinzugefügt werden', 'error');
    }
  };

  const toggleExpanded = (id) => setExpanded(current => {
    const s = new Set(current);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  // ============ Render ============

  if (loading) return <Spinner fullPage />;

  if (session) {
    const progress = summary.total ? summary.sets / summary.total : 0;
    return (
      <div className="max-w-3xl mx-auto">
        {/* Kopf bleibt beim Scrollen sichtbar */}
        <div className="sticky top-0 z-30 px-4 md:px-6 lg:px-8 pt-3 md:pt-6 pb-3 bg-iron-950/85 backdrop-blur-md">
          {isActive ? (
            <div className="rounded-2xl p-4 bg-gradient-to-br from-rust-500 to-rust-600 shadow-xl shadow-rust-900/30">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-xs uppercase tracking-wider truncate">{session.plan_name || 'Freies Training'}</p>
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-white/90" />
                    <span className="metric-value text-3xl text-white">{formatDuration(elapsed)}</span>
                  </div>
                </div>
                <button onClick={() => completeSession()} className="bg-white text-rust-600 hover:bg-white/90 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-lg">
                  <Flag className="w-4 h-4" />
                  Beenden
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-black/20 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
                </div>
                <span className="text-white/90 text-xs font-mono">{summary.sets}/{summary.total} Sätze</span>
              </div>
              {pendingSync > 0 && (
                <p className="flex items-center gap-1 text-white/90 text-xs mt-2">
                  <WifiOff className="w-3.5 h-3.5" />
                  {pendingSync} {pendingSync === 1 ? 'Satz wartet' : 'Sätze warten'} auf Verbindung
                </p>
              )}
            </div>
          ) : (
            <div className="card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-iron-500 text-xs uppercase tracking-wider">Training bearbeiten</p>
                <p className="text-iron-50 font-semibold truncate">
                  {session.plan_name || 'Freies Training'} · {formatDate(session.session_date)}
                </p>
              </div>
              {!session.completed_at && (
                <button onClick={() => completeSession(session.id)} className="icon-btn hover:!text-emerald-400" title="Abschließen" aria-label="Abschließen">
                  <Check className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => deleteSession(session.id)} className="icon-btn hover:!text-red-400" title="Löschen" aria-label="Training löschen">
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={closeSession} className="btn-secondary !py-2">
                <X className="w-4 h-4" /> Fertig
              </button>
            </div>
          )}
        </div>

        <div className="px-4 md:px-6 lg:px-8 pb-6">
          <div className="space-y-3 mb-4">
            {sessionExercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                cardRef={(el) => { cardRefs.current[exercise.id] = el; }}
                exercise={exercise}
                logs={logsFor(exercise.id)}
                sessionId={session.id}
                expanded={expanded.has(exercise.id)}
                onToggle={() => toggleExpanded(exercise.id)}
                onSaveSet={saveSet}
                onAddSet={addSet}
                onRemoveLastSet={removeLastSet}
                onRemoveExercise={removeExercise}
              />
            ))}
          </div>

          {sessionExercises.length === 0 && (
            <div className="card mb-4">
              <EmptyState icon={Dumbbell} title="Noch keine Übungen" text="Füge die erste Übung hinzu – drei Sätze werden automatisch angelegt." />
            </div>
          )}

          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-4 border-2 border-dashed border-iron-700 rounded-2xl text-iron-400 hover:border-rust-500 hover:text-rust-400 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Übung hinzufügen
          </button>

          {restTimer && <div className="h-24" />}
        </div>

        {isActive && <RestTimer timer={restTimer} onChange={setRestTimer} onClose={closeRest} />}

        {showPicker && (
          <ExercisePicker
            exercises={exercises}
            excludeIds={sessionExercises.map(e => e.id)}
            onSelect={addExerciseToSession}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    );
  }

  // ---------- Übersicht ----------
  const openSessions = recentSessions.filter(s => !s.completed_at);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Training" subtitle="Plan wählen und loslegen" />

      {openSessions.length > 0 && (
        <div className="card p-4 mb-4 flex items-center gap-3 border-amber-500/30">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-iron-100 font-medium truncate">{openSessions[0].plan_name || 'Freies Training'} ist noch offen</p>
            <p className="text-iron-500 text-sm">{formatDate(openSessions[0].session_date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={() => openSession(openSessions[0].id, 'active')} className="btn-primary !py-2">
            Fortsetzen
          </button>
        </div>
      )}

      {/* Plan wählen */}
      <section className="card p-4 md:p-5 mb-6">
        <h2 className="section-title text-iron-400 text-sm mb-3">Neues Training</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {plans.map(plan => {
            const selected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(selected ? null : plan.id)}
                className={`text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${
                  selected
                    ? 'border-rust-500 bg-rust-500/15 ring-1 ring-rust-500'
                    : 'border-white/[0.06] bg-iron-800/60 hover:bg-iron-800'
                }`}
              >
                <p className={`font-semibold truncate ${selected ? 'text-rust-300' : 'text-iron-100'}`}>{plan.name}</p>
                <p className="text-iron-500 text-xs mt-0.5">
                  {plan.exercise_count} Übungen{plan.last_used && ` · ${relativeDay(plan.last_used)}`}
                </p>
              </button>
            );
          })}
          <button
            onClick={() => setSelectedPlan(null)}
            className={`text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${
              selectedPlan === null
                ? 'border-rust-500 bg-rust-500/15 ring-1 ring-rust-500'
                : 'border-dashed border-iron-700 hover:bg-iron-800'
            }`}
          >
            <p className={`font-semibold ${selectedPlan === null ? 'text-rust-300' : 'text-iron-100'}`}>Frei</p>
            <p className="text-iron-500 text-xs mt-0.5">Übungen selbst wählen</p>
          </button>
        </div>

        <button onClick={startSession} disabled={starting} className="btn-primary w-full !py-3.5 text-lg">
          <Play className="w-5 h-5" fill="currentColor" />
          {starting ? 'Starte…' : selectedPlan ? `${plans.find(p => p.id === selectedPlan)?.name} starten` : 'Freies Training starten'}
        </button>
      </section>

      {/* Verlauf */}
      <section className="card p-2 md:p-3">
        <h2 className="section-title text-iron-400 text-sm px-3 pt-3 pb-2">Letzte Trainings</h2>
        {recentSessions.length > 0 ? (
          <ul>
            {recentSessions.map(s => (
              <li key={s.id} className="flex items-center gap-3 p-2 md:p-3 rounded-xl hover:bg-iron-800/50 transition-colors group">
                <button onClick={() => openSession(s.id, 'edit')} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-12 h-12 bg-iron-800 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span className="text-rust-400 font-display font-bold text-lg leading-none">{new Date(s.session_date).getDate()}</span>
                    <span className="text-iron-500 text-[10px] uppercase">{formatDate(s.session_date, { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-iron-100 font-medium truncate">{s.plan_name || 'Freies Training'}</p>
                    <p className="text-iron-500 text-sm truncate">
                      {!s.completed_at && <span className="text-amber-400">Offen · </span>}
                      {s.set_count} Sätze
                      {toNumber(s.volume_kg) > 0 && ` · ${formatKg(toNumber(s.volume_kg) / 1000)} t`}
                      {s.duration_minutes ? ` · ${s.duration_minutes} Min` : ''}
                    </p>
                  </div>
                </button>
                <div className="flex items-center shrink-0">
                  {!s.completed_at && (
                    <button onClick={() => openSession(s.id, 'active')} className="icon-btn !text-rust-400" title="Fortsetzen" aria-label="Fortsetzen">
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  {!s.completed_at && (
                    <button onClick={() => completeSession(s.id)} className="icon-btn hover:!text-emerald-400" title="Abschließen" aria-label="Abschließen">
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => deleteSession(s.id)} className="icon-btn hover:!text-red-400 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" title="Löschen" aria-label="Training löschen">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarDays} title="Noch keine Trainings" text="Wähle oben einen Plan und starte dein erstes Training." />
        )}
      </section>
    </div>
  );
}
