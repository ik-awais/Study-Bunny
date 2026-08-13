import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Clock, Calendar, BarChart, Settings, Menu, Target, Mic, MicOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BunnyWorld } from '../bunnies/BunnyWorld';
import { ToastProvider } from '../ui/ToastProvider';
import { useVoiceCommand } from '../../hooks/useVoiceCommand';

const NAV_ITEMS = [
  // ... Keep existing NAV_ITEMS ...
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
  const { isSupported, isListening, toggleListening } = useVoiceCommand();

  return (
    <div className="flex h-screen w-full bg-bunny-cream text-bunny-text relative z-10 overflow-hidden">
      
      {/* 3D-Ready Interactive Environment (z-0) */}
      <BunnyWorld />
      <ToastProvider />
      
      {/* 
        UI LAYER (z-10) 
        Crucial: pointer-events-none here allows clicks to pass through empty space to the BunnyWorld behind it.
        We re-enable pointer-events-auto on interactive elements (sidebar, headers, main content).
      */}
      <div className="absolute inset-0 flex pointer-events-none z-10">
        
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-bunny-card/80 backdrop-blur-md border-b border-bunny-border flex items-center justify-between px-4 z-50 pointer-events-auto">
          {/* ... Keep mobile header logic ... */}
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="p-2 hover:bg-bunny-blush rounded-xl transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="ml-4 font-rounded font-bold text-xl text-bunny-primary">Study Bunny</h1>
          </div>
          {isSupported && (
            <button 
              onClick={toggleListening}
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-bunny-primary text-white animate-pulse' : 'bg-bunny-cream text-bunny-muted'}`}
            >
              {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Sidebar */}
        <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-bunny-card border-r border-bunny-border transform transition-transform duration-300 ease-in-out flex flex-col pointer-events-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => window.innerWidth < 768 && toggleSidebar()}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive ? 'bg-bunny-primary text-white font-bold shadow-md' : 'hover:bg-bunny-cream text-bunny-muted hover:text-bunny-primary'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Desktop Voice Control Toggle */}
            {isSupported && (
               <div className="hidden md:flex items-center justify-between mt-auto p-4 bg-bunny-cream rounded-2xl border border-bunny-border">
                  <span className="text-sm font-bold text-bunny-muted">Voice</span>
                  <button 
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-colors shadow-sm ${isListening ? 'bg-bunny-primary text-white animate-pulse' : 'bg-white text-bunny-muted hover:text-bunny-primary'}`}
                    title="Click to speak a command"
                  >
                    {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
               </div>
            )}
          </div>
        </aside>

        {/* Main Content Container - Catch clicks explicitly on children, not the wrapper */}
        <main className="flex-1 overflow-y-auto pt-16 md:pt-0 relative">
          <div className="max-w-5xl mx-auto p-6 md:p-10 *:pointer-events-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};