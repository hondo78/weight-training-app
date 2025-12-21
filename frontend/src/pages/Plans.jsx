import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, Save, X, GripVertical } from 'lucide-react';

const API_BASE = '/api';

function PlanCard({ plan, onEdit, onDelete, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [details, setDetails] = useState(null);

  const loadDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/plans/${plan.id}`);
      const data = await res.json();
      setDetails(data);
    } catch (error) {
      console.error('Error loading plan details:', error);
    }
  };

  useEffect(() => {
    if (isExpanded && !details) {
      loadDetails();
    }
  }, [isExpanded]);

  return (
    <div className="bg-iron-900 rounded-xl overflow-hidden card-hover">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer hover:bg-iron-800/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-rust-400 to-rust-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {details?.exercises?.length || '?'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-iron-100 font-medium text-lg">{plan.name}</h3>
            <p className="text-iron-500 text-sm">{plan.description || 'Keine Beschreibung'}</p>
          </div>
          <ChevronRight className={`w-5 h-5 text-iron-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isExpanded && details && (
        <div className="border-t border-iron-800 p-4">
          <div className="space-y-2 mb-4">
            {details.exercises?.map((ex, i) => (
              <div key={ex.id} className="flex items-center gap-3 p-2 rounded-lg bg-iron-800/50">
                <span className="w-6 h-6 bg-iron-700 rounded text-center text-iron-400 text-sm leading-6">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-iron-200 text-sm">{ex.name}</p>
                  <p className="text-iron-500 text-xs">
                    {ex.target_sets} × {ex.target_reps} | {ex.rest_seconds}s Pause
                  </p>
                </div>
              </div>
            ))}
            {(!details.exercises || details.exercises.length === 0) && (
              <p className="text-iron-500 text-sm text-center py-2">Keine Übungen definiert</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(plan); }}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Bearbeiten
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanEditor({ plan, exercises, onSave, onCancel }) {
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [planExercises, setPlanExercises] = useState([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan?.id) {
      loadPlanExercises();
    }
  }, [plan]);

  const loadPlanExercises = async () => {
    try {
      const res = await fetch(`${API_BASE}/plans/${plan.id}`);
      const data = await res.json();
      setPlanExercises(data.exercises || []);
    } catch (error) {
      console.error('Error loading plan exercises:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      const body = {
        name,
        description,
        exercises: planExercises.map((ex, i) => ({
          exercise_id: ex.exercise_id || ex.id,
          target_sets: ex.target_sets || 3,
          target_reps: ex.target_reps || '8-12',
          rest_seconds: ex.rest_seconds || 90,
          order_index: i + 1
        }))
      };

      if (plan?.id) {
        await fetch(`${API_BASE}/plans/${plan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        await fetch(`${API_BASE}/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setLoading(false);
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
    setShowExerciseSelector(false);
  };

  const updateExercise = (index, field, value) => {
    const updated = [...planExercises];
    updated[index] = { ...updated[index], [field]: value };
    setPlanExercises(updated);
  };

  const removeExercise = (index) => {
    setPlanExercises(planExercises.filter((_, i) => i !== index));
  };

  const groupedExercises = exercises.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = [];
    acc[ex.muscle_group].push(ex);
    return acc;
  }, {});

  return (
    <div className="bg-iron-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl text-iron-100">
          {plan?.id ? 'Plan bearbeiten' : 'Neuer Plan'}
        </h2>
        <button onClick={onCancel} className="text-iron-400 hover:text-iron-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-iron-400 text-sm mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Push Day"
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="block text-iron-400 text-sm mb-2">Beschreibung</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionale Beschreibung"
            className="input-field w-full"
          />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-iron-400 text-sm uppercase tracking-wider mb-3">Übungen</h3>
        
        {planExercises.length > 0 ? (
          <div className="space-y-2 mb-4">
            {planExercises.map((ex, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-iron-800 rounded-lg">
                <GripVertical className="w-4 h-4 text-iron-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-iron-200 text-sm truncate">{ex.name}</p>
                </div>
                <input
                  type="number"
                  value={ex.target_sets}
                  onChange={(e) => updateExercise(index, 'target_sets', parseInt(e.target.value))}
                  className="input-field w-14 text-center text-sm"
                  placeholder="Sets"
                />
                <span className="text-iron-600">×</span>
                <input
                  type="text"
                  value={ex.target_reps}
                  onChange={(e) => updateExercise(index, 'target_reps', e.target.value)}
                  className="input-field w-16 text-center text-sm"
                  placeholder="Reps"
                />
                <button
                  onClick={() => removeExercise(index)}
                  className="p-1 text-iron-500 hover:text-red-400 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-iron-500 text-sm text-center py-4 mb-4">Noch keine Übungen hinzugefügt</p>
        )}

        <button
          onClick={() => setShowExerciseSelector(true)}
          className="w-full py-3 border-2 border-dashed border-iron-700 rounded-lg text-iron-400 hover:border-rust-500 hover:text-rust-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Übung hinzufügen
        </button>
      </div>

      <div className="flex gap-3 pt-4 border-t border-iron-800">
        <button onClick={onCancel} className="btn-secondary flex-1">
          Abbrechen
        </button>
        <button 
          onClick={handleSave} 
          disabled={loading || !name.trim()}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-iron-900 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-iron-700 flex items-center justify-between">
              <h3 className="font-display text-lg text-iron-100">Übung wählen</h3>
              <button
                onClick={() => setShowExerciseSelector(false)}
                className="text-iron-400 hover:text-iron-200"
              >
                <X className="w-5 h-5" />
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
                        onClick={() => addExercise(ex)}
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

export default function Plans() {
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

  const handleDelete = async (planId) => {
    if (!confirm('Plan wirklich löschen?')) return;
    try {
      await fetch(`${API_BASE}/plans/${planId}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleSave = async () => {
    setEditingPlan(null);
    setIsCreating(false);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-rust-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-100 tracking-wide">
            Trainingspläne
          </h1>
          <p className="text-iron-500 mt-1">Erstelle und verwalte deine Trainingspläne</p>
        </div>
        {!isCreating && !editingPlan && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neu
          </button>
        )}
      </header>

      {(isCreating || editingPlan) ? (
        <PlanEditor
          plan={editingPlan}
          exercises={exercises}
          onSave={handleSave}
          onCancel={() => {
            setEditingPlan(null);
            setIsCreating(false);
          }}
        />
      ) : (
        <div className="space-y-4">
          {plans.length > 0 ? (
            plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={setEditingPlan}
                onDelete={handleDelete}
                onRefresh={loadData}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-iron-900 rounded-xl">
              <p className="text-iron-500 mb-4">Noch keine Trainingspläne erstellt</p>
              <button
                onClick={() => setIsCreating(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ersten Plan erstellen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
