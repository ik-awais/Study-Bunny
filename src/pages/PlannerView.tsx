import { useState } from 'react';
import { Plus, Clock, Trash2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, EmptyState, Input, Select } from '../components/ui/SharedUI';
import { useDataStore } from '../store/useDataStore';
import { useTimerStore } from '../store/useTimerStore';

export const PlannerView = () => {
  const navigate = useNavigate();
  const { planner, createPlanner, togglePlanner, removePlanner } = useDataStore();
  const { start } = useTimerStore();
  
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', duration: 60, priority: 'Medium', date: new Date().toLocaleDateString('en-CA') });

  const handleStart = (p: any) => {
    start(p.plannedDurationMs / 60000, { title: p.title, subject: p.subject, plannerId: p.id });
    navigate('/timer');
  };

  const handleSave = () => {
    if (!form.title) return;
    createPlanner({
      title: form.title, subject: form.subject || 'General',
      plannedDurationMs: form.duration * 60000, date: form.date,
      priority: form.priority as 'High' | 'Medium' | 'Low', completed: false
    });
    setIsAdding(false);
    setForm({ ...form, title: '', subject: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-rounded font-bold">Study Planner</h1>
        <Button onClick={() => setIsAdding(!isAdding)}><Plus className="w-5 h-5" /> Add Session</Button>
      </div>

      {isAdding && (
        <Card className="bg-bunny-blush/20 border-bunny-rose/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Session Title (e.g., Chapter 4)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Input placeholder="Subject (e.g., Biology)" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
            <div className="flex gap-4">
              <Input type="number" min="5" className="w-1/2" value={form.duration} onChange={e => setForm({...form, duration: Number(e.target.value)})} placeholder="Mins" />
              <Select className="w-1/2" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low Priority</option>
              </Select>
            </div>
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Planned Session</Button>
          </div>
        </Card>
      )}

      {planner.length > 0 ? (
        <div className="space-y-4">
          {planner.map((p) => (
            <Card key={p.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${p.completed ? 'opacity-60 bg-bunny-cream/50' : 'hover:border-bunny-rose/30'}`}>
              <div className="flex items-start gap-4">
                <input type="checkbox" checked={p.completed} onChange={(e) => togglePlanner(p.id, e.target.checked)} className="mt-1.5 w-5 h-5 accent-bunny-rose rounded" />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <Badge>{p.subject}</Badge>
                    {p.priority === 'High' && <span className="text-[10px] font-bold text-orange-400 uppercase">High Priority</span>}
                    <span className="text-[10px] font-bold text-bunny-muted uppercase">{p.date}</span>
                  </div>
                  <h3 className={`text-xl font-bold font-rounded ${p.completed ? 'line-through text-bunny-muted' : ''}`}>{p.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-bunny-muted"><Clock className="w-4 h-4" /> {Math.round(p.plannedDurationMs / 60000)}m</span>
                {!p.completed && <Button variant="outline" onClick={() => handleStart(p)} className="h-9 px-4 text-xs"><Play className="w-3 h-3" /> Start</Button>}
                <button onClick={() => removePlanner(p.id)} className="p-2 text-bunny-muted hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12"><EmptyState title="Your day is clear!" message="You haven't planned any study sessions. Time to relax or plan ahead." action={<Button variant="outline" onClick={() => setIsAdding(true)}>Plan a Session</Button>} /></Card>
      )}
    </div>
  );
};