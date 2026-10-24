import { useEffect, useState } from 'react';
import { BookOpen, Pencil } from 'lucide-react';
import { Modal, Spinner, useFeedback } from './ui';

const API_BASE = '/api';

// Abschnittsüberschriften wie „Ausführung:“ am Zeilenanfang hervorheben
function GuideText({ text }) {
  return (
    <div className="space-y-3 text-iron-200 leading-relaxed">
      {text.split('\n').filter(line => line.trim()).map((line, i) => {
        const match = line.match(/^([^:]{2,30}):\s*(.*)$/);
        if (!match) return <p key={i}>{line}</p>;
        const isBack = match[1].trim().toLowerCase() === 'rücken';
        return (
          <p key={i} className={isBack ? 'p-3 rounded-xl bg-amber-500/10 border border-amber-500/25' : ''}>
            <span className={`block text-xs uppercase tracking-wider mb-0.5 ${isBack ? 'text-amber-400' : 'text-rust-400'}`}>{match[1]}</span>
            {match[2]}
          </p>
        );
      })}
    </div>
  );
}

// Ausführungsbeschreibung einer Übung anzeigen und bearbeiten.
// onSaved(exercise) bekommt die aktualisierte Übung vom Server.
export default function ExerciseGuide({ exerciseId, name, onClose, onSaved }) {
  const { toast } = useFeedback();
  const [exercise, setExercise] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/exercises/${exerciseId}`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setExercise(data);
        setDraft(data.instructions || '');
        if (!data.instructions) setEditing(true);
      } catch (error) {
        console.error('Error loading exercise:', error);
        toast('Übung konnte nicht geladen werden', 'error');
        onClose();
      }
    })();
  }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: draft.trim() || null })
      });
      if (!res.ok) throw new Error(res.statusText);
      const updated = await res.json();
      setExercise(updated);
      setEditing(false);
      onSaved?.(updated);
      toast('Beschreibung gespeichert');
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast('Speichern fehlgeschlagen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setDraft(exercise?.instructions || '');
    setEditing(false);
  };

  const footer = !exercise ? null : editing ? (
    <>
      <button onClick={exercise.instructions ? cancelEdit : onClose} className="btn-secondary flex-1">Abbrechen</button>
      <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Speichert…' : 'Speichern'}</button>
    </>
  ) : (
    <>
      <button onClick={() => setEditing(true)} className="btn-secondary flex-1"><Pencil className="w-4 h-4" /> Bearbeiten</button>
      <button onClick={onClose} className="btn-primary flex-1">Schließen</button>
    </>
  );

  return (
    <Modal title={name || exercise?.name || 'Übung'} onClose={onClose} footer={footer}>
      <div className="p-5">
        {!exercise ? (
          <Spinner />
        ) : editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              placeholder={'Ausgangsposition: …\nAusführung: …\nAchte auf: …\nRücken: …'}
              className="input-field w-full resize-y text-sm leading-relaxed"
              autoFocus={window.matchMedia('(pointer: fine)').matches}
            />
            <p className="text-iron-500 text-xs mt-2">
              Tipp: Zeilen wie „Ausführung: …“ werden als Abschnitt dargestellt, „Rücken: …“ als Hinweis hervorgehoben.
            </p>
          </>
        ) : (
          <>
            {exercise.description && <p className="text-iron-400 text-sm mb-4">{exercise.description}</p>}
            {exercise.instructions
              ? <GuideText text={exercise.instructions} />
              : (
                <div className="flex flex-col items-center text-center py-6 text-iron-500">
                  <BookOpen className="w-8 h-8 mb-2" />
                  Noch keine Beschreibung hinterlegt.
                </div>
              )}
          </>
        )}
      </div>
    </Modal>
  );
}
