import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, Calendar, BarChart, Settings, Menu, Target, Mic, MicOff} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BunnyWorld } from '../bunnies/BunnyWorld';
import { ToastProvider } from '../ui/ToastProvider';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';
import { VoiceModal } from '../voice/VoiceModal';
import { setGlobalNavigator } from '../../lib/navigationService';

// 🚀 BATCH 7: Updated Nav Labels
const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/timer', label: 'Bunny Timer', icon: Clock },
  { path: '/planner', label: 'Bunny Planner', icon: Calendar },
  { path: '/goals', label: 'Bunny Goals', icon: Target },
  { path: '/stats', label: 'Bunny Progress', icon: BarChart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const MainLayout = () => {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleVoice } = useVoiceCommand();
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setGlobalNavigator(navigate);
  }, [navigate]);

  const getMicColor = () => {
    if (state === 'LISTENING') return 'bg-bunny-primary text-white shadow-sm';
    if (state === 'DENIED' || state === 'ERROR') return 'bg-bunny-error text-white shadow-sm';
    return 'bg-bunny-cream text-bunny-muted hover:bg-bunny-primary/10 hover:text-bunny-primary';
  };

  return (
    <div className="flex h-screen w-full bg-bunny-cream text-bunny-text relative overflow-hidden">
      <BunnyWorld />
      <ToastProvider />
      
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-bunny-card/90 backdrop-blur-md border-b border-bunny-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="p-2 hover:bg-bunny-blush rounded-xl transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-4 font-rounded font-bold text-xl text-bunny-primary">Study Bunny</h1>
        </div>
        {state !== 'UNSUPPORTED' && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-bunny-border shadow-sm">
            <button onClick={() => toggleVoice()} className={`p-2 rounded-full transition-all ${getMicColor()}`} aria-label="Toggle Bunny Voice">
              {state === 'LISTENING' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button onClick={() => setModalOpen(true)} className="p-2 text-bunny-muted hover:text-bunny-primary rounded-full transition-colors" aria-label="Bunny Voice Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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
                    <span className="text-sm font-bold text-bunny-muted">Bunny Voice</span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${state === 'LISTENING' ? 'text-bunny-primary' : state === 'DENIED' || state === 'ERROR' ? 'text-bunny-error' : 'text-bunny-muted'}`}>
                      {state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-bunny-border shadow-sm">
                    <button onClick={() => toggleVoice()} className={`p-2 rounded-full transition-all ${getMicColor()}`} title="Toggle Bunny Voice (Ctrl+Shift+P)">
                      {state === 'LISTENING' ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setModalOpen(true)} className="p-2 text-bunny-muted hover:text-bunny-primary rounded-full transition-colors" title="Bunny Voice Settings">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
             </div>
          )}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 scroll-smooth">
        <div className="max-w-6xl mx-auto p-6 md:p-10 min-h-full flex flex-col">
          <Outlet />
        </div>
      </main>

      <VoiceModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};