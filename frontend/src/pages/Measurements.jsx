import { useState, useEffect } from 'react';
import { Plus, Trash2, Scale, Ruler, TrendingUp, TrendingDown, Minus, Percent } from 'lucide-react';
import { Modal, PageHeader, Spinner, EmptyState, useFeedback } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_BASE = '/api';

function MeasurementInput({ label, value, onChange, unit, placeholder }) {
  return (
    <div>
      <label className="block text-iron-400 text-sm mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          placeholder={placeholder}
          className="input-field w-full pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-iron-500 text-sm">
          {unit}
        </span>
      </div>
    </div>
  );
}

// Neutral dargestellt: ob mehr oder weniger "gut" ist, hängt vom Ziel ab
function TrendIndicator({ current, previous, unit }) {
  if (!current || !previous) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const text = diff === 0 ? '±0' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('de-DE')}`;
  return (
    <span className="flex items-center gap-1 text-iron-400 text-xs mt-1">
      <Icon className="w-3 h-3" />
      {text} {unit} seit letzter Messung
    </span>
  );
}

function AddMeasurementModal({ onClose, onAdd }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [biceps, setBiceps] = useState('');
  const [thighs, setThighs] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurement_date: date,
          weight_kg: weight ? parseFloat(weight.replace(',', '.')) : null,
          body_fat_percent: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : null,
          chest_cm: chest ? parseFloat(chest.replace(',', '.')) : null,
          waist_cm: waist ? parseFloat(waist.replace(',', '.')) : null,
          hips_cm: hips ? parseFloat(hips.replace(',', '.')) : null,
          biceps_cm: biceps ? parseFloat(biceps.replace(',', '.')) : null,
          thighs_cm: thighs ? parseFloat(thighs.replace(',', '.')) : null,
          notes: notes || null
        })
      });

      if (res.ok) {
        onAdd();
        onClose();
      }
    } catch (error) {
      console.error('Error adding measurement:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Neue Messung"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
          <button type="submit" form="add-measurement" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Speichern…' : 'Speichern'}
          </button>
        </>
      }
    >
        <form id="add-measurement" onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-iron-400 text-sm mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MeasurementInput
              label="Gewicht"
              value={weight}
              onChange={setWeight}
              unit="kg"
              placeholder="80.5"
            />
            <MeasurementInput
              label="Körperfett"
              value={bodyFat}
              onChange={setBodyFat}
              unit="%"
              placeholder="15"
            />
          </div>

          <div className="border-t border-iron-800 pt-4">
            <p className="text-iron-400 text-sm mb-3">Umfänge (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <MeasurementInput
                label="Brust"
                value={chest}
                onChange={setChest}
                unit="cm"
                placeholder="100"
              />
              <MeasurementInput
                label="Taille"
                value={waist}
                onChange={setWaist}
                unit="cm"
                placeholder="80"
              />
              <MeasurementInput
                label="Hüfte"
                value={hips}
                onChange={setHips}
                unit="cm"
                placeholder="95"
              />
              <MeasurementInput
                label="Bizeps"
                value={biceps}
                onChange={setBiceps}
                unit="cm"
                placeholder="35"
              />
              <MeasurementInput
                label="Oberschenkel"
                value={thighs}
                onChange={setThighs}
                unit="cm"
                placeholder="55"
              />
            </div>
          </div>

          <div>
            <label className="block text-iron-400 text-sm mb-1">Notizen</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionale Notizen..."
              rows={2}
              className="input-field w-full resize-none"
            />
          </div>

        </form>
    </Modal>
  );
}

export default function Measurements() {
  const { confirm, toast } = useFeedback();
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeChart, setActiveChart] = useState('weight');

  const loadMeasurements = async () => {
    try {
      const res = await fetch(`${API_BASE}/measurements`);
      setMeasurements(await res.json());
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeasurements();
  }, []);

  const handleDelete = async (id) => {
    if (!(await confirm({ title: 'Messung löschen?', confirmLabel: 'Löschen', danger: true }))) return;
    try {
      await fetch(`${API_BASE}/measurements/${id}`, { method: 'DELETE' });
      await loadMeasurements();
      toast('Messung gelöscht');
    } catch (error) {
      console.error('Error deleting measurement:', error);
    }
  };

  const latest = measurements[0];
  const previous = measurements[1];

  const chartData = [...measurements]
    .reverse()
    .slice(-20)
    .map(m => ({
      date: m.measurement_date,
      weight: m.weight_kg ? parseFloat(m.weight_kg) : null,
      bodyFat: m.body_fat_percent ? parseFloat(m.body_fat_percent) : null,
      waist: m.waist_cm ? parseFloat(m.waist_cm) : null,
      chest: m.chest_cm ? parseFloat(m.chest_cm) : null
    }));

  const chartOptions = [
    { key: 'weight', label: 'Gewicht', color: '#d4622c' },
    { key: 'bodyFat', label: 'Körperfett', color: '#3b82f6' },
    { key: 'waist', label: 'Taille', color: '#10b981' },
    { key: 'chest', label: 'Brust', color: '#f59e0b' }
  ];

  if (loading) return <Spinner fullPage />;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Körper"
        subtitle="Gewicht, Körperfett und Umfänge"
        actions={<button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Messen</button>}
      />

      {/* Current Stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-rust-400" />
              <span className="text-iron-400 text-sm">Gewicht</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="metric-value text-2xl text-iron-100">
                {latest.weight_kg || '-'}
              </span>
              <span className="text-iron-500 text-sm">kg</span>
            </div>
            <TrendIndicator unit="kg"
              current={parseFloat(latest.weight_kg)} 
              previous={parseFloat(previous?.weight_kg)} 
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-steel-400" />
              <span className="text-iron-400 text-sm">Körperfett</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="metric-value text-2xl text-iron-100">
                {latest.body_fat_percent || '-'}
              </span>
              <span className="text-iron-500 text-sm">%</span>
            </div>
            <TrendIndicator unit="%"
              current={parseFloat(latest.body_fat_percent)} 
              previous={parseFloat(previous?.body_fat_percent)} 
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4 text-emerald-400" />
              <span className="text-iron-400 text-sm">Taille</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="metric-value text-2xl text-iron-100">
                {latest.waist_cm || '-'}
              </span>
              <span className="text-iron-500 text-sm">cm</span>
            </div>
            <TrendIndicator unit="cm"
              current={parseFloat(latest.waist_cm)} 
              previous={parseFloat(previous?.waist_cm)} 
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-4 h-4 text-amber-400" />
              <span className="text-iron-400 text-sm">Brust</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="metric-value text-2xl text-iron-100">
                {latest.chest_cm || '-'}
              </span>
              <span className="text-iron-500 text-sm">cm</span>
            </div>
            <TrendIndicator unit="cm"
              current={parseFloat(latest.chest_cm)} 
              previous={parseFloat(previous?.chest_cm)} 
            />
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {chartOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setActiveChart(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeChart === opt.key
                    ? 'bg-iron-700 text-iron-100'
                    : 'text-iron-500 hover:text-iron-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  stroke="#6b6860" 
                  fontSize={10}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis 
                  stroke="#6b6860" 
                  fontSize={10}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#33322f', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f7f7f6'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('de-DE')}
                />
                <Line 
                  type="monotone" 
                  dataKey={activeChart}
                  stroke={chartOptions.find(o => o.key === activeChart)?.color}
                  strokeWidth={2}
                  dot={{ fill: chartOptions.find(o => o.key === activeChart)?.color, r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Measurement History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-iron-800">
          <h2 className="section-title text-iron-400 text-sm">Verlauf</h2>
        </div>
        
        {measurements.length > 0 ? (
          <div className="divide-y divide-iron-800">
            {measurements.map(m => (
              <div key={m.id} className="p-4 flex items-center gap-4 hover:bg-iron-800/30 transition-colors">
                <div className="w-12 h-12 bg-iron-800 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-rust-400 font-display font-bold text-lg leading-none">
                    {new Date(m.measurement_date).getDate()}
                  </span>
                  <span className="text-iron-500 text-[10px] uppercase">
                    {new Date(m.measurement_date).toLocaleDateString('de-DE', { month: 'short' })}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {m.weight_kg && (
                      <span className="text-iron-300">
                        <span className="text-iron-500">Gewicht:</span> {m.weight_kg} kg
                      </span>
                    )}
                    {m.body_fat_percent && (
                      <span className="text-iron-300">
                        <span className="text-iron-500">KFA:</span> {m.body_fat_percent}%
                      </span>
                    )}
                    {m.waist_cm && (
                      <span className="text-iron-300">
                        <span className="text-iron-500">Taille:</span> {m.waist_cm} cm
                      </span>
                    )}
                  </div>
                  {m.notes && (
                    <p className="text-iron-500 text-sm mt-1 truncate">{m.notes}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2 text-iron-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Scale}
            title="Noch keine Messungen"
            text="Trage regelmäßig dein Gewicht ein – am besten morgens, immer zur gleichen Zeit."
            action={<button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Erste Messung</button>}
          />
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddMeasurementModal
          onClose={() => setShowAddModal(false)}
          onAdd={loadMeasurements}
        />
      )}
    </div>
  );
}
