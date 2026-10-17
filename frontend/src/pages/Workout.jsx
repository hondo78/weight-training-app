import { useState, useEffect, useCallback } from 'react';
import { Play, Square, Plus, Check, Trash2, Timer, ChevronDown, X, Sparkles, WifiOff, RotateCcw } from 'lucide-react';
import RestTimer, { unlockAudio } from '../components/RestTimer';
import useWakeLock from '../hooks/useWakeLock';
import { putWithRetry, subscribe, pendingCount } from '../lib/syncQueue';
import { suggestNextWeight, formatKg } from '../lib/training';

const API_BASE = '/api';

function SetRow({ set, onUpdate, onDelete }) {
  const [weight, setWeight] = useState(parseFloat(set.weight_kg) || '');
  const [reps, setReps] = useState(set.reps || '');
  const [rpe, setRpe] = useState(set.rpe || '');

  useEffect(() => {
    setWeight(parseFloat(set.weight_kg) || '');
    setReps(set.reps || '');
    setRpe(set.rpe || '');
  }, [set.weight_kg, set.reps, set.rpe]);

  const handleSave = () => {
    onUpdate({
      ...set,
      weight_kg: parseFloat(weight) || 0,
      reps: parseInt(reps) || 0,
      rpe: parseInt(rpe) || null
    });
  };

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="w-8 text-center text-iron-500 text-sm font-mono">{set.set_number}</span>
      <input
        type="number"
        placeholder="kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={handleSave}
        className="input-field w-20 text-center"
      />
      <span className="text-iron-600">×</span>
      <input
        type="number"
        placeholder="Wdh"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={handleSave}
        className="input-field w-16 text-center"
      />
      <input
        type="number"
        placeholder="RPE"
        min="1"
        max="10"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
        onBlur={handleSave}
        className="input-field w-16 text-center text-sm"
      />
      <button 
        onClick={onDelete}
        className="p-2 text-iron-500 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, sessionId, onLogAdded, restSeconds, targetReps, onSetCompleted }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exerciseStats, setExerciseStats] = useState({
    lastWeight: null,
    maxWeight: null,
    maxWeightReps: null,
    maxWeightDate: null,
    lastSessionMaxWeight: null,
    bestE1rm: null,
    suggestion: null
  });

  const loadLogs = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
      const data = await res.json();
      const exerciseLogs = data.logs?.filter(l => l.exercise_id === exercise.id) || [];
      setLogs(exerciseLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const loadExerciseStats = async () => {
    try {
      const [historyRes, recordsRes] = await Promise.all([
        fetch(`${API_BASE}/exercises/${exercise.id}/history`),
        fetch(`${API_BASE}/exercises/${exercise.id}/records`)
      ]);
      const history = await historyRes.json();
      const records = await recordsRes.json();
      const suggestion = suggestNextWeight(history, sessionId, targetReps);

      // Get last weight from history (excluding current session)
      const lastLog = history.find(log => log.session_id !== sessionId && log.weight_kg > 0);

      // Get max weight from last session (excluding current session)
      const lastSessionLogs = history.filter(log =>
        log.session_id !== sessionId &&
        log.session_id === lastLog?.session_id &&
        log.weight_kg > 0
      );
      const lastSessionMax = lastSessionLogs.length > 0
        ? Math.max(...lastSessionLogs.map(log => log.weight_kg))
        : null;

      // Find the date of max weight
      const maxWeightLog = history.find(log => log.weight_kg === records?.max_weight);

      setExerciseStats({
        lastWeight: lastLog?.weight_kg || null,
        maxWeight: records?.max_weight || null,
        maxWeightReps: records?.reps_at_max || null,
        maxWeightDate: maxWeightLog?.session_date || null,
        lastSessionMaxWeight: lastSessionMax,
        bestE1rm: parseFloat(records?.best_e1rm) || null,
        suggestion
      });
    } catch (error) {
      console.error('Error loading exercise stats:', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadLogs();
    }
  }, [sessionId]);

  useEffect(() => {
    if (isExpanded && sessionId) {
      loadLogs();
      loadExerciseStats();
    }
  }, [isExpanded, sessionId]);

  const addSet = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const nextSetNumber = logs.length + 1;
      const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          exercise_id: exercise.id,
          set_number: nextSetNumber,
          weight_kg: 0,
          reps: 0
        })
      });
      const newLog = await res.json();
      setLogs([...logs, newLog]);
      onLogAdded?.();
    } catch (error) {
      console.error('Error adding set:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLog = async (log) => {
    const previous = logs.find(l => l.id === log.id);
    const unchanged = previous &&
      parseFloat(previous.weight_kg) === log.weight_kg &&
      (parseInt(previous.reps) || 0) === log.reps &&
      (previous.rpe || null) === log.rpe;
    if (unchanged) return;

    setLogs(current => current.map(l => (l.id === log.id ? { ...l, ...log } : l)));

    // Satz frisch erledigt (vorher 0 Wdh) → Pausen-Timer starten
    if (previous && !(parseInt(previous.reps) > 0) && log.reps > 0) {
      onSetCompleted?.(restSeconds || 90, exercise.name);
    }

    await putWithRetry(`${API_BASE}/logs/${log.id}`, {
      weight_kg: log.weight_kg,
      reps: log.reps,
      rpe: log.rpe
    });
  };

  const applySuggestion = () => {
    const weight = exerciseStats.suggestion?.weight;
    if (!weight) return;
    logs
      .filter(l => !(parseFloat(l.weight_kg) > 0))
      .forEach(l => updateLog({ ...l, weight_kg: weight, reps: parseInt(l.reps) || 0, rpe: l.rpe || null }));
  };

  const deleteLog = async (logId) => {
    try {
      await fetch(`${API_BASE}/logs/${logId}`, { method: 'DELETE' });
      setLogs(logs.filter(l => l.id !== logId));
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  return (
    <div className="bg-iron-900 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-iron-800/50 transition-colors"
      >
        <div className="w-10 h-10 bg-iron-800 rounded-lg flex items-center justify-center">
          <span className="text-rust-400 font-bold text-sm">{logs.length || 0}</span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-iron-100 font-medium">{exercise.name}</p>
          {!isExpanded ? (
            <p className="text-iron-500 text-sm">{exercise.muscle_group}</p>
          ) : (
            <div className="mt-1 space-y-1">
              <p className="text-iron-500 text-sm">{exercise.muscle_group}</p>
              {(exerciseStats.lastWeight || exerciseStats.lastSessionMaxWeight) && (
                <div className="flex items-center gap-3 text-xs">
                  {exerciseStats.lastWeight && (
                    <span className="text-iron-400">
                      Letztes: <span className="text-iron-300 font-medium">{exerciseStats.lastWeight}kg</span>
                    </span>
                  )}
                  {exerciseStats.lastSessionMaxWeight && (
                    <span className="text-iron-400">
                      Session-Max: <span className="text-iron-300 font-medium">{exerciseStats.lastSessionMaxWeight}kg</span>
                    </span>
                  )}
                </div>
              )}
              {exerciseStats.maxWeight && (
                <div className="text-xs text-iron-400">
                  Rekord: <span className="text-rust-400 font-medium">{exerciseStats.maxWeight}kg</span>
                  {exerciseStats.maxWeightReps && (
                    <span className="text-iron-400"> × {exerciseStats.maxWeightReps} Wdh</span>
                  )}
                  {exerciseStats.maxWeightDate && (
                    <span className="text-iron-500"> • {new Date(exerciseStats.maxWeightDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  )}
                  {exerciseStats.bestE1rm && (
                    <span className="text-iron-400"> • e1RM <span className="text-iron-300 font-medium">{formatKg(exerciseStats.bestE1rm)}kg</span></span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-iron-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-iron-800">
          <div className="pt-3">
            {/* Progressionsvorschlag */}
            {exerciseStats.suggestion && (
              <div className="mb-3 p-3 bg-rust-500/10 border border-rust-500/30 rounded-lg flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-rust-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-iron-100 text-sm">
                    Vorschlag: <span className="font-semibold text-rust-400">{formatKg(exerciseStats.suggestion.weight)} kg</span>
                    <span className="text-iron-400"> × {exerciseStats.suggestion.targetReps} Wdh</span>
                  </p>
                  <p className="text-iron-500 text-xs">
                    {exerciseStats.suggestion.reason} (zuletzt {formatKg(exerciseStats.suggestion.lastWeight)} kg)
                  </p>
                </div>
                {logs.some(l => !(parseFloat(l.weight_kg) > 0)) && (
                  <button
                    onClick={applySuggestion}
                    className="px-3 py-1.5 rounded-lg bg-rust-500 hover:bg-rust-600 text-white text-xs font-medium shrink-0"
                  >
                    Übernehmen
                  </button>
                )}
              </div>
            )}

            {/* RPE Legend */}
            <div className="mb-3 p-2 bg-iron-800/50 rounded-lg">
              <p className="text-iron-400 text-xs font-medium mb-1">RPE Skala (Rate of Perceived Exertion):</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-iron-500">
                <span>1-3: Sehr leicht</span>
                <span>4-6: Moderat</span>
                <span>7-8: Schwer (2-3 Wdh Reserve)</span>
                <span>9-10: Maximal (0-1 Wdh Reserve)</span>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 py-2 text-iron-500 text-xs uppercase tracking-wider">
              <span className="w-8 text-center">Set</span>
              <span className="w-20 text-center">Gewicht</span>
              <span className="w-4"></span>
              <span className="w-16 text-center">Wdh</span>
              <span className="w-16 text-center">RPE</span>
              <span className="w-8"></span>
            </div>

            {/* Sets */}
            {logs.map((log) => (
              <SetRow
                key={log.id}
                set={log}
                onUpdate={updateLog}
                onDelete={() => deleteLog(log.id)}
              />
            ))}

            {/* Add Set Button */}
            <button
              onClick={addSet}
              disabled={loading || !sessionId}
              className="w-full mt-2 py-2 border-2 border-dashed border-iron-700 rounded-lg text-iron-400 hover:border-rust-500 hover:text-rust-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Satz hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Workout() {
  const [plans, setPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [editSession, setEditSession] = useState(null);
  const [sessionExercises, setSessionExercises] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [recentSessions, setRecentSessions] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [pendingSync, setPendingSync] = useState(pendingCount());

  useWakeLock(Boolean(activeSession));
  useEffect(() => subscribe(setPendingSync), []);

  const startRest = useCallback((seconds, label) => {
    unlockAudio();
    setRestTimer({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  }, []);
  const closeRest = useCallback(() => setRestTimer(null), []);

  useEffect(() => {
    async function loadData() {
      try {
        const [plansRes, exercisesRes, sessionsRes] = await Promise.all([
          fetch(`${API_BASE}/plans`),
          fetch(`${API_BASE}/exercises`),
          fetch(`${API_BASE}/sessions`)
        ]);
        setPlans(await plansRes.json());
        setExercises(await exercisesRes.json());
        setRecentSessions((await sessionsRes.json()).slice(0, 10));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (activeSession && !activeSession.completed_at && activeSession.started_at) {
      const updateElapsed = () => {
        const startedAt = new Date(activeSession.started_at).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startedAt) / 1000));
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadPlanExercises = async (planId) => {
    try {
      const res = await fetch(`${API_BASE}/plans/${planId}`);
      const data = await res.json();
      setSessionExercises(data.exercises || []);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  // Offene Session (z. B. nach Neuladen der Seite) als aktives Training fortsetzen
  const resumeSession = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
      const data = await res.json();
      let planExercises = [];
      if (data.plan_id) {
        const planRes = await fetch(`${API_BASE}/plans/${data.plan_id}`);
        if (planRes.ok) planExercises = (await planRes.json()).exercises || [];
      }
      const known = new Set(planExercises.map(e => e.exercise_id));
      const extra = [];
      data.logs?.forEach(log => {
        if (!known.has(log.exercise_id)) {
          known.add(log.exercise_id);
          extra.push({ id: log.exercise_id, exercise_id: log.exercise_id, name: log.exercise_name, muscle_group: log.muscle_group });
        }
      });
      setEditSession(null);
      setSelectedPlan(data.plan_id || null);
      setSessionExercises([...planExercises, ...extra]);
      setActiveSession(data);
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  const startSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan || null,
          session_date: new Date().toISOString().split('T')[0]
        })
      });
      const session = await res.json();
      setActiveSession(session);
      setElapsedTime(0);

      if (selectedPlan) {
        await loadPlanExercises(selectedPlan);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const completeSession = async (sessionId) => {
    const id = sessionId || activeSession?.id;
    if (!id) return;
    try {
      await fetch(`${API_BASE}/sessions/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!sessionId) {
        // Completing active session
        setActiveSession(null);
        setSessionExercises([]);
        setSelectedPlan(null);
        setRestTimer(null);
      }
      // Reload sessions
      const sessionsRes = await fetch(`${API_BASE}/sessions`);
      setRecentSessions((await sessionsRes.json()).slice(0, 10));
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const addExerciseToSession = (exercise) => {
    if (!sessionExercises.find(e => e.exercise_id === exercise.id || e.id === exercise.id)) {
      setSessionExercises([...sessionExercises, {
        ...exercise,
        exercise_id: exercise.id
      }]);
    }
    setShowExerciseSelector(false);
  };

  const loadSessionForEdit = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
      const data = await res.json();
      setEditSession(data);

      // Extract unique exercises from logs
      const uniqueExercises = [];
      const exerciseIds = new Set();

      data.logs?.forEach(log => {
        if (!exerciseIds.has(log.exercise_id)) {
          exerciseIds.add(log.exercise_id);
          uniqueExercises.push({
            id: log.exercise_id,
            exercise_id: log.exercise_id,
            name: log.exercise_name,
            muscle_group: log.muscle_group
          });
        }
      });

      setSessionExercises(uniqueExercises);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const closeEditSession = () => {
    setEditSession(null);
    setSessionExercises([]);
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Möchtest du dieses Training wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      // Reload sessions list
      const sessionsRes = await fetch(`${API_BASE}/sessions`);
      setRecentSessions((await sessionsRes.json()).slice(0, 10));

      // Close edit mode if this session was being edited
      if (editSession?.id === sessionId) {
        closeEditSession();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Fehler beim Löschen des Trainings');
    }
  };

  // Group exercises by muscle group
  const groupedExercises = exercises.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = [];
    acc[ex.muscle_group].push(ex);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-100 tracking-wide">
          Training
        </h1>
        <p className="text-iron-500 mt-1">Starte eine neue Session oder dokumentiere dein Training</p>
      </header>

      {!activeSession && !editSession ? (
        <>
          {/* Start Session Card */}
          <div className="bg-iron-900 rounded-xl p-6 mb-6">
            <h2 className="section-title text-iron-400 text-sm mb-4">Neue Session</h2>

            <div className="mb-4">
              <label className="block text-iron-400 text-sm mb-2">Trainingsplan (optional)</label>
              <select
                value={selectedPlan || ''}
                onChange={(e) => setSelectedPlan(e.target.value ? parseInt(e.target.value) : null)}
                className="input-field w-full"
              >
                <option value="">Freies Training</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={startSession}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <Play className="w-5 h-5" />
              Training starten
            </button>
          </div>

          {/* Recent Sessions */}
          <div className="bg-iron-900 rounded-xl p-6">
            <h2 className="section-title text-iron-400 text-sm mb-4">Letzte Trainings</h2>
            {recentSessions.length > 0 ? (
              <div className="space-y-2">
                {recentSessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => loadSessionForEdit(session.id)}
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-iron-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-iron-800 rounded-lg flex flex-col items-center justify-center group-hover:bg-rust-900/30 transition-colors">
                      <span className="text-rust-400 font-display font-bold text-lg leading-none">
                        {new Date(session.session_date).getDate()}
                      </span>
                      <span className="text-iron-500 text-[10px] uppercase">
                        {new Date(session.session_date).toLocaleDateString('de-DE', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-iron-100 font-medium group-hover:text-rust-400 transition-colors">{session.plan_name || 'Freies Training'}</p>
                      <p className="text-iron-500 text-sm">
                        {session.completed_at
                          ? (session.duration_minutes ? `${session.duration_minutes} Min` : 'Abgeschlossen')
                          : <span className="text-yellow-500">Offen</span>
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!session.completed_at && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeSession(session.id);
                          }}
                          className="px-3 py-1.5 mr-1 rounded-lg bg-rust-500/15 text-rust-400 hover:bg-rust-500/25 text-sm flex items-center gap-1 transition-colors"
                          title="Als aktives Training fortsetzen"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Fortsetzen
                        </button>
                      )}
                      {!session.completed_at && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeSession(session.id);
                          }}
                          className="p-2 text-iron-400 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Training abschließen"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="p-2 text-iron-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Training löschen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-iron-500 text-center py-4">Noch keine Trainings</p>
            )}
          </div>
        </>
      ) : editSession ? (
        <>
          {/* Edit Session Header */}
          <div className="bg-iron-900 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-iron-400 text-sm">Training bearbeiten</p>
                <p className="text-iron-100 font-medium mt-1">
                  {editSession.plan_name || 'Freies Training'} • {new Date(editSession.session_date).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteSession(editSession.id)}
                  className="bg-red-900/20 hover:bg-red-900/30 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
                <button
                  onClick={closeEditSession}
                  className="bg-iron-800 hover:bg-iron-700 text-iron-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Schließen
                </button>
              </div>
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-3 mb-4">
            {sessionExercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.exercise_id || exercise.id}
                exercise={{
                  id: exercise.exercise_id || exercise.id,
                  name: exercise.name,
                  muscle_group: exercise.muscle_group
                }}
                sessionId={editSession.id}
                onLogAdded={() => loadSessionForEdit(editSession.id)}
              />
            ))}
          </div>

          {/* Add Exercise Button */}
          <button
            onClick={() => setShowExerciseSelector(true)}
            className="w-full py-4 border-2 border-dashed border-iron-700 rounded-xl text-iron-400 hover:border-rust-500 hover:text-rust-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Übung hinzufügen
          </button>
        </>
      ) : (
        <>
          {/* Active Session Header */}
          <div className="bg-gradient-to-r from-rust-600 to-rust-500 rounded-xl p-5 mb-6 animate-pulse-glow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Aktives Training</p>
                <div className="flex items-center gap-2 mt-1">
                  <Timer className="w-5 h-5 text-white" />
                  <span className="metric-value text-2xl text-white">{formatTime(elapsedTime)}</span>
                </div>
                {pendingSync > 0 && (
                  <p className="flex items-center gap-1 text-white/90 text-xs mt-1">
                    <WifiOff className="w-3.5 h-3.5" />
                    {pendingSync} {pendingSync === 1 ? 'Satz wartet' : 'Sätze warten'} auf Verbindung
                  </p>
                )}
              </div>
              <button
                onClick={completeSession}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Square className="w-4 h-4" />
                Beenden
              </button>
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-3 mb-4">
            {sessionExercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.exercise_id || exercise.id}
                exercise={{
                  id: exercise.exercise_id || exercise.id,
                  name: exercise.name,
                  muscle_group: exercise.muscle_group
                }}
                sessionId={activeSession.id}
                restSeconds={exercise.rest_seconds}
                targetReps={exercise.target_reps}
                onSetCompleted={startRest}
              />
            ))}
          </div>

          {/* Add Exercise Button */}
          <button
            onClick={() => setShowExerciseSelector(true)}
            className="w-full py-4 border-2 border-dashed border-iron-700 rounded-xl text-iron-400 hover:border-rust-500 hover:text-rust-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Übung hinzufügen
          </button>

          {/* Platz für den Pausen-Timer, damit er die letzte Karte nicht verdeckt */}
          {restTimer && <div className="h-24" />}
          <RestTimer timer={restTimer} onChange={setRestTimer} onClose={closeRest} />
        </>
      )}

      {/* Exercise Selector Modal - Shared between active and edit sessions */}
      {showExerciseSelector && (activeSession || editSession) && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-iron-900 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-iron-700 flex items-center justify-between">
              <h3 className="font-display text-lg text-iron-100">Übung wählen</h3>
              <button
                onClick={() => setShowExerciseSelector(false)}
                className="text-iron-400 hover:text-iron-200"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto max-h-96 p-4">
              {Object.entries(groupedExercises).map(([group, exs]) => (
                <div key={group} className="mb-4">
                  <h4 className="text-iron-500 text-xs uppercase tracking-wider mb-2">{group}</h4>
                  <div className="space-y-1">
                    {exs.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => addExerciseToSession(ex)}
                        className="w-full text-left p-3 rounded-lg hover:bg-iron-800 transition-colors text-iron-100"
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
