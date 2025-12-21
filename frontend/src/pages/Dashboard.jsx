import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Flame, Trophy, TrendingUp, ChevronRight, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '/api';

function StatCard({ icon: Icon, label, value, unit, color, delay }) {
  return (
    <div 
      className={`bg-iron-900 rounded-xl p-5 card-hover opacity-0 animate-slide-up stagger-${delay}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-iron-400 text-sm mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="metric-value text-2xl text-iron-100">{value}</span>
        {unit && <span className="text-iron-500 text-sm">{unit}</span>}
      </div>
    </div>
  );
}

function RecentLift({ name, weight, reps, date, delay }) {
  return (
    <div 
      className={`flex items-center gap-4 p-3 rounded-lg hover:bg-iron-800/50 transition-colors opacity-0 animate-slide-up stagger-${delay}`}
    >
      <div className="w-10 h-10 bg-iron-800 rounded-lg flex items-center justify-center">
        <Trophy className="w-5 h-5 text-rust-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-iron-100 font-medium truncate">{name}</p>
        <p className="text-iron-500 text-sm">{new Date(date).toLocaleDateString('de-DE')}</p>
      </div>
      <div className="text-right">
        <p className="metric-value text-iron-100">{weight} kg</p>
        <p className="text-iron-500 text-sm">{reps} Wdh</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, distRes, sessionsRes] = await Promise.all([
          fetch(`${API_BASE}/stats/dashboard`),
          fetch(`${API_BASE}/stats/muscle-distribution`),
          fetch(`${API_BASE}/sessions`)
        ]);
        
        const statsData = await statsRes.json();
        const distData = await distRes.json();
        const sessionsData = await sessionsRes.json();
        
        setStats(statsData);
        setDistribution(distData.map(d => ({
          name: d.muscle_group,
          sets: parseInt(d.set_count),
          volume: Math.round(parseFloat(d.volume) || 0)
        })));
        setRecentSessions(sessionsData.slice(0, 5));
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-rust-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 opacity-0 animate-fade-in">
        <p className="text-iron-500 text-sm mb-1">Willkommen zurück</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-100 tracking-wide">
          Dashboard
        </h1>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={Calendar} 
          label="Diese Woche" 
          value={stats?.sessions_this_week || 0} 
          unit="Trainings"
          color="bg-gradient-to-br from-rust-400 to-rust-600"
          delay={1}
        />
        <StatCard 
          icon={Dumbbell} 
          label="Gesamt Sessions" 
          value={stats?.total_sessions || 0} 
          color="bg-gradient-to-br from-steel-400 to-steel-600"
          delay={2}
        />
        <StatCard 
          icon={Flame} 
          label="Monats-Volumen" 
          value={Math.round((stats?.monthly_volume_kg || 0) / 1000)} 
          unit="t"
          color="bg-gradient-to-br from-amber-400 to-orange-600"
          delay={3}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Top Lifts" 
          value={stats?.recent_top_lifts?.length || 0} 
          unit="diese Woche"
          color="bg-gradient-to-br from-emerald-400 to-green-600"
          delay={4}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Muscle Distribution Chart */}
        <div className="bg-iron-900 rounded-xl p-5 opacity-0 animate-slide-up stagger-3">
          <h2 className="section-title text-iron-400 text-sm mb-4">Muskelgruppen (30 Tage)</h2>
          {distribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} layout="vertical">
                  <XAxis type="number" stroke="#6b6860" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#6b6860" 
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#33322f', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f7f7f6'
                    }}
                    formatter={(value) => [`${value} Sets`, 'Sätze']}
                  />
                  <Bar 
                    dataKey="sets" 
                    fill="url(#barGradient)" 
                    radius={[0, 4, 4, 0]}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d4622c" />
                      <stop offset="100%" stopColor="#e07b4a" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-iron-500">
              Noch keine Daten vorhanden
            </div>
          )}
        </div>

        {/* Recent Top Lifts */}
        <div className="bg-iron-900 rounded-xl p-5 opacity-0 animate-slide-up stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title text-iron-400 text-sm">Beste Lifts</h2>
          </div>
          <div className="space-y-1">
            {stats?.recent_top_lifts?.length > 0 ? (
              stats.recent_top_lifts.map((lift, i) => (
                <RecentLift 
                  key={i}
                  name={lift.name}
                  weight={lift.weight_kg}
                  reps={lift.reps}
                  date={lift.session_date}
                  delay={i + 1}
                />
              ))
            ) : (
              <div className="text-center py-8 text-iron-500">
                Noch keine Lifts dokumentiert
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="mt-6 bg-iron-900 rounded-xl p-5 opacity-0 animate-slide-up stagger-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-iron-400 text-sm">Letzte Trainings</h2>
          <Link 
            to="/workout" 
            className="flex items-center gap-1 text-rust-400 text-sm hover:text-rust-300 transition-colors"
          >
            Alle anzeigen <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div 
                key={session.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-iron-800/50 transition-colors"
              >
                <div className="w-12 h-12 bg-iron-800 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-rust-400 font-display font-bold text-lg leading-none">
                    {new Date(session.session_date).getDate()}
                  </span>
                  <span className="text-iron-500 text-[10px] uppercase">
                    {new Date(session.session_date).toLocaleDateString('de-DE', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-iron-100 font-medium">
                    {session.plan_name || 'Freies Training'}
                  </p>
                  <p className="text-iron-500 text-sm">
                    {session.duration_minutes ? `${session.duration_minutes} Min` : 'In Arbeit'}
                  </p>
                </div>
                {session.completed_at && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    Abgeschlossen
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-iron-500">
            <p>Noch keine Trainings dokumentiert</p>
            <Link to="/workout" className="btn-primary inline-block mt-4">
              Erstes Training starten
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
