import { Card, EmptyState } from '../components/ui/SharedUI';
import { useDataStore } from '../store/useDataStore';

export const StatsView = () => {
  const { stats, sessions } = useDataStore();
  const hasData = sessions.length > 0;
  
  const formatHrs = (ms: number) => (ms / 3600000).toFixed(1);

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <h1 className="text-3xl font-rounded font-bold mb-8">Your Progress</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Weekly Hours', val: formatHrs(stats.weeklyMs) },
          { label: 'Total Sessions', val: stats.completedCount.toString() },
          { label: 'Current Streak', val: `${stats.streak} Days` },
          { label: 'Avg Session', val: `${Math.round(stats.avgSessionMs / 60000)} m` }
        ].map((stat, i) => (
          <Card key={i} className="text-center p-4">
            <p className="text-xs text-bunny-muted uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold font-rounded text-bunny-text">{stat.val}</p>
          </Card>
        ))}
      </div>

      {!hasData ? (
        <Card><EmptyState title="No stats yet" message="Complete your first study session to see your trends!" /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-bold font-rounded text-xl mb-8">Study Trend (Last 7 Days)</h3>
            <div className="flex items-end justify-between h-48 pt-4 border-b border-bunny-border pb-2 px-2">
              {stats.last7Days.map((day, i) => {
                const heightPercent = Math.min(100, Math.max(5, (day.ms / (4 * 3600000)) * 100)); // normalized to 4hr max
                const dateObj = new Date(day.date + 'T00:00:00'); // Force local interpretation
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div key={i} className="flex flex-col items-center w-full group">
                    <div 
                      className="w-8 md:w-12 bg-bunny-blush rounded-t-lg group-hover:bg-bunny-rose transition-colors relative"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatHrs(day.ms)}h
                      </span>
                    </div>
                    <span className="text-xs text-bunny-muted mt-2">{dayName}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="max-h-[350px] overflow-y-auto">
             <h3 className="font-bold font-rounded text-xl mb-4">Session History</h3>
             <div className="space-y-3">
               {sessions.slice(0, 10).map(s => (
                 <div key={s.id} className="flex justify-between items-center p-3 bg-bunny-cream rounded-xl">
                   <div>
                     <p className="font-bold text-sm">{s.title}</p>
                     <p className="text-xs text-bunny-muted">{s.date} • {s.subject}</p>
                   </div>
                   <span className="text-sm font-bold text-bunny-rose">{Math.round(s.actualDurationMs / 60000)}m</span>
                 </div>
               ))}
             </div>
          </Card>
        </div>
      )}
    </div>
  );
};