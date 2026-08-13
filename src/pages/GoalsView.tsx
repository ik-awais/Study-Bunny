import { useState } from 'react';
import { Target, Plus, Trophy, X } from 'lucide-react';
import { Card, Button, Input, Select, ProgressBar } from '../components/ui/SharedUI';
import { useDataStore } from '../store/useDataStore';
import { formatDuration } from '../lib/timeUtils';

export const GoalsView = () => {
  const { goals, createGoal, deleteGoal, stats } = useDataStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', hours: 1, type: 'daily' });

  const handleCreate = () => {
    if (!form.title || form.hours <= 0) return;
    createGoal({ 
      title: form.title, 
      type: form.type as 'daily' | 'weekly' | 'monthly' | 'custom', 
      targetMs: form.hours * 60 * 60 * 1000, // Underlying math stays in ms
      status: 'active',
      priority: 'medium'
    });
    setShowModal(false);
    setForm({ title: '', hours: 1, type: 'daily' });
  };

  const getProgressMs = (type: string) => {
    if (type === 'daily') return stats.todayMs;
    if (type === 'weekly') return stats.weeklyMs;
    return stats.totalMs; 
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-rounded font-bold flex items-center gap-3">
          <Target className="w-8 h-8 text-bunny-primary" /> Goals
        </h1>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className="col-span-full py-12 text-center text-bunny-muted bg-bunny-card rounded-3xl border border-bunny-border">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No active goals. Set one up to stay motivated!</p>
          </div>
        ) : (
          goals.map((goal) => {
            const progressMs = getProgressMs(goal.type);
            const percent = Math.min(100, (progressMs / goal.targetMs) * 100);
            
            return (
              <Card key={goal.id} className="flex flex-col justify-between group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-bunny-primary bg-bunny-primary/10 px-2 py-1 rounded-md mb-2 inline-block">
                      {goal.type} Goal
                    </span>
                    <h3 className="font-bold text-lg text-bunny-text leading-tight">{goal.title}</h3>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="text-bunny-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-bunny-error">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="flex items-end gap-2 mb-2">
                    {/* 🚀 CENTRALIZED FORMATTER APPLIED HERE */}
                    <span className="text-3xl font-bold font-rounded">{formatDuration(progressMs, { compact: true })}</span>
                    <span className="text-sm font-bold text-bunny-muted mb-1">/ {formatDuration(goal.targetMs, { compact: true })}</span>
                  </div>
                  <ProgressBar progress={percent} />
                  <div className="flex justify-between text-xs font-bold text-bunny-muted mt-2">
                    <span>{Math.round(percent)}% Complete</span>
                    {/* 🚀 REMAINING TIME FORMATTED */}
                    <span>{formatDuration(Math.max(0, goal.targetMs - progressMs), { compact: true })} left</span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-bunny-text/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md shadow-xl border-bunny-border animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Set a New Goal</h2>
              <button onClick={() => setShowModal(false)} className="text-bunny-muted hover:text-bunny-text">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Goal Title</label>
                <Input placeholder="e.g. Master Calculus" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Type</label>
                  <Select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Target (Hours)</label>
                  <Input type="number" min="0.5" step="0.5" value={form.hours} onChange={e => setForm({...form, hours: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleCreate} className="flex-1 shadow-md">Create Goal</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};