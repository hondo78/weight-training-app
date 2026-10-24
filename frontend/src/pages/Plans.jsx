import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X, Play, ClipboardList, Hourglass } from 'lucide-react';
import ExercisePicker from '../components/ExercisePicker';
import { PageHeader, Spinner, EmptyState, useFeedback } from '../components/ui';

const API_BASE = '/api';

function relativeDay(date) {
  if (!date) return 'noch nie trainiert';
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(new Date(date))) / 86400000);
  if (days <= 0) return 'zuletzt heute';
  if (days === 1) return 'zuletzt gestern';
  return `zuletzt vor ${days} Tagen`;
}

function PlanCard({ plan, onEdit, onDelete }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!isExpanded || details) return;
    fetch(`${API_BASE}/plans/${plan.id}`)
      .then(res => res.json())
      .then(setDetails)
      .catch(error => console.error('Error loading plan details:', error));
  }, [isExpanded, details, plan.id]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-12 h-12 bg-gradient-to-br from-rust-400 to-rust-600 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-lg shadow-rust-900/30">
            <span className="text-white font-bold text-lg leading-none">{plan.exercise_count}</span>
            <span className="text-white/75 text-[9px] uppercase tracking-wide">Übg.</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-iron-50 font-semibold text-lg truncate">{plan.name}</h3>
            <p className="text-iron-500 text-sm truncate">
              {plan.description ? `${plan.description} · ` : ''}{relativeDay(plan.last_used)}
            </p>
          </div>
          <ChevronDown className={`w-5 h-5 text-iron-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => navigate(`/workout?plan=${plan.id}`)}
          disabled={!plan.exercise_count}
          className="btn-primary !px-3 sm:!px-4 !py-2.5 shrink-0"
          aria-label={`${plan.name} starten`}
        >
          <Play className="w-4 h-4" fill="currentColor" />
          <span className="hidden sm:inline">Starten</span>
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-iron-800 p-4">
          {!details ? <Spinner /> : (
            <>
              <ol className="space-y-1.5 mb-4">
                {details.exercises?.map((ex, i) => (
                  <li key={ex.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-iron-800/50">
                    <span className="w-6 h-6 bg-iron-700 rounded-md text-center text-iron-300 text-xs font-mono leading-6 shrink-0">{i + 1}</span>
                    <p className="text-iron-100 text-sm flex-1 min-w-0 truncate">{ex.name}</p>
                    <span className="text-iron-400 text-xs font-mono shrink-0">{ex.target_sets} × {ex.target_reps}</span>
                    <span className="text-iron-500 text-xs shrink-0 hidden sm:flex items-center gap-1"><Hourglass className="w-3 h-3" />{ex.rest_seconds}s</span>
                  </li>
                ))}
                {(!details.exercises || details.exercises.length === 0) && (
                  <p className="text-iron-500 text-sm text-center py-2">Keine Übungen definiert</p>
                )}
              </ol>
              <div className="flex gap-2">
                <button onClick={() => onEdit(plan)} className="btn-secondary flex-1">
                  <Edit2 className="w-4 h-4" /> Bearbeiten
                </button>
                <button onClick={() => onDelete(plan)} className="btn-secondary !px-3.5 hover:!text-red-400" aria-label="Plan löschen">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, width = 'w-14', suffix }) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-iron-500">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field ${width} !px-1 !py-2 text-center text-sm`}
        />
        {suffix && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-iron-500 text-xs pointer-events-none">{suffix}</span>}
      </div>
    </label>
  );
}

function PlanEditor({ plan, exercises, onSave, onCancel }) {
  const { toast } = useFeedback();
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [planExercises, setPlanExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan?.id) return;
    fetch(`${API_BASE}/plans/${plan.id}`)
      .then(res => res.json())
      .then(data => setPlanExercises(data.exercises || []))
      .catch(error => console.error('Error loading plan exercises:', error));
  }, [plan]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description,
        exercises: planExercises.map((ex, i) => ({
          exercise_id: ex.exercise_id || ex.id,
          target_sets: parseInt(ex.target_sets) || 3,
          target_reps: String(ex.target_reps || '').trim() || '8-12',
          rest_seconds: parseInt(ex.rest_seconds) || 90,
          order_index: i + 1
        }))
      };
      const res = await fetch(plan?.id ? `${API_BASE}/plans/${plan.id}` : `${API_BASE}/plans`, {
        method: plan?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      toast('Plan gespeichert');
      onSave();
    } catch {
      toast('Speichern fehlgeschlagen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addExercise = (exercise) => {
    setPlanExercises([...planExercises, {
      ...exercise,
      exercise_id: exercise.id,
      target_sets: 3,
      target_reps: '8-12',
      rest_seconds: 90
    }]);
    setShowPicker(false);
  };

  const updateExercise = (index, field, value) => {
    setPlanExercises(current => current.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)));
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= planExercises.length) return;
    const updated = [...planExercises];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setPlanExercises(updated);
  };

  return (
    <div className="card p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl tracking-wide text-iron-50">{plan?.id ? 'Plan bearbeiten' : 'Neuer Plan'}</h2>
        <button onClick={onCancel} className="icon-btn -mr-2" aria-label="Schließen"><X className="w-5 h-5" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <label className="block">
          <span className="block text-iron-400 text-sm mb-1.5">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Push Day" className="input-field w-full" />
        </label>
        <label className="block">
          <span className="block text-iron-400 text-sm mb-1.5">Beschreibung</span>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional" className="input-field w-full" />
        </label>
      </div>

      <h3 className="section-title text-iron-400 text-sm mb-3">Übungen</h3>
      {planExercises.length > 0 ? (
        <ol className="space-y-2 mb-3">
          {planExercises.map((ex, index) => (
            <li key={`${ex.exercise_id || ex.id}-${index}`} className="flex items-center gap-2 p-2.5 bg-iron-800/70 rounded-xl">
              <div className="flex flex-col shrink-0">
                <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1 text-iron-500 hover:text-iron-100 disabled:opacity-25" aria-label="Nach oben">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(index, 1)} disabled={index === planExercises.length - 1} className="p-1 text-iron-500 hover:text-iron-100 disabled:opacity-25" aria-label="Nach unten">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-iron-100 text-sm font-medium flex-1 min-w-0 truncate">{ex.name}</p>
                <div className="flex items-end gap-1.5">
                  <NumberField label="Sätze" value={ex.target_sets} onChange={(v) => updateExercise(index, 'target_sets', v.replace(/\D/g, ''))} width="w-12" />
                  <span className="text-iron-600 pb-2">×</span>
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-iron-500">Wdh</span>
                    <input type="text" value={ex.target_reps} onChange={(e) => updateExercise(index, 'target_reps', e.target.value)} className="input-field w-16 !px-1 !py-2 text-center text-sm" />
                  </label>
                  <NumberField label="Pause" value={ex.rest_seconds} onChange={(v) => updateExercise(index, 'rest_seconds', v.replace(/\D/g, ''))} width="w-16 !pr-4" suffix="s" />
                </div>
              </div>
              <button onClick={() => setPlanExercises(planExercises.filter((_, i) => i !== index))} className="icon-btn !w-9 !h-9 hover:!text-red-400 shrink-0" aria-label="Übung entfernen">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-iron-500 text-sm text-center py-4">Noch keine Übungen hinzugefügt</p>
      )}

      <button
        onClick={() => setShowPicker(true)}
        className="w-full py-3 border-2 border-dashed border-iron-700 rounded-xl text-iron-400 hover:border-rust-500 hover:text-rust-400 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Übung hinzufügen
      </button>

      <div className="flex gap-3 pt-5 mt-5 border-t border-iron-800">
        <button onClick={onCancel} className="btn-secondary flex-1">Abbrechen</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary flex-1">
          <Save className="w-4 h-4" />
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          exercises={exercises}
          excludeIds={planExercises.map(ex => ex.exercise_id || ex.id)}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

export default function Plans() {
  const { confirm, toast } = useFeedback();
  const [plans, setPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [plansRes, exercisesRes] = await Promise.all([
        fetch(`${API_BASE}/plans`),
        fetch(`${API_BASE}/exercises`)
      ]);
      setPlans(await plansRes.json());
      setExercises(await exercisesRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (plan) => {
    const ok = await confirm({
      title: `„${plan.name}“ löschen?`,
      message: 'Bisherige Trainings mit diesem Plan bleiben erhalten.',
      confirmLabel: 'Löschen',
      danger: true
    });
    if (!ok) return;
    try {
      await fetch(`${API_BASE}/plans/${plan.id}`, { method: 'DELETE' });
      toast('Plan gelöscht');
      await loadData();
    } catch {
      toast('Löschen fehlgeschlagen', 'error');
    }
  };

  const closeEditor = () => {
    setEditingPlan(null);
    setIsCreating(false);
  };

  if (loading) return <Spinner fullPage />;

  const editing = isCreating || editingPlan;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Pläne"
        subtitle="Deine Trainingspläne – tippe auf ▶ zum Starten"
        actions={!editing && (
          <button onClick={() => setIsCreating(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Neu
          </button>
        )}
      />

      {editing ? (
        <PlanEditor
          plan={editingPlan}
          exercises={exercises}
          onSave={async () => { closeEditor(); await loadData(); }}
          onCancel={closeEditor}
        />
      ) : plans.length > 0 ? (
        <div className="space-y-3">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} onEdit={setEditingPlan} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="Noch keine Pläne"
            text="Ein Plan legt Übungen, Sätze und Pausen fest – beim Start werden die Sätze automatisch angelegt."
            action={<button onClick={() => setIsCreating(true)} className="btn-primary"><Plus className="w-4 h-4" /> Ersten Plan erstellen</button>}
          />
        </div>
      )}
    </div>
  );
}
