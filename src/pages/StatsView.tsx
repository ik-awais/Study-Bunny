import { BarChart as BarChartIcon, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/SharedUI';
import { useDataStore } from '../store/useDataStore';
import { formatDuration } from '../lib/timeUtils';

export const StatsView = () => {
  const { stats, history } = useDataStore();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-10">
      <div className="flex items-center gap-3">
        <BarChartIcon className="w-8 h-8 text-bunny-primary" />
        <h1 className="text-3xl font-rounded font-bold">Statistics</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center justify-center text-center py-6">
          <Clock className="w-6 h-6 text-bunny-primary mb-2 opacity-80" />
          <span className="text-3xl font-bold font-rounded text-bunny-text">
            {/* 🚀 TOTAL TIME ADAPTIVE FORMAT */}
            {formatDuration(stats.totalMs, { compact: true })}
          </span>
          <span className="text-xs font-bold text-bunny-muted uppercase tracking-wider mt-1">Total Focus</span>
        </Card>
        
        <Card className="flex flex-col items-center justify-center text-center py-6">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2 opacity-80" />
          <span className="text-3xl font-bold font-rounded text-bunny-text">{stats.completedCount}</span>
          <span className="text-xs font-bold text-bunny-muted uppercase tracking-wider mt-1">Sessions Completed</span>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center py-6">
          <TrendingUp className="w-6 h-6 text-orange-500 mb-2 opacity-80" />
          <span className="text-3xl font-bold font-rounded text-bunny-text">{stats.streak}</span>
          <span className="text-xs font-bold text-bunny-muted uppercase tracking-wider mt-1">Day Streak</span>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center py-6">
          <BarChartIcon className="w-6 h-6 text-bunny-primary mb-2 opacity-80" />
          <span className="text-3xl font-bold font-rounded text-bunny-text">
            {/* 🚀 AVERAGE TIME ADAPTIVE FORMAT */}
            {formatDuration(stats.avgSessionMs, { compact: true })}
          </span>
          <span className="text-xs font-bold text-bunny-muted uppercase tracking-wider mt-1">Avg Session</span>
        </Card>
      </div>

      <Card className="bg-bunny-card border-bunny-border">
        <h2 className="text-xl font-bold mb-6 font-rounded">Recent Study History</h2>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-bunny-muted py-8 text-sm font-bold">No sessions recorded yet.</p>
          ) : (
            history.map((session) => (
              <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-bunny-cream/50 rounded-2xl hover:bg-bunny-cream transition-colors border border-bunny-border/50 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-bunny-text text-sm">{session.title}</h3>
                    {session.completed && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Completed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-bunny-primary uppercase tracking-wider">{session.subject}</span>
                    <span className="w-1 h-1 rounded-full bg-bunny-border"></span>
                    <span className="text-xs font-medium text-bunny-muted">
                      {new Date(session.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end bg-white/50 px-4 py-2 rounded-xl border border-bunny-border/30">
                  {/* 🚀 ACTUAL STUDY TIME */}
                  <span className="font-bold text-bunny-text text-sm">
                    Focus: {formatDuration(session.actualDurationMs, { compact: true })}
                  </span>
                  {/* 🚀 PAUSE/REST TIME */}
                  {session.pauseDurationMs > 0 && (
                    <span className="text-xs font-bold text-bunny-muted mt-0.5">
                      Rest: {formatDuration(session.pauseDurationMs, { compact: true })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};