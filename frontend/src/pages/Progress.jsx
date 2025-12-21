import { useState, useEffect } from 'react';
import { TrendingUp, Trophy, Calendar, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_BASE = '/api';

function ExerciseProgressCard({ exercise }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState([]);
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, recordsRes] = await Promise.all([
        fetch(`${API_BASE}/exercises/${exercise.id}/history`),
        fetch(`${API_BASE}/exercises/${exercise.id}/records`)
      ]);
      
      const historyData = await historyRes.json();
      const recordsData = await recordsRes.json();
      
      // Group by date and get max weight per session
      const groupedByDate = historyData.reduce((acc, log) => {
        const date = log.session_date;
        if (!acc[date]) {
          acc[date] = { date, maxWeight: 0, totalVolume: 0, sets: 0 };
        }
        acc[date].maxWeight = Math.max(acc[date].maxWeight, parseFloat(log.weight_kg) || 0);
        acc[date].totalVolume += (parseFloat(log.weight_kg) || 0) * (log.reps || 0);
        acc[date].sets++;
        return acc;
      }, {});

      const chartData = Object.values(groupedByDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-10);

      setHistory(chartData);
      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading exercise data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && history.length === 0) {
      loadData();
    }
  }, [isExpanded]);

  return (
    <div className="bg-iron-900 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-iron-800/30 transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-rust-400 to-rust-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-iron-100 font-medium">{exercise.name}</p>
          <p className="text-iron-500 text-sm">{exercise.muscle_group}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-iron-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-iron-800 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-rust-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Personal Records */}
              {records && records.max_weight && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-iron-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-iron-400 text-xs uppercase">Max Gewicht</span>
                    </div>
                    <p className="metric-value text-xl text-iron-100">{records.max_weight} kg</p>
                    {records.reps_at_max && (
                      <p className="text-iron-500 text-sm">@ {records.reps_at_max} Wdh</p>
                    )}
                  </div>
                  <div className="bg-iron-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-iron-400 text-xs uppercase">Max Volumen/Set</span>
                    </div>
                    <p className="metric-value text-xl text-iron-100">{Math.round(records.max_volume_set || 0)} kg</p>
                  </div>
                </div>
              )}

              {/* Progress Chart */}
              {history.length > 0 ? (
                <div>
                  <h4 className="text-iron-400 text-xs uppercase tracking-wider mb-3">Gewichtsverlauf</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id={`gradient-${exercise.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4622c" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#d4622c" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
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
                          formatter={(value) => [`${value} kg`, 'Max']}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('de-DE')}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="maxWeight" 
                          stroke="#d4622c" 
                          strokeWidth={2}
                          fill={`url(#gradient-${exercise.id})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-iron-500 text-center py-4">Noch keine Daten vorhanden</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Progress() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Alle');

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

  const muscleGroups = ['Alle', ...new Set(exercises.map(ex => ex.muscle_group))];
  const filteredExercises = filter === 'Alle' 
    ? exercises 
    : exercises.filter(ex => ex.muscle_group === filter);

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
        <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-100 tracking-wide">
          Fortschritt
        </h1>
        <p className="text-iron-500 mt-1">Verfolge deine Entwicklung bei jeder Übung</p>
      </header>

      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {muscleGroups.map(group => (
          <button
            key={group}
            onClick={() => setFilter(group)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === group
                ? 'bg-rust-500 text-white'
                : 'bg-iron-800 text-iron-400 hover:bg-iron-700'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Exercise Progress Cards */}
      <div className="space-y-3">
        {filteredExercises.map(exercise => (
          <ExerciseProgressCard key={exercise.id} exercise={exercise} />
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12 bg-iron-900 rounded-xl">
          <p className="text-iron-500">Keine Übungen in dieser Kategorie</p>
        </div>
      )}
    </div>
  );
}
