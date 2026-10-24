import { useMemo, useState } from 'react';
import { Search, Check, History } from 'lucide-react';
import { Modal } from './ui';

// Übungsauswahl mit Suche; zuletzt trainierte Übungen stehen oben.
// excludeIds: bereits gewählte Übungen (werden markiert, nicht erneut hinzugefügt)
export default function ExercisePicker({ exercises, excludeIds = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const q = query.trim().toLowerCase();
  const matches = exercises.filter(ex =>
    !q || ex.name.toLowerCase().includes(q) || ex.muscle_group.toLowerCase().includes(q)
  );

  const recent = q ? [] : [...exercises]
    .filter(ex => ex.last_trained)
    .sort((a, b) => new Date(b.last_trained) - new Date(a.last_trained))
    .slice(0, 5);

  const grouped = matches.reduce((acc, ex) => {
    (acc[ex.muscle_group] ||= []).push(ex);
    return acc;
  }, {});

  const renderItem = (ex) => {
    const isAdded = excluded.has(ex.id);
    return (
      <button
        key={ex.id}
        onClick={() => !isAdded && onSelect(ex)}
        disabled={isAdded}
        className={`w-full flex items-center gap-3 text-left px-3 py-3 rounded-lg transition-colors ${
          isAdded ? 'text-iron-500 cursor-default' : 'text-iron-100 hover:bg-iron-800 active:bg-iron-700'
        }`}
      >
        <span className="flex-1 min-w-0 truncate">{ex.name}</span>
        {isAdded
          ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          : ex.set_count > 0 && <span className="text-iron-500 text-xs shrink-0">{ex.set_count} Sätze</span>}
      </button>
    );
  };

  return (
    <Modal title="Übung wählen" onClose={onClose}>
      <div className="sticky top-0 z-10 bg-iron-900 px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iron-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Übung oder Muskelgruppe suchen…"
            className="input-field w-full pl-10"
            autoFocus={window.matchMedia('(pointer: fine)').matches}
          />
        </div>
      </div>
      <div className="px-4 pb-4">
        {recent.length > 0 && (
          <div className="mb-3">
            <h4 className="flex items-center gap-1.5 text-iron-500 text-xs uppercase tracking-wider px-3 py-2">
              <History className="w-3.5 h-3.5" /> Zuletzt trainiert
            </h4>
            {recent.map(renderItem)}
          </div>
        )}
        {Object.entries(grouped).map(([group, exs]) => (
          <div key={group} className="mb-3">
            <h4 className="text-iron-500 text-xs uppercase tracking-wider px-3 py-2">{group}</h4>
            {exs.map(renderItem)}
          </div>
        ))}
        {matches.length === 0 && (
          <p className="text-iron-500 text-center py-8">Keine Übung gefunden</p>
        )}
      </div>
    </Modal>
  );
}
