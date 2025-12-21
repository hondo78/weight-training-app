import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Dumbbell, Calendar, TrendingUp, User, ClipboardList, Home } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Plans from './pages/Plans';
import Exercises from './pages/Exercises';
import Progress from './pages/Progress';
import Measurements from './pages/Measurements';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/workout', icon: Dumbbell, label: 'Training' },
    { path: '/plans', icon: ClipboardList, label: 'Pläne' },
    { path: '/exercises', icon: Calendar, label: 'Übungen' },
    { path: '/progress', icon: TrendingUp, label: 'Fortschritt' },
    { path: '/measurements', icon: User, label: 'Körper' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:right-auto md:bottom-0 md:w-20 lg:w-64 z-50">
      <div className="glass md:h-full">
        {/* Logo - desktop only */}
        <div className="hidden md:flex items-center gap-3 p-4 lg:p-6 border-b border-iron-700/50">
          <div className="w-10 h-10 bg-gradient-to-br from-rust-400 to-rust-600 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-display text-xl font-bold tracking-wider text-iron-100">IRON LOG</h1>
            <p className="text-xs text-iron-500 tracking-wide">Training Tracker</p>
          </div>
        </div>

        {/* Navigation items */}
        <ul className="flex md:flex-col justify-around md:justify-start md:py-4 md:gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-3 md:px-4 lg:px-6 md:py-3 transition-all duration-200 ${
                    isActive 
                      ? 'text-rust-400 bg-rust-500/10 md:border-r-2 md:border-rust-500' 
                      : 'text-iron-400 hover:text-iron-200 hover:bg-iron-800/50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 md:w-5 md:h-5 ${isActive ? 'text-rust-400' : ''}`} />
                  <span className={`text-[10px] md:text-sm lg:text-base font-medium ${isActive ? 'text-rust-400' : ''} hidden md:hidden lg:inline`}>
                    {item.label}
                  </span>
                  <span className="text-[10px] md:hidden">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-iron-950">
        <Navigation />
        <main className="pb-20 md:pb-0 md:pl-20 lg:pl-64">
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/exercises" element={<Exercises />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/measurements" element={<Measurements />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
