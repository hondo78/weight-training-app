import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { Dumbbell, TrendingUp, User, ClipboardList, Home, ListChecks, Timer, ChevronRight } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Plans from './pages/Plans';
import Exercises from './pages/Exercises';
import Progress from './pages/Progress';
import Measurements from './pages/Measurements';
import { FeedbackProvider } from './components/ui';
import { getActiveSession, subscribeActiveSession, formatDuration } from './lib/activeSession';

const navItems = [
  { path: '/', icon: Home, label: 'Start' },
  { path: '/workout', icon: Dumbbell, label: 'Training' },
  { path: '/plans', icon: ClipboardList, label: 'Pläne' },
  { path: '/exercises', icon: ListChecks, label: 'Übungen' },
  { path: '/progress', icon: TrendingUp, label: 'Fortschritt' },
  { path: '/measurements', icon: User, label: 'Körper' },
];

function useActiveSession() {
  const [session, setSession] = useState(getActiveSession);
  useEffect(() => subscribeActiveSession(setSession), []);
  return session;
}

function useElapsed(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return startedAt ? (now - new Date(startedAt).getTime()) / 1000 : 0;
}

// Laufendes Training auf allen anderen Seiten sichtbar halten
function ActiveSessionBar({ session }) {
  const elapsed = useElapsed(session?.started_at);
  return (
    <Link
      to="/workout"
      className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-rust-600 to-rust-500 text-white"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="flex-1 min-w-0 text-sm font-medium truncate">
        {session.plan_name || 'Freies Training'} läuft
      </span>
      <Timer className="w-4 h-4 opacity-80" />
      <span className="metric-value text-sm">{formatDuration(elapsed)}</span>
      <ChevronRight className="w-4 h-4 opacity-80" />
    </Link>
  );
}

function Navigation({ activeSession }) {
  const location = useLocation();
  const showBar = activeSession && location.pathname !== '/workout';

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:right-auto md:w-20 lg:w-64 z-50">
      {/* Mobil: Leiste für das laufende Training direkt über der Navigation */}
      {showBar && <div className="md:hidden"><ActiveSessionBar session={activeSession} /></div>}

      <div className="glass md:h-full flex flex-col pb-safe md:pb-0">
        <div className="hidden md:flex items-center gap-3 p-4 lg:p-6 border-b border-iron-700/50">
          <div className="w-10 h-10 bg-gradient-to-br from-rust-400 to-rust-600 rounded-xl flex items-center justify-center shadow-lg shadow-rust-900/40">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-display text-xl font-bold tracking-wider text-iron-50">IRON LOG</h1>
            <p className="text-xs text-iron-500 tracking-wide">Training Tracker</p>
          </div>
        </div>

        <ul className="flex md:flex-col justify-around md:justify-start md:py-4 md:gap-1 md:px-3">
          {navItems.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            const live = item.path === '/workout' && activeSession;
            return (
              <li key={item.path} className="flex-1 md:flex-none">
                <NavLink
                  to={item.path}
                  title={item.label}
                  className={`relative flex flex-col md:flex-row items-center md:justify-center lg:justify-start gap-1 md:gap-3 px-1 pt-2.5 pb-2 md:p-3 lg:px-4 md:rounded-xl transition-colors duration-200 ${
                    isActive
                      ? 'text-rust-400 md:bg-rust-500/10'
                      : 'text-iron-400 hover:text-iron-100 md:hover:bg-iron-800/60'
                  }`}
                >
                  {isActive && <span className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-rust-500" />}
                  <span className="relative">
                    <item.icon className="w-6 h-6 md:w-5 md:h-5" />
                    {live && <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-rust-500 ring-2 ring-iron-900" />}
                  </span>
                  <span className="text-[11px] md:hidden lg:inline lg:text-base font-medium leading-none">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        {activeSession && (
          <div className="hidden lg:block mt-auto p-3">
            <div className="rounded-xl overflow-hidden"><ActiveSessionBar session={activeSession} /></div>
          </div>
        )}
      </div>
    </nav>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const activeSession = useActiveSession();
  const mobileBar = Boolean(activeSession);

  return (
    <BrowserRouter>
      <FeedbackProvider>
        <ScrollToTop />
        <div className="min-h-screen">
          <Navigation activeSession={activeSession} />
          <main className={`${mobileBar ? 'pb-36' : 'pb-24'} md:pb-0 md:pl-20 lg:pl-64`}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/exercises" element={<Exercises />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/measurements" element={<Measurements />} />
            </Routes>
          </main>
        </div>
      </FeedbackProvider>
    </BrowserRouter>
  );
}

export default App;
