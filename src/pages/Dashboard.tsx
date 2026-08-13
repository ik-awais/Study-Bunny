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
  const { stats, planner, togglePlanner, goals } = useDataStore();
  
  const defaultDaily = goals.find(g => g.type === 'daily');
  const dailyTargetMs = defaultDaily ? defaultDaily.targetMs : 3 * 3600000;
  const todayPlanner = planner.filter(p => p.date === new Date().toLocaleDateString('en-CA'));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. Primary Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-bunny-muted text-sm font-bold uppercase tracking-wider mb-1">{currentDate}</h2>
          <h1 className="text-4xl font-rounded font-bold text-bunny-text">Ready to focus? 🥕</h1>
        </div>
        <Card className="py-2 px-5 !rounded-2xl flex items-center gap-2 border-bunny-rose/20 bg-bunny-rose/5 shadow-none">
          <Flame className={`w-5 h-5 ${stats.streak > 0 ? 'text-orange-500' : 'text-bunny-muted'}`} />
          <span className="font-bold text-bunny-text">{stats.streak} Day Streak</span>
        </Card>
      </header>

      {/* 2. Primary Study Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-bunny-primary text-white border-none flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
          <div className="z-10">
            <Badge className="bg-white/20 text-white border-none mb-3">
              {status === 'running' ? 'Currently Active' : 'Quick Start'}
            </Badge>
            <h2 className="text-3xl font-bold font-rounded mb-1">
              {status === 'running' ? 'Session in Progress' : 'Pomodoro Session'}
            </h2>
            <p className="text-sm font-medium opacity-90">
              {status === 'running' ? `Time remaining: ${Math.ceil(remainingMs / 60000)} min` : '25 min deep focus • 5 min short break'}
            </p>
          </div>
          <Link to="/timer" className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 hover:shadow-xl transition-all text-bunny-primary flex-shrink-0 z-10">
            <Play fill="currentColor" className="w-8 h-8 ml-1" />
          </Link>
          <div className="absolute -top-4 -right-2 opacity-10 pointer-events-none transform rotate-12">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor"><ellipse cx="30" cy="50" rx="15" ry="40" /><ellipse cx="70" cy="50" rx="15" ry="40" /></svg>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-bunny-muted mb-1">{defaultDaily ? defaultDaily.title : "Today's Goal"}</h3>
              <div className="text-3xl font-bold font-rounded text-bunny-text">
                {(dailyTargetMs / 3600000).toFixed(1)} Hrs
              </div>
            </div>
            <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-bunny-text">{Math.floor(stats.todayMs / 60000)}m done</span>
              <span className="text-bunny-muted">{Math.max(0, Math.floor((dailyTargetMs - stats.todayMs) / 60000))}m left</span>
            </div>
            <ProgressBar progress={(stats.todayMs / dailyTargetMs) * 100} />
          </div>
        </Card>
      </div>

      {/* 3. Wide Statistics Banner */}
      <Card className="w-full bg-bunny-card border-bunny-border">
         <h3 className="font-bold font-rounded text-lg mb-4 text-bunny-text">Overview</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-bunny-border/50">
            <div className="text-center px-2">
               <p className="text-xs font-bold text-bunny-muted uppercase tracking-wider mb-1">Today</p>
               <p className="text-2xl font-bold font-rounded text-bunny-text">{Math.floor(stats.todayMs / 60000)}m</p>
            </div>
            <div className="text-center px-2 border-l-0 md:border-l">
               <p className="text-xs font-bold text-bunny-muted uppercase tracking-wider mb-1">This Week</p>
               <p className="text-2xl font-bold font-rounded text-bunny-text">{(stats.weeklyMs / 3600000).toFixed(1)}h</p>
            </div>
            <div className="text-center px-2">
               <p className="text-xs font-bold text-bunny-muted uppercase tracking-wider mb-1">Sessions</p>
               <p className="text-2xl font-bold font-rounded text-bunny-text">{stats.completedCount}</p>
            </div>
            <div className="text-center px-2 border-l-0 md:border-l">
               <p className="text-xs font-bold text-bunny-muted uppercase tracking-wider mb-1">Avg Time</p>
               <p className="text-2xl font-bold font-rounded text-bunny-text">{Math.round(stats.avgSessionMs / 60000)}m</p>
            </div>
         </div>
      </Card>

      {/* 4. Secondary Workflow & Companion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold font-rounded text-xl">Today's Plan</h3>
            <Link to="/planner" className="text-sm font-bold text-bunny-muted hover:text-bunny-primary">Manage</Link>
          </div>
          
          <div className="space-y-3">
            {todayPlanner.length === 0 ? (
              <p className="text-sm font-medium text-bunny-muted py-6 text-center">Nothing planned for today!</p>
            ) : (
              todayPlanner.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${p.completed ? 'bg-bunny-cream/50 opacity-60' : 'bg-bunny-cream hover:bg-bunny-blush/40 group'}`}>
                  <div className="flex items-center gap-4">
                    <input type="checkbox" checked={p.completed} onChange={(e) => togglePlanner(p.id, e.target.checked)} className="w-5 h-5 accent-bunny-primary rounded cursor-pointer" />
                    <div>
                      <h4 className={`font-bold text-bunny-text ${p.completed ? 'line-through text-bunny-muted' : ''}`}>{p.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-bunny-muted">{Math.round(p.plannedDurationMs / 60000)} min</span>
                        <span className="w-1 h-1 rounded-full bg-bunny-border"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-bunny-primary">{p.subject}</span>
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

        <div className="h-[220px]">
          <SpotifyWidget />
        </div>
      </div>
    </div>
  );
};