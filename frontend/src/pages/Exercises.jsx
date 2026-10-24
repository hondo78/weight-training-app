import { useState, useEffect } from 'react';
import { Plus, Search, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal, PageHeader, Spinner, EmptyState, useFeedback } from '../components/ui';

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
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-iron-800 rounded-xl flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-rust-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-iron-50 font-medium">{exercise.name}</h3>
          <p className="text-iron-500 text-sm">
            {exercise.set_count > 0
              ? <Link to="/progress" className="hover:text-rust-400">{exercise.set_count} Sätze trainiert</Link>
              : 'Noch nicht trainiert'}
          </p>
          {exercise.description && (
            <p className="text-iron-400 text-sm mt-2">{exercise.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddExerciseModal({ initialName = '', onClose, onAdd }) {
  const { toast } = useFeedback();
  const [name, setName] = useState(initialName);
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

      if (!res.ok) throw new Error();
      const newExercise = await res.json();
      onAdd({ ...newExercise, set_count: 0 });
      toast(`${newExercise.name} angelegt`);
      onClose();
    } catch {
      toast('Übung konnte nicht angelegt werden', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Neue Übung"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
          <button type="submit" form="add-exercise" disabled={loading || !name.trim()} className="btn-primary flex-1">
            {loading ? 'Speichern…' : 'Hinzufügen'}
          </button>
        </>
      }
    >
      <form id="add-exercise" onSubmit={handleSubmit} className="p-5 space-y-4">
        <label className="block">
          <span className="block text-iron-400 text-sm mb-1.5">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Bulgarian Split Squats" className="input-field w-full" autoFocus />
        </label>
        <div>
          <span className="block text-iron-400 text-sm mb-1.5">Muskelgruppe</span>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map(group => (
              <button key={group} type="button" onClick={() => setMuscleGroup(group)} className={`chip ${muscleGroup === group ? 'chip-active' : 'chip-idle'}`}>
                {group}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="block text-iron-400 text-sm mb-1.5">Beschreibung (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze Beschreibung der Übung" rows={3} className="input-field w-full resize-none" />
        </label>
      </form>
    </Modal>
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

  if (loading) return <Spinner fullPage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Übungen"
        subtitle={`${exercises.length} Übungen im Katalog`}
        actions={<button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Neu</button>}
      />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iron-500" />
        <input type="search" placeholder="Übung suchen…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field w-full pl-10" />
      </div>
      <div className="mb-6 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {['Alle', ...MUSCLE_GROUPS].map(group => (
          <button key={group} onClick={() => setSelectedGroup(group)} className={`chip ${selectedGroup === group ? 'chip-active' : 'chip-idle'}`}>
            {group}
          </button>
        ))}
      </div>

      {Object.entries(groupedExercises).map(([group, exs]) => (
        <section key={group} className="mb-6">
          <h2 className="section-title text-iron-400 text-sm mb-3">{group} <span className="text-iron-600">· {exs.length}</span></h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {exs.map(ex => <ExerciseCard key={ex.id} exercise={ex} />)}
          </div>
        </section>
      ))}

      {filteredExercises.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Search}
            title="Keine Übung gefunden"
            action={searchQuery && <button onClick={() => setShowAddModal(true)} className="btn-secondary"><Plus className="w-4 h-4" /> „{searchQuery}“ anlegen</button>}
          />
        </div>
      )}

      {showAddModal && (
        <AddExerciseModal
          initialName={filteredExercises.length === 0 ? searchQuery : ''}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExercise}
        />
      )}
    </div>
  );
}
