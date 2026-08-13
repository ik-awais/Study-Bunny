import { Play, Flame, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, ProgressBar, Badge } from '../components/ui/SharedUI';
import { SpotifyWidget } from '../components/spotify/SpotifyWidget';
import { useTimerStore } from '../store/useTimerStore';
import { useDataStore } from '../store/useDataStore';

export const Dashboard = () => {
  const navigate = useNavigate();
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  const { status, remainingMs, start } = useTimerStore();
  const { stats, planner, togglePlanner } = useDataStore();
  
  // Calculate top daily goal dynamically
  const { goals } = useDataStore();
  const defaultDaily = goals.find(g => g.type === 'daily');
  const dailyTargetMs = defaultDaily ? defaultDaily.targetMs : 3 * 3600000;
  
  const todayPlanner = planner.filter(p => p.date === new Date().toLocaleDateString('en-CA'));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-bunny-muted text-sm font-medium uppercase tracking-wider mb-1">{currentDate}</h2>
          <h1 className="text-4xl font-rounded font-bold text-bunny-text">Ready to focus? 🥕</h1>
        </div>
        <div className="flex gap-3">
          <Card className="py-2 px-4 !rounded-2xl flex items-center gap-2 border-bunny-rose/20 bg-bunny-rose/5">
            <Flame className={`w-5 h-5 ${stats.streak > 0 ? 'text-orange-400' : 'text-bunny-muted'}`} />
            <span className="font-bold">{stats.streak} Day Streak</span>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-medium text-bunny-muted mb-1">{defaultDaily ? defaultDaily.title : "Today's Goal"}</h3>
              <div className="text-3xl font-bold font-rounded">
                {(dailyTargetMs / 3600000).toFixed(1)} Hrs
              </div>
            </div>
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{Math.floor(stats.todayMs / 60000)}m done</span>
              <span className="text-bunny-muted">{Math.max(0, Math.floor((dailyTargetMs - stats.todayMs) / 60000))}m left</span>
            </div>
            <ProgressBar progress={(stats.todayMs / dailyTargetMs) * 100} />
          </div>
        </Card>

        <Card className="md:col-span-2 bg-bunny-blush border-bunny-rose/20 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-visible">
          <div>
            <Badge className="bg-white/50 text-bunny-rose mb-3">
              {status === 'running' ? 'Currently Active' : 'Quick Start'}
            </Badge>
            <h2 className="text-3xl font-bold font-rounded mb-1">
              {status === 'running' ? 'Session in Progress' : 'Pomodoro Session'}
            </h2>
            <p className="text-sm opacity-80 text-bunny-text">
              {status === 'running' 
                ? `Time remaining: ${Math.ceil(remainingMs / 60000)} min` 
                : '25 min deep focus • 5 min short break'}
            </p>
          </div>
          <Link to="/timer" className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-all text-bunny-rose flex-shrink-0 z-10">
            <Play fill="currentColor" className="w-8 h-8 ml-1" />
          </Link>
          <div className="absolute -top-4 -right-2 opacity-20 pointer-events-none transform rotate-12">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none"><ellipse cx="30" cy="50" rx="15" ry="40" fill="currentColor"/><ellipse cx="70" cy="50" rx="15" ry="40" fill="currentColor"/></svg>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold font-rounded text-xl">Today's Plan</h3>
            <Link to="/planner" className="text-sm font-medium text-bunny-muted hover:text-bunny-rose">Manage</Link>
          </div>
          
          <div className="space-y-3">
            {todayPlanner.length === 0 ? (
              <p className="text-sm text-bunny-muted py-4 text-center">Nothing planned for today!</p>
            ) : (
              todayPlanner.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${p.completed ? 'bg-bunny-cream/50 opacity-60' : 'bg-bunny-cream hover:bg-bunny-blush/30 group'}`}>
                  <div className="flex items-center gap-4">
                    <input type="checkbox" checked={p.completed} onChange={(e) => togglePlanner(p.id, e.target.checked)} className="w-5 h-5 accent-bunny-rose rounded" />
                    <div>
                      <h4 className={`font-medium ${p.completed ? 'line-through text-bunny-muted' : ''}`}>{p.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-bunny-muted">{Math.round(p.plannedDurationMs / 60000)} min</span>
                        <span className="w-1 h-1 rounded-full bg-bunny-border"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-bunny-rose">{p.subject}</span>
                      </div>
                    </div>
                  </div>
                  {!p.completed && (
                    <Button variant="ghost" onClick={() => { start(p.plannedDurationMs / 60000, { title: p.title, subject: p.subject, plannerId: p.id }); navigate('/timer'); }} className="opacity-0 group-hover:opacity-100 bg-white shadow-sm py-1.5 px-4 text-xs h-8">Start</Button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <SpotifyWidget />
          <Card>
            <h3 className="font-bold font-rounded text-lg mb-4">Today's Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-bunny-muted text-sm">Focus Sessions</span>
                <span className="font-bold">{stats.completedCount} completed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-bunny-muted text-sm">Average Time</span>
                <span className="font-bold">{Math.round(stats.avgSessionMs / 60000)} mins</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};