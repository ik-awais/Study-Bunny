import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Clock, Calendar, BarChart, Settings, Menu, Target, Mic, MicOff, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BunnyWorld } from '../bunnies/BunnyWorld';
import { ToastProvider } from '../ui/ToastProvider';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { VoiceConsole } from '../voice/VoiceConsole';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/timer', label: 'Timer', icon: Clock },
  { path: '/planner', label: 'Planner', icon: Calendar },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/stats', label: 'Statistics', icon: BarChart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const MainLayout = () => {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();
  const { state } = useVoiceCommand();
  const [isConsoleOpen, setConsoleOpen] = useState(false);

  const getMicColor = () => {
    if (state === 'LISTENING') return 'bg-bunny-primary text-white animate-pulse shadow-lg shadow-bunny-primary/30';
    if (state === 'DENIED' || state === 'ERROR') return 'bg-bunny-error text-white';
    return 'bg-white text-bunny-muted hover:text-bunny-primary border border-bunny-border';
  };

  return (
    <div className="flex h-screen w-full bg-bunny-cream text-bunny-text relative overflow-hidden">
      <BunnyWorld />
      <ToastProvider />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-bunny-card/90 backdrop-blur-md border-b border-bunny-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="p-2 hover:bg-bunny-blush rounded-xl transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-4 font-rounded font-bold text-xl text-bunny-primary">Study Bunny</h1>
        </div>
        {state !== 'UNSUPPORTED' && (
          <button onClick={() => setConsoleOpen(true)} className={`p-2 rounded-full transition-all ${getMicColor()}`}>
            {state === 'LISTENING' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-bunny-card border-r border-bunny-border transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-bunny-primary text-white rounded-full flex items-center justify-center shadow-md">
              <span className="text-2xl">🐰</span>
            </div>
            <h1 className="font-rounded font-bold text-2xl tracking-tight text-bunny-primary">Study Bunny</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => window.innerWidth < 768 && toggleSidebar()} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive ? 'bg-bunny-primary text-white font-bold shadow-md' : 'hover:bg-bunny-cream text-bunny-muted hover:text-bunny-primary font-medium'}`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {state !== 'UNSUPPORTED' && (
             <div className="hidden md:flex flex-col mt-auto p-4 bg-bunny-cream rounded-2xl border border-bunny-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-bunny-muted">Voice Engine</span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${state === 'LISTENING' ? 'text-bunny-primary' : state === 'DENIED' ? 'text-bunny-error' : 'text-bunny-muted'}`}>
                      {state}
                    </span>
                  </div>
                  <button onClick={() => setConsoleOpen(true)} className={`p-3 rounded-full transition-all ${getMicColor()}`} title="Open Voice Console">
                    {state === 'LISTENING' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                </div>
                {state === 'DENIED' && (
                  <div className="text-[10px] font-bold text-bunny-error flex gap-1 items-start bg-bunny-error/10 p-2 rounded-lg">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>Please allow microphone access in your browser URL bar.</span>
                  </div>
                )}
             </div>
          )}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 scroll-smooth">
        <div className="max-w-6xl mx-auto p-6 md:p-10 min-h-full flex flex-col">
          <Outlet />
        </div>
      </main>

      <VoiceConsole isOpen={isConsoleOpen} onClose={() => setConsoleOpen(false)} />
    </div>
  );
};