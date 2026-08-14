import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { TimerView } from './pages/TimerView';
import { GoalsView } from './pages/GoalsView';
import { PlannerView } from './pages/PlannerView';
import { StatsView } from './pages/StatsView';
import { SettingsView } from './pages/SettingsView';
import { AuthView } from './pages/AuthView';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const { user, isInitialized, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (!isInitialized) return <div className="h-screen w-screen bg-bunny-cream flex items-center justify-center">Loading...</div>;

  // Gatekeeper: Route unauthenticated users strictly to AuthView
  if (!user) {
    return <AuthView />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="timer" element={<TimerView />} />
          <Route path="goals" element={<GoalsView />} />
          <Route path="planner" element={<PlannerView />} />
          <Route path="stats" element={<StatsView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;