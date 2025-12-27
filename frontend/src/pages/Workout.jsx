import { useState, useEffect } from 'react';
import { Play, Square, Plus, Check, Trash2, Timer, ChevronDown, Save, Edit2, X } from 'lucide-react';

const API_BASE = '/api';

function SetRow({ set, onUpdate, onDelete }) {
  const [weight, setWeight] = useState(set.weight_kg || '');
  const [reps, setReps] = useState(set.reps || '');
  const [rpe, setRpe] = useState(set.rpe || '');

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

function ExerciseCard({ exercise, sessionId, onLogAdded }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exerciseStats, setExerciseStats] = useState({
    lastWeight: null,
    maxWeight: null,
    maxWeightReps: null,
    maxWeightDate: null,
    lastSessionMaxWeight: null
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
        lastSessionMaxWeight: lastSessionMax
      });
    } catch (error) {
      console.error('Error loading exercise stats:', error);
    }
  };

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
    try {
      await fetch(`${API_BASE}/logs/${log.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: log.weight_kg,
          reps: log.reps,
          rpe: log.rpe
        })
      });
    } catch (error) {
      console.error('Error updating log:', error);
    }
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
    if (activeSession && !activeSession.completed_at) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  const completeSession = async () => {
    if (!activeSession) return;
    try {
      await fetch(`${API_BASE}/sessions/${activeSession.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_minutes: Math.round(elapsedTime / 60)
        })
      });
      setActiveSession(null);
      setSessionExercises([]);
      setSelectedPlan(null);
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
                        {session.duration_minutes ? `${session.duration_minutes} Min` : '-'}
                      </p>
                    </div>
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
