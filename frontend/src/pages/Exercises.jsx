import { useState, useEffect } from 'react';
import { Plus, Search, X, Dumbbell } from 'lucide-react';

const API_BASE = '/api';

const MUSCLE_GROUPS = [
  'Brust',
  'Rücken',
  'Schultern',
  'Arme',
  'Beine',
  'Core'
];

function ExerciseCard({ exercise }) {
  return (
    <div className="bg-iron-900 rounded-xl p-4 card-hover">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-iron-800 rounded-lg flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-rust-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-iron-100 font-medium">{exercise.name}</h3>
          <p className="text-iron-500 text-sm">{exercise.muscle_group}</p>
          {exercise.description && (
            <p className="text-iron-400 text-sm mt-2">{exercise.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddExerciseModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Brust');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          muscle_group: muscleGroup,
          description: description || null
        })
      });

      if (res.ok) {
        const newExercise = await res.json();
        onAdd(newExercise);
        onClose();
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-iron-900 rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-iron-700 flex items-center justify-between">
          <h3 className="font-display text-lg text-iron-100">Neue Übung</h3>
          <button onClick={onClose} className="text-iron-400 hover:text-iron-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-iron-400 text-sm mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Bulgarian Split Squats"
              className="input-field w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-iron-400 text-sm mb-2">Muskelgruppe</label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className="input-field w-full"
            >
              {MUSCLE_GROUPS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-iron-400 text-sm mb-2">Beschreibung (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Übung"
              rows={3}
              className="input-field w-full resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button 
              type="submit" 
              disabled={loading || !name.trim()}
              className="btn-primary flex-1"
            >
              {loading ? 'Speichern...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Alle');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function loadExercises() {
      try {
        const res = await fetch(`${API_BASE}/exercises`);
        setExercises(await res.json());
      } catch (error) {
        console.error('Error loading exercises:', error);
      } finally {
        setLoading(false);
      }
    }
    loadExercises();
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ex.muscle_group.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'Alle' || ex.muscle_group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = [];
    acc[ex.muscle_group].push(ex);
    return acc;
  }, {});

  const handleAddExercise = (newExercise) => {
    setExercises([...exercises, newExercise]);
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
      <header className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-100 tracking-wide">
              Übungen
            </h1>
            <p className="text-iron-500 mt-1">{exercises.length} Übungen verfügbar</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neu
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iron-500" />
            <input
              type="text"
              placeholder="Übung suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-10"
            />
          </div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="input-field"
          >
            <option value="Alle">Alle Muskelgruppen</option>
            {MUSCLE_GROUPS.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Exercise List */}
      {selectedGroup === 'Alle' ? (
        Object.entries(groupedExercises).map(([group, exs]) => (
          <div key={group} className="mb-6">
            <h2 className="section-title text-iron-400 text-sm mb-3">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {exs.map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredExercises.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      )}

      {filteredExercises.length === 0 && (
        <div className="text-center py-12 bg-iron-900 rounded-xl">
          <p className="text-iron-500">Keine Übungen gefunden</p>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddModal && (
        <AddExerciseModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExercise}
        />
      )}
    </div>
  );
}
