import { useState } from 'react';
import { Card, Button, Input, Select } from '../components/ui/SharedUI';
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { formatDurationAdaptive } from '../lib/timeUtils';

export const PlannerView = () => {
  const { planner, addPlannerItem, togglePlanner } = useDataStore();
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // New Event Modal State
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', subject: '', date: new Date().toLocaleDateString('en-CA'), startTime: '09:00', durationMins: 60, priority: 'medium' });

  const handleAdd = () => {
    addPlannerItem({
      title: newEvent.title || 'Study Session',
      subject: newEvent.subject || 'General',
      plannedDurationMs: newEvent.durationMins * 60000,
      date: newEvent.date,
      startTime: newEvent.startTime,
      priority: newEvent.priority as 'low'|'medium'|'high',
      completed: false
    });
    setShowModal(false);
  };

  const getDayEvents = () => {
    const dateStr = currentDate.toLocaleDateString('en-CA');
    return planner.filter(p => p.date === dateStr).sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  };

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-rounded font-bold flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-bunny-primary" /> Study Calendar
        </h1>
        
        <div className="flex items-center gap-4 bg-bunny-card border border-bunny-border p-1 rounded-xl">
          {(['day', 'week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${view === v ? 'bg-bunny-primary text-white shadow-sm' : 'text-bunny-muted hover:text-bunny-primary'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-bunny-cream p-3 rounded-2xl border border-bunny-border">
        <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))}><ChevronLeft /></Button>
        <span className="font-bold text-lg">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))}><ChevronRight /></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Visual Timeline (Day View Only) */}
        {view === 'day' && (
          <Card className="lg:col-span-3 min-h-[600px] relative p-0 overflow-y-auto bg-bunny-cream/50">
            <div className="absolute inset-0 p-6">
               {/* Generates a visual timeline from 06:00 to 23:00 */}
               {Array.from({length: 18}).map((_, i) => (
                 <div key={i} className="flex border-b border-bunny-border/50 h-16 opacity-50">
                   <span className="w-16 text-xs font-medium text-bunny-muted pt-1">{i + 6}:00</span>
                 </div>
               ))}
               
               {/* Plot events absolutely on the timeline */}
               {getDayEvents().map(event => {
                 const [hours, mins] = (event.startTime || '09:00').split(':').map(Number);
                 const topOffset = ((hours - 6) * 64) + ((mins / 60) * 64) + 24; // 24px padding top
                 const height = (event.plannedDurationMs / 3600000) * 64;
                 
                 // Don't render events earlier than 6am on this visual timeline to save space
                 if (hours < 6) return null;

                 return (
                   <div key={event.id} className={`absolute left-20 right-6 rounded-xl border p-3 flex flex-col justify-between shadow-sm cursor-pointer transition-transform hover:scale-[1.01] ${event.completed ? 'bg-bunny-cream opacity-50 border-bunny-border' : 'bg-white border-bunny-primary/30 border-l-4 border-l-bunny-primary'}`} style={{ top: `${topOffset}px`, height: `${height}px`, minHeight: '40px' }}>
                     <div className="flex justify-between items-start">
                        <span className="font-bold text-sm leading-none">{event.title}</span>
                        <span className="text-[10px] font-bold uppercase text-bunny-muted">{formatDurationAdaptive(event.plannedDurationMs, true)}</span>
                     </div>
                     <span className="text-xs text-bunny-primary">{event.subject}</span>
                   </div>
                 );
               })}
            </div>
          </Card>
        )}

        {/* Right Column: Actions & List */}
        <div className="space-y-4">
          <Button className="w-full" onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5" /> Schedule Session
          </Button>
          
          <Card className="bg-bunny-blush/20">
             <h3 className="font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/> Agenda</h3>
             <div className="space-y-3">
               {getDayEvents().length === 0 ? <p className="text-sm text-bunny-muted">No sessions scheduled.</p> :
                 getDayEvents().map(event => (
                   <div key={event.id} className="flex items-center gap-3">
                     <input type="checkbox" checked={event.completed} onChange={e => togglePlanner(event.id, e.target.checked)} className="accent-bunny-primary" />
                     <div className={event.completed ? 'line-through opacity-50' : ''}>
                       <p className="text-sm font-bold">{event.title}</p>
                       <p className="text-xs text-bunny-muted">{event.startTime} • {formatDurationAdaptive(event.plannedDurationMs, true)}</p>
                     </div>
                   </div>
                 ))
               }
             </div>
          </Card>
        </div>
      </div>

      {/* Rich Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md animate-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">Schedule Session</h2>
            <div className="space-y-4">
              <Input placeholder="What are you studying?" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bunny-muted uppercase">Start Time</label>
                  <Input type="time" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-bunny-muted uppercase">Duration (mins)</label>
                  <Input type="number" min="1" value={newEvent.durationMins} onChange={e => setNewEvent({...newEvent, durationMins: Number(e.target.value)})} />
                </div>
              </div>
              <Select value={newEvent.priority} onChange={e => setNewEvent({...newEvent, priority: e.target.value})}>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </Select>
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleAdd} className="flex-1">Add to Calendar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};