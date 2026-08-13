import { useState, useEffect } from 'react';
import { Card, Button, Input} from '../components/ui/SharedUI';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTimerStore } from '../store/useTimerStore';
import { formatDuration } from '../lib/timeUtils';
import { useNavigate } from 'react-router-dom';

export const PlannerView = () => {
  const { planner, addPlannerItem} = useDataStore();
  const { start } = useTimerStore();
  const navigate = useNavigate();

  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [baseDate, setBaseDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', subject: '', date: new Date().toLocaleDateString('en-CA'), startTime: '09:00', durationMins: 60, priority: 'medium' });

  // Update current time indicator every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const navDate = (days: number) => setBaseDate(new Date(baseDate.setDate(baseDate.getDate() + days)));
  const navMonth = (months: number) => setBaseDate(new Date(baseDate.setMonth(baseDate.getMonth() + months)));

  // --- CALENDAR MATH UTILS ---
  const getWeekDays = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
    d.setDate(diff);
    return Array.from({length: 7}, (_, i) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + i);
      return copy;
    });
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1);
    
    const days = [];
    for(let i = 0; i < startOffset; i++) days.push(null);
    for(let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  // --- RENDERING HELPERS ---
  const renderTimelineGrid = () => Array.from({length: 24}).map((_, i) => (
    <div key={i} className="flex border-b border-bunny-border/50 h-16 opacity-50 absolute w-full pointer-events-none" style={{ top: `${i * 64}px` }}>
      <span className="w-16 text-[10px] font-bold text-bunny-muted pt-1 bg-bunny-cream/80 pr-2 text-right">{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}</span>
    </div>
  ));

  const renderCurrentTimeLine = (matchDate: Date) => {
    if (matchDate.toLocaleDateString('en-CA') !== currentTime.toLocaleDateString('en-CA')) return null;
    const topOffset = (currentTime.getHours() * 64) + ((currentTime.getMinutes() / 60) * 64);
    return (
      <div className="absolute left-16 right-0 h-0.5 bg-bunny-primary z-20 flex items-center pointer-events-none" style={{ top: `${topOffset}px` }}>
        <div className="w-2 h-2 rounded-full bg-bunny-primary -ml-1"></div>
      </div>
    );
  };

  const renderEvents = (targetDate: Date, leftOffset = '4rem') => {
    const events = planner.filter(p => p.date === targetDate.toLocaleDateString('en-CA'));
    return events.map(event => {
      const [hours, mins] = (event.startTime || '00:00').split(':').map(Number);
      const topOffset = (hours * 64) + ((mins / 60) * 64);
      const height = Math.max((event.plannedDurationMs / 3600000) * 64, 24); // min height 24px

      return (
        <div key={event.id} 
             onClick={() => { start(event.plannedDurationMs / 60000, { title: event.title, subject: event.subject, plannerId: event.id }); navigate('/timer'); }}
             className={`absolute right-2 rounded-xl border p-2 flex flex-col shadow-sm cursor-pointer hover:scale-[1.02] hover:z-30 transition-all overflow-hidden
             ${event.completed ? 'bg-bunny-cream/90 opacity-60 border-bunny-border' : 'bg-white border-l-4 border-l-bunny-primary border-bunny-border'}`} 
             style={{ top: `${topOffset}px`, height: `${height}px`, left: leftOffset }}>
          <span className="font-bold text-xs leading-tight truncate text-bunny-text">{event.title}</span>
          <span className="text-[10px] font-bold text-bunny-muted truncate">{event.startTime} • {formatDuration(event.plannedDurationMs, { compact: true })}</span>
        </div>
      );
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-10 flex flex-col h-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-rounded font-bold flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-bunny-primary" /> Planner
        </h1>
        <div className="flex items-center gap-4 bg-bunny-card border border-bunny-border p-1 rounded-xl shadow-sm">
          {(['day', 'week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${view === v ? 'bg-bunny-primary text-white shadow-sm' : 'text-bunny-muted hover:text-bunny-text'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-bunny-card p-3 rounded-2xl border border-bunny-border shadow-sm">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => view === 'month' ? navMonth(-1) : navDate(view === 'week' ? -7 : -1)}><ChevronLeft className="w-5 h-5"/></Button>
          <Button variant="outline" onClick={() => setBaseDate(new Date())} className="text-xs">Today</Button>
          <Button variant="ghost" onClick={() => view === 'month' ? navMonth(1) : navDate(view === 'week' ? 7 : 1)}><ChevronRight className="w-5 h-5"/></Button>
        </div>
        <span className="font-bold text-lg text-bunny-text">
          {view === 'month' ? baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
           view === 'week' ? `Week of ${getWeekDays(baseDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
           baseDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        <Button onClick={() => setShowModal(true)} className="gap-2"><Plus className="w-4 h-4" /> <span className="hidden md:inline">Schedule</span></Button>
      </div>

      {/* CALENDAR VIEWS */}
      <Card className="flex-1 p-0 overflow-hidden bg-bunny-cream/30 flex flex-col border-bunny-border shadow-sm">
        
        {/* DAY VIEW */}
        {view === 'day' && (
          <div className="relative flex-1 overflow-y-auto min-h-[60vh]">
            <div className="absolute inset-0 h-[1536px]"> {/* 24 * 64px */}
              {renderTimelineGrid()}
              {renderCurrentTimeLine(baseDate)}
              {renderEvents(baseDate)}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (
          <div className="flex flex-col h-full min-h-[60vh]">
            <div className="grid grid-cols-7 border-b border-bunny-border bg-bunny-card sticky top-0 z-20">
              {getWeekDays(baseDate).map((day, i) => (
                <div key={i} className={`p-2 text-center border-r border-bunny-border/50 ${day.toLocaleDateString() === new Date().toLocaleDateString() ? 'bg-bunny-primary/10 text-bunny-primary' : ''}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-bunny-muted">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-xl font-bold">{day.getDate()}</div>
                </div>
              ))}
            </div>
            <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
               <div className="absolute inset-0 h-[1536px] min-w-[700px]">
                 {renderTimelineGrid()}
                 <div className="grid grid-cols-7 absolute inset-0 left-16 right-0">
                   {getWeekDays(baseDate).map((day, i) => (
                     <div key={i} className="relative border-r border-bunny-border/30 h-full">
                       {renderCurrentTimeLine(day)}
                       {renderEvents(day, '4px')}
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {view === 'month' && (
          <div className="flex flex-col h-full min-h-[60vh]">
            <div className="grid grid-cols-7 border-b border-bunny-border bg-bunny-card">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="p-2 text-center text-xs font-bold uppercase text-bunny-muted border-r border-bunny-border/50">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {getMonthDays(baseDate).map((day, i) => (
                <div key={i} onClick={() => { if(day) { setBaseDate(day); setView('day'); } }} 
                     className={`border-r border-b border-bunny-border/50 p-1 md:p-2 min-h-[100px] transition-colors ${day ? 'hover:bg-bunny-card cursor-pointer' : 'bg-bunny-border/10'} ${day?.toLocaleDateString() === new Date().toLocaleDateString() ? 'bg-bunny-primary/5' : ''}`}>
                  {day && (
                    <>
                      <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${day.toLocaleDateString() === new Date().toLocaleDateString() ? 'bg-bunny-primary text-white' : 'text-bunny-text'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {planner.filter(p => p.date === day.toLocaleDateString('en-CA')).slice(0, 3).map(event => (
                          <div key={event.id} className={`text-[10px] p-1 rounded truncate font-bold ${event.completed ? 'bg-bunny-border text-bunny-muted line-through' : 'bg-bunny-primary/10 text-bunny-primary'}`}>
                            {event.startTime} {event.title}
                          </div>
                        ))}
                        {planner.filter(p => p.date === day.toLocaleDateString('en-CA')).length > 3 && (
                          <div className="text-[10px] font-bold text-bunny-muted pl-1">+ more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Creation Modal (Remains heavily intact) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-bunny-text/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md animate-in zoom-in-95 shadow-xl border-bunny-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Schedule Session</h2>
              <button onClick={() => setShowModal(false)} className="text-bunny-muted hover:text-bunny-text"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Title</label>
                <Input placeholder="What are you studying?" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Date</label>
                <Input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Start Time</label>
                  <Input type="time" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-bunny-muted uppercase ml-1">Duration (mins)</label>
                  <Input type="number" min="1" value={newEvent.durationMins} onChange={e => setNewEvent({...newEvent, durationMins: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleAdd} className="flex-1 shadow-md">Add to Calendar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};