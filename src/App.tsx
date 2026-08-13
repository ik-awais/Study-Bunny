import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { TimerView } from './pages/TimerView';
import { GoalsView } from './pages/GoalsView';
import { PlannerView } from './pages/PlannerView';
import { StatsView } from './pages/StatsView';
import { SettingsView } from './pages/SettingsView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="timer" element={<TimerView />} />
          <Route path="planner" element={<PlannerView />} />
          <Route path="goals" element={<GoalsView />} />
          <Route path="stats" element={<StatsView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;