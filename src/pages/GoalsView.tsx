import { useState } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { Card, Button, ProgressBar, Input, Select, EmptyState } from '../components/ui/SharedUI';
import { useDataStore } from '../store/useDataStore';

export const GoalsView = () => {
  const { goals, stats, createGoal, removeGoal } = useDataStore();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'daily', hours: 3 });

  const handleSave = () => {
    if (!form.title) return;
    createGoal({ title: form.title, type: form.type as 'daily' | 'weekly', targetMs: form.hours * 60 * 60 * 1000 });
    setIsAdding(false);
    setForm({ title: '', type: 'daily', hours: 3 });
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-rounded font-bold">Goals & Targets</h1>
        <Button onClick={() => setIsAdding(!isAdding)}><Plus className="w-5 h-5" /> New Goal</Button>
      </div>

      {isAdding && (
        <Card className="bg-bunny-blush/20 border-bunny-rose/30 space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Goal Title (e.g., Code Every Day)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="daily">Daily Goal</option>
              <option value="weekly">Weekly Marathon</option>
            </Select>
            <Input type="number" min="1" placeholder="Hours" value={form.hours} onChange={e => setForm({...form, hours: Number(e.target.value)})} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Goal</Button>
          </div>
        </Card>
      )}

      {goals.length === 0 && !isAdding && (
        <Card><EmptyState title="No Goals Set" message="Set a daily or weekly target to track your momentum." /></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(g => {
          const isDaily = g.type === 'daily';
          const progressMs = isDaily ? stats.todayMs : stats.weeklyMs;
          const percentage = Math.min(100, (progressMs / g.targetMs) * 100);
          
          return (
            <Card key={g.id} className={`border-t-4 ${isDaily ? 'border-t-bunny-rose' : 'border-t-blue-400'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold font-rounded text-xl">{g.title}</h3>
                  <p className="text-sm text-bunny-muted">{isDaily ? 'Daily Target' : 'Weekly Target'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => removeGoal(g.id)} className="p-2 text-bunny-muted hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  <Target className={`w-6 h-6 ${isDaily ? 'text-bunny-rose' : 'text-blue-400'}`} />
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold">{(progressMs / 3600000).toFixed(1)} hrs</span>
                <span className="text-bunny-muted">of {g.targetMs / 3600000} hrs</span>
              </div>
              <ProgressBar progress={percentage} indicatorClassName={isDaily ? 'bg-bunny-rose' : 'bg-blue-400'} />
            </Card>
          );
        })}
      </div>
    </div>
  );
};