import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Flame, Trophy, Clock, ChevronRight, Calendar, Download, Play, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Spinner, EmptyState } from '../components/ui';
import { formatKg } from '../lib/training';
import { getActiveSession } from '../lib/activeSession';

const API_BASE = '/api';

function relativeDay(date) {
  if (!date) return null;
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(new Date(date))) / 86400000);
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Hallo';
  return 'Guten Abend';
}

function StatCard({ icon: Icon, label, value, unit, color, delay }) {
  return (
    <div className={`card p-4 opacity-0 animate-slide-up stagger-${delay}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-iron-400 text-sm leading-tight">{label}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="metric-value text-2xl text-iron-50">{value}</span>
        {unit && <span className="text-iron-500 text-sm">{unit}</span>}
      </div>
    </div>
  );
}

// Startkarte: laufendes Training fortsetzen oder den am längsten nicht trainierten Plan vorschlagen
function StartCard({ plans }) {
  const active = getActiveSession();
  const next = [...plans]
    .filter(p => p.exercise_count > 0)
    .sort((a, b) => (a.last_used ? new Date(a.last_used) : 0) - (b.last_used ? new Date(b.last_used) : 0))[0];

  const title = active ? (active.plan_name || 'Freies Training') : next ? next.name : 'Freies Training';
  const subtitle = active
    ? 'Dein Training läuft noch'
    : next
      ? `${next.exercise_count} Übungen · ${next.last_used ? `zuletzt ${relativeDay(next.last_used)}` : 'noch nie trainiert'}`
      : 'Übungen frei zusammenstellen';
  const to = active ? '/workout' : next ? `/workout?plan=${next.id}` : '/workout';

  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-2xl p-5 md:p-6 mb-6 bg-gradient-to-br from-rust-500 via-rust-600 to-[#8f3a16] shadow-xl shadow-rust-900/30 opacity-0 animate-slide-up"
    >
      <Dumbbell className="absolute -right-6 -bottom-8 w-40 h-40 text-white/10 -rotate-12 transition-transform group-hover:rotate-0" />
      <p className="text-white/75 text-xs uppercase tracking-widest mb-1">{active ? 'Weitermachen' : 'Als Nächstes'}</p>
      <p className="font-display text-2xl md:text-3xl font-bold text-white tracking-wide">{title}</p>
      <p className="text-white/80 text-sm mt-1">{subtitle}</p>
      <span className="inline-flex items-center gap-2 mt-4 bg-white text-rust-600 font-semibold px-4 py-2.5 rounded-xl shadow-lg">
        <Play className="w-4 h-4" fill="currentColor" />
        {active ? 'Fortsetzen' : 'Training starten'}
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, distRes, sessionsRes, plansRes] = await Promise.all([
          fetch(`${API_BASE}/stats/dashboard`),
          fetch(`${API_BASE}/stats/muscle-distribution`),
          fetch(`${API_BASE}/sessions`),
          fetch(`${API_BASE}/plans`)
        ]);
        setStats(await statsRes.json());
        setDistribution((await distRes.json()).map(d => ({
          name: d.muscle_group,
          sets: parseInt(d.set_count),
          volume: Math.round(parseFloat(d.volume) || 0)
        })));
        setRecentSessions((await sessionsRes.json()).slice(0, 5));
        setPlans(await plansRes.json());
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <Spinner fullPage />;

  const lastSession = recentSessions[0];
  const volumeT = (stats?.monthly_volume_kg || 0) / 1000;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <header className="mb-5 flex items-end justify-between gap-4 opacity-0 animate-fade-in">
        <div>
          <p className="text-iron-400 text-sm">{greeting()}</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-50 tracking-wide">IRON LOG</h1>
        </div>
        <div className="flex items-center gap-1">
          <a href={`${API_BASE}/export?format=csv`} download className="icon-btn" title="Alle Sätze als CSV exportieren (Excel)" aria-label="CSV exportieren">
            <Download className="w-5 h-5" />
          </a>
          <a href={`${API_BASE}/export?format=json`} download className="btn-secondary !px-3 !py-2 text-xs hidden sm:inline-flex" title="Alle Daten als JSON exportieren">
            JSON
          </a>
        </div>
      </header>

      <StartCard plans={plans} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard icon={Calendar} label="Letzte 7 Tage" value={stats?.sessions_this_week || 0} unit="Trainings" color="bg-gradient-to-br from-rust-400 to-rust-600" delay={1} />
        <StatCard icon={Flame} label="Volumen 30 Tage" value={volumeT >= 10 ? Math.round(volumeT) : formatKg(Math.round(volumeT * 10) / 10)} unit="t" color="bg-gradient-to-br from-amber-400 to-orange-600" delay={2} />
        <StatCard icon={Dumbbell} label="Trainings gesamt" value={stats?.total_sessions || 0} color="bg-gradient-to-br from-steel-400 to-steel-600" delay={3} />
        <StatCard icon={Clock} label="Letztes Training" value={lastSession ? relativeDay(lastSession.session_date) : '–'} color="bg-gradient-to-br from-emerald-400 to-green-600" delay={4} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <section className="card p-5 opacity-0 animate-slide-up stagger-3">
          <h2 className="section-title text-iron-400 text-sm mb-4">Sätze je Muskelgruppe · 30 Tage</h2>
          {distribution.length > 0 ? (
            <div style={{ height: Math.max(160, distribution.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" stroke="#6b6860" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#6b6860" fontSize={12} width={80} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ backgroundColor: '#33322f', border: 'none', borderRadius: '8px', color: '#f7f7f6' }}
                    formatter={(value) => [`${value}`, 'Sätze']}
                  />
                  <Bar dataKey="sets" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={18} />
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
            <EmptyState icon={BarChart3} text="Sobald du Sätze abhakst, siehst du hier, welche Muskelgruppen du trainierst." />
          )}
        </section>

        <section className="card p-5 opacity-0 animate-slide-up stagger-4">
          <h2 className="section-title text-iron-400 text-sm mb-3">Schwerste Sätze · 7 Tage</h2>
          {stats?.recent_top_lifts?.length > 0 ? (
            <ul className="space-y-1">
              {stats.recent_top_lifts.map((lift, i) => (
                <li key={i} className="flex items-center gap-3 p-2 rounded-xl">
                  <div className="w-9 h-9 bg-iron-800 rounded-lg flex items-center justify-center shrink-0">
                    <Trophy className={`w-4 h-4 ${i === 0 ? 'text-amber-400' : 'text-iron-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-iron-100 font-medium truncate">{lift.name}</p>
                    <p className="text-iron-500 text-xs">{relativeDay(lift.session_date)}</p>
                  </div>
                  <p className="metric-value text-iron-50 shrink-0">
                    {formatKg(lift.weight_kg)} <span className="text-iron-500 text-sm font-normal">kg × {lift.reps}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Trophy} text="Noch keine Sätze in den letzten 7 Tagen." />
          )}
        </section>
      </div>

      <section className="mt-4 md:mt-6 card p-2 md:p-3 opacity-0 animate-slide-up stagger-5">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <h2 className="section-title text-iron-400 text-sm">Letzte Trainings</h2>
          <Link to="/workout" className="flex items-center gap-1 text-rust-400 text-sm hover:text-rust-300 transition-colors">
            Alle <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {recentSessions.length > 0 ? (
          <ul>
            {recentSessions.map((session) => (
              <li key={session.id}>
                <Link to="/workout" className="flex items-center gap-3 p-2 md:p-3 rounded-xl hover:bg-iron-800/50 transition-colors">
                  <div className="w-12 h-12 bg-iron-800 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span className="text-rust-400 font-display font-bold text-lg leading-none">{new Date(session.session_date).getDate()}</span>
                    <span className="text-iron-500 text-[10px] uppercase">{new Date(session.session_date).toLocaleDateString('de-DE', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-iron-100 font-medium truncate">{session.plan_name || 'Freies Training'}</p>
                    <p className="text-iron-500 text-sm truncate">
                      {session.set_count} Sätze
                      {parseFloat(session.volume_kg) > 0 && ` · ${formatKg(parseFloat(session.volume_kg) / 1000)} t`}
                      {session.duration_minutes ? ` · ${session.duration_minutes} Min` : ''}
                    </p>
                  </div>
                  {session.completed_at
                    ? <span className="px-2 py-1 bg-emerald-500/15 text-emerald-400 text-xs rounded-full shrink-0">Fertig</span>
                    : <span className="px-2 py-1 bg-amber-500/15 text-amber-400 text-xs rounded-full shrink-0">Offen</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Calendar} title="Noch keine Trainings" text="Starte oben dein erstes Training." />
        )}
      </section>
    </div>
  );
}
