import { useEffect, useState, useMemo } from 'react';
import { Play, CheckCircle, Target, TrendingUp, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTimerStore } from '../store/useTimerStore';
import { formatDuration } from '../lib/timeUtils';
import { Card, Button } from '../components/ui/SharedUI';
import { globalNavigate } from '../lib/navigationService';

export const Dashboard = () => {
  const { stats, goals, planner } = useDataStore();
  const { status, phase, accumulatedMs, lastStartTime } = useTimerStore();

  // 🚀 LIVE GOAL CALCULATION (Real-time synchronization without database writes)
  const [liveStudyOffset, setLiveStudyOffset] = useState(0);
  
  useEffect(() => {
    if (status !== 'running' || phase !== 'focus') {
      setLiveStudyOffset(0);
      return;
    }
    const interval = setInterval(() => {
      setLiveStudyOffset(Date.now() - (lastStartTime || Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, phase, lastStartTime]);

  // Aggregate total live today time: 
  // (Database stored todayMs) + (current session paused total) + (live running seconds)
  const totalActiveSessionMs = phase === 'focus' ? (accumulatedMs + liveStudyOffset) : 0;
  const liveTodayMs = stats.todayMs + totalActiveSessionMs;

  const activeDailyGoal = useMemo(() => goals.find(g => g.type === 'daily' && g.status === 'active'), [goals]);
  const goalProgressPct = activeDailyGoal ? Math.min(100, Math.round((liveTodayMs / activeDailyGoal.targetMs) * 100)) : 0;

  const todayUpcoming = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return planner.filter(p => p.date === todayStr && !p.completed).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [planner]);

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-rounded text-bunny-text">Welcome back!</h1>
          <p className="text-bunny-muted">Ready to crush your goals today?</p>
        </div>
        <Button onClick={() => globalNavigate('/timer')} className="gap-2 shadow-md">
          <Play className="w-5 h-5" /> Quick Start
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Real-Time Today's Goal Widget */}
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-bunny-primary to-purple-600 text-white p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <p className="text-white/80 font-bold uppercase tracking-wider text-xs mb-1">Today's Progress</p>
              <h2 className="text-4xl font-bold font-rounded">
                {formatDuration(liveTodayMs, { compact: false })}
              </h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between text-sm font-medium text-white/90 mb-2">
              <span>Goal: {activeDailyGoal ? formatDuration(activeDailyGoal.targetMs, { compact: true }) : 'None set'}</span>
              <span>{goalProgressPct}%</span>
            </div>
            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>
            {status === 'running' && phase === 'focus' && (
              <p className="text-[10px] mt-2 font-bold uppercase tracking-wider text-white/70 animate-pulse flex items-center gap-1">
                <Clock className="w-3 h-3" /> Live tracking active
              </p>
            )}
          </div>
        </Card>

        {/* Quick Stats Widget */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1 p-5 bg-white border-bunny-border flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><Target className="w-5 h-5" /></div>
              <h3 className="font-bold text-bunny-text text-sm">Weekly Total</h3>
            </div>
            <p className="text-2xl font-bold font-rounded">{formatDuration(stats.weeklyMs, { compact: true })}</p>
          </Card>
          
          <Card className="flex-1 p-5 bg-white border-bunny-border flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 text-green-600 rounded-xl"><CheckCircle className="w-5 h-5" /></div>
              <h3 className="font-bold text-bunny-text text-sm">Current Streak</h3>
            </div>
            <p className="text-2xl font-bold font-rounded">{stats.streak} Days</p>
          </Card>
        </div>
      </div>

      {/* Up Next in Planner */}
      <div className="mt-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold font-rounded text-bunny-text">Up Next Today</h2>
          <button onClick={() => globalNavigate('/planner')} className="text-sm font-bold text-bunny-primary hover:underline">View Planner</button>
        </div>
        
        {todayUpcoming.length === 0 ? (
          <Card className="p-6 text-center bg-white border-dashed border-2 border-bunny-border text-bunny-muted">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-sm">Nothing else scheduled for today.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayUpcoming.slice(0, 3).map(event => (
              <Card key={event.id} className="p-4 bg-white border-bunny-border hover:border-bunny-primary/50 transition-colors cursor-pointer" onClick={() => globalNavigate('/planner')}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-bunny-primary bg-bunny-primary/10 px-2 py-1 rounded-md">{event.startTime}</span>
                </div>
                <h3 className="font-bold text-bunny-text mb-1 truncate">{event.title}</h3>
                <p className="text-xs text-bunny-muted truncate">{event.subject}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};