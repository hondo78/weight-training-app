import { useState, useEffect } from 'react';
import { Plus, Trash2, Scale, Ruler, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_BASE = '/api';

function MeasurementInput({ label, value, onChange, unit, placeholder }) {
  return (
    <div>
      <label className="block text-iron-400 text-sm mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

function TrendIndicator({ current, previous }) {
  if (!current || !previous) return null;
  
  const diff = current - previous;
  const percentage = ((diff / previous) * 100).toFixed(1);
  
  if (Math.abs(diff) < 0.1) {
    return (
      <span className="flex items-center gap-1 text-iron-500 text-sm">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }
  
  return diff > 0 ? (
    <span className="flex items-center gap-1 text-emerald-400 text-sm">
      <TrendingUp className="w-3 h-3" />
      +{percentage}%
    </span>
  ) : (
    <span className="flex items-center gap-1 text-red-400 text-sm">
      <TrendingDown className="w-3 h-3" />
      {percentage}%
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
          weight_kg: weight ? parseFloat(weight) : null,
          body_fat_percent: bodyFat ? parseFloat(bodyFat) : null,
          chest_cm: chest ? parseFloat(chest) : null,
          waist_cm: waist ? parseFloat(waist) : null,
          hips_cm: hips ? parseFloat(hips) : null,
          biceps_cm: biceps ? parseFloat(biceps) : null,
          thighs_cm: thighs ? parseFloat(thighs) : null,
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-iron-900 rounded-xl w-full max-w-lg my-8">
        <div className="p-4 border-b border-iron-700 flex items-center justify-between">
          <h3 className="font-display text-lg text-iron-100">Neue Messung</h3>
          <button onClick={onClose} className="text-iron-400 hover:text-iron-200">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Measurements() {
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
    if (!confirm('Messung wirklich löschen?')) return;
    try {
      await fetch(`${API_BASE}/measurements/${id}`, { method: 'DELETE' });
      await loadMeasurements();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-rust-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-100 tracking-wide">
            Körperdaten
          </h1>
          <p className="text-iron-500 mt-1">Verfolge deine körperliche Entwicklung</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Messen
        </button>
      </header>

      {/* Current Stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-iron-900 rounded-xl p-4">
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
            <TrendIndicator 
              current={parseFloat(latest.weight_kg)} 
              previous={parseFloat(previous?.weight_kg)} 
            />
          </div>

          <div className="bg-iron-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-iron-400 text-sm">Körperfett</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="metric-value text-2xl text-iron-100">
                {latest.body_fat_percent || '-'}
              </span>
              <span className="text-iron-500 text-sm">%</span>
            </div>
            <TrendIndicator 
              current={parseFloat(latest.body_fat_percent)} 
              previous={parseFloat(previous?.body_fat_percent)} 
            />
          </div>

          <div className="bg-iron-900 rounded-xl p-4">
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
            <TrendIndicator 
              current={parseFloat(latest.waist_cm)} 
              previous={parseFloat(previous?.waist_cm)} 
            />
          </div>

          <div className="bg-iron-900 rounded-xl p-4">
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
            <TrendIndicator 
              current={parseFloat(latest.chest_cm)} 
              previous={parseFloat(previous?.chest_cm)} 
            />
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-iron-900 rounded-xl p-5 mb-6">
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
      <div className="bg-iron-900 rounded-xl overflow-hidden">
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
          <div className="p-8 text-center text-iron-500">
            <p>Noch keine Messungen erfasst</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Erste Messung
            </button>
          </div>
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
