import { useState, useEffect } from 'react';
import { Plus, Clock, Target, FileText, CheckCircle, Circle, Play, Edit2, Trash2, X, AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTimerStore } from '../store/useTimerStore';
import { globalNavigate } from '../lib/navigationService';
import { calculateDurationMs, addDurationToTime} from '../lib/timeUtils';
import type { PlannerItem } from '../lib/db';
import { Card, Button, Input, Select } from '../components/ui/SharedUI';

const timeToMins = (time: string = '00:00') => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toYYYYMMDD = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

const getWeekDays = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  d.setDate(diff);
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
};

const getMonthDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; 
  for (let i = startDay; i > 0; i--) days.push(new Date(year, month, 1 - i));
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
  const endDay = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;
  for (let i = 1; i < 7 - endDay; i++) days.push(new Date(year, month + 1, i));
  return days;
};

// Calculates overlapping positions for a single day's column
const getPositionedEvents = (events: PlannerItem[]) => {
  const sorted = [...events].sort((a,b) => timeToMins(a.startTime) - timeToMins(b.startTime) || b.plannedDurationMs - a.plannedDurationMs);
  const columns: number[] = [];
  const positioned = sorted.map(ev => {
      const start = timeToMins(ev.startTime);
      const end = start + ev.plannedDurationMs / 60000;
      let col = 0;
      while (columns[col] > start) col++;
      columns[col] = end;
      return { ...ev, col };
  });
  const maxCols = Math.max(1, ...positioned.map(e => e.col + 1));
  return positioned.map(ev => ({
      ...ev,
      style: {
          top: `${timeToMins(ev.startTime)}px`, 
          height: `${ev.plannedDurationMs / 60000}px`,
          left: `${(ev.col / maxCols) * 100}%`,
          width: `${100 / maxCols}%`,
      }
  }));
};

const CurrentTimeIndicator = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const top = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${top}px`, transform: 'translateY(-50%)' }}>
       <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm -ml-[5px]"></div>
       <div className="flex-1 border-t-2 border-red-500/80 shadow-sm"></div>
    </div>
  );
};

export const PlannerView = () => {
  const { planner, goals, addPlannerItem, updatePlannerItem, deletePlannerItem, togglePlanner } = useDataStore();
  const startTimer = useTimerStore(s => s.start);
  const setTimerMode = useTimerStore(s => s.setMode);

  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [baseDate, setBaseDate] = useState(new Date());
  const [detailEvent, setDetailEvent] = useState<PlannerItem | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PlannerItem>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState('');

  const navigateDate = (dir: 1 | -1) => {
    const next = new Date(baseDate);
    if (view === 'day') next.setDate(next.getDate() + dir);
    if (view === 'week') next.setDate(next.getDate() + (dir * 7));
    if (view === 'month') next.setMonth(next.getMonth() + dir);
    setBaseDate(next);
  };

  const setToday = () => {
    setBaseDate(new Date());
  };

  const getHeaderLabel = () => {
    if (view === 'day') return baseDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (view === 'week') {
      const week = getWeekDays(baseDate);
      return `${week[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${week[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return baseDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const handleStartSession = (event: PlannerItem) => {
    setDetailEvent(null);
    setTimerMode('countdown');
    startTimer(Math.floor(event.plannedDurationMs / 60000), { title: event.title, subject: event.subject, plannerId: event.id });
    globalNavigate('/timer');
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this planned session? Historical study records remain intact.")) {
      deletePlannerItem(id);
      setDetailEvent(null);
    }
  };

  const openForm = (event?: PlannerItem, defaultDate?: string) => {
    if (event) {
      setEditingId(event.id);
      setFormData({ ...event });
    } else {
      setEditingId(null);
      setFormData({
        title: '', subject: '', date: defaultDate || toYYYYMMDD(baseDate), startTime: '09:00', endTime: '10:00',
        plannedDurationMs: 3600000, priority: 'medium', goalId: '', description: '', color: '#7c3aed'
      });
    }
    setIsDirty(false); setFormError(''); setDetailEvent(null); setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    setIsFormOpen(false);
  };

  const handleFormChange = (updates: Partial<PlannerItem>) => {
    setIsDirty(true);
    setFormData(prev => {
      const next = { ...prev, ...updates };
      if (updates.startTime && prev.plannedDurationMs) next.endTime = addDurationToTime(updates.startTime, prev.plannedDurationMs);
      else if (updates.endTime && prev.startTime) next.plannedDurationMs = calculateDurationMs(prev.startTime, updates.endTime);
      else if (updates.plannedDurationMs && prev.startTime) next.endTime = addDurationToTime(prev.startTime, updates.plannedDurationMs);
      return next;
    });
  };

  const saveForm = async () => {
    if (!formData.title?.trim()) return setFormError('Title is required.');
    if (!formData.startTime || !formData.endTime) return setFormError('Time is required.');
    if ((formData.plannedDurationMs || 0) <= 0) return setFormError('Duration must be greater than 0.');

    if (editingId) await updatePlannerItem(editingId, formData as Partial<PlannerItem>);
    else await addPlannerItem(formData as Omit<PlannerItem, 'id' | 'userId'>);
    setIsDirty(false); setIsFormOpen(false);
  };

  const EventBlock = ({ event }: { event: any }) => (
    <div
      onClick={() => setDetailEvent(event)}
      className={`absolute inset-x-0 mx-0.5 rounded-lg border shadow-sm transition-transform hover:scale-[1.02] cursor-pointer overflow-hidden flex flex-col p-1.5 z-10 ${
        event.completed ? 'bg-bunny-cream/60 border-bunny-border opacity-70' : 'bg-white border-bunny-primary/30'
      }`}
      style={{ ...event.style, borderLeftWidth: '4px', borderLeftColor: event.completed ? '#cbd5e1' : (event.color || '#7c3aed') }}
    >
      <span className={`text-[10px] sm:text-xs font-bold leading-tight truncate ${event.completed ? 'line-through text-bunny-muted' : 'text-bunny-text'}`}>
        {event.title}
      </span>
      {parseInt(event.style.height) >= 45 && (
        <span className="text-[9px] sm:text-[10px] text-bunny-muted truncate">{event.startTime} - {event.subject}</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in pb-10">
      
      {/* 🚀 HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 flex-none">
        <div>
          <h1 className="text-3xl font-bold font-rounded text-bunny-text">Bunny Planner</h1>
          <p className="text-bunny-muted text-sm">Visualize your schedule and study goals.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="flex items-center bg-white border border-bunny-border rounded-xl p-1 shadow-sm">
            {(['day', 'week', 'month'] as const).map(v => (
              <button 
                key={v} onClick={() => setView(v)} 
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${view === v ? 'bg-bunny-primary text-white shadow-sm' : 'text-bunny-muted hover:text-bunny-text'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-white border border-bunny-border rounded-xl p-1 shadow-sm">
            <button onClick={() => navigateDate(-1)} className="p-1.5 text-bunny-muted hover:text-bunny-primary"><ChevronLeft className="w-4 h-4"/></button>
            <Button variant="ghost" onClick={setToday} className="px-3 py-1 h-auto text-xs">Today</Button>
            <button onClick={() => navigateDate(1)} className="p-1.5 text-bunny-muted hover:text-bunny-primary"><ChevronRight className="w-4 h-4"/></button>
          </div>

          <Button onClick={() => openForm()} className="gap-2 text-sm px-4 py-2 ml-auto md:ml-0 shadow-md">
            <Plus className="w-4 h-4" /> New Event
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-bold text-bunny-text mb-4 text-center md:text-left">{getHeaderLabel()}</h2>

      {/* 🚀 CALENDAR VIEWS */}
      <Card className="flex-1 flex flex-col bg-white border-bunny-border overflow-hidden shadow-sm relative">
        
        {/* DAY VIEW */}
        {view === 'day' && (
          <div className="flex-1 overflow-y-auto relative hide-scrollbar">
            <div className="relative h-[1440px] flex">
              <div className="w-16 flex-none border-r border-bunny-border/50 bg-bunny-cream/30">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-[60px] relative">
                    <span className="absolute -top-2.5 right-2 text-[10px] font-bold text-bunny-muted bg-bunny-cream/30 px-1">
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex-1 relative bg-[linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:100%_60px]">
                {toYYYYMMDD(baseDate) === toYYYYMMDD(new Date()) && <CurrentTimeIndicator />}
                {getPositionedEvents(planner.filter(p => p.date === toYYYYMMDD(baseDate))).map(ev => <EventBlock key={ev.id} event={ev} />)}
              </div>
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (() => {
          const weekDays = getWeekDays(baseDate);
          return (
            <div className="flex flex-col h-full">
              <div className="flex-none flex border-b border-bunny-border bg-bunny-cream/50 pr-2">
                <div className="w-12 sm:w-16 flex-none border-r border-bunny-border/50" />
                {weekDays.map(d => {
                  const isToday = toYYYYMMDD(d) === toYYYYMMDD(new Date());
                  return (
                    <div key={d.toISOString()} className="flex-1 text-center py-2 border-r border-bunny-border/50 last:border-r-0">
                      <div className="text-[10px] uppercase font-bold text-bunny-muted">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                      <div className={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-bunny-primary text-white shadow-md' : 'text-bunny-text'}`}>
                        {d.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex-1 overflow-y-auto relative hide-scrollbar">
                <div className="relative h-[1440px] flex">
                  <div className="w-12 sm:w-16 flex-none border-r border-bunny-border/50 bg-bunny-cream/30">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="h-[60px] relative">
                         <span className="absolute -top-2.5 right-1 sm:right-2 text-[9px] sm:text-[10px] font-bold text-bunny-muted">{i === 0 ? '12A' : i < 12 ? `${i}A` : i === 12 ? '12P' : `${i - 12}P`}</span>
                      </div>
                    ))}
                  </div>
                  {weekDays.map(d => {
                    const dateStr = toYYYYMMDD(d);
                    const isToday = dateStr === toYYYYMMDD(new Date());
                    return (
                      <div key={dateStr} className="flex-1 relative border-r border-bunny-border/50 last:border-r-0 bg-[linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:100%_60px]">
                        {isToday && <CurrentTimeIndicator />}
                        {getPositionedEvents(planner.filter(p => p.date === dateStr)).map(ev => <EventBlock key={ev.id} event={ev} />)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* MONTH VIEW */}
        {view === 'month' && (() => {
          const monthDays = getMonthDays(baseDate);
          return (
            <div className="flex flex-col h-full bg-bunny-cream/20">
              <div className="grid grid-cols-7 border-b border-bunny-border bg-white flex-none">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-bunny-muted border-r border-bunny-border/50 last:border-0">{day}</div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto hide-scrollbar">
                {monthDays.map(d => {
                  const dateStr = toYYYYMMDD(d);
                  const isCurrentMonth = d.getMonth() === baseDate.getMonth();
                  const isToday = dateStr === toYYYYMMDD(new Date());
                  const dayEvents = planner.filter(p => p.date === dateStr).sort((a,b) => timeToMins(a.startTime) - timeToMins(b.startTime));
                  
                  return (
                    <div key={d.toISOString()} onClick={() => { setBaseDate(d); setView('day'); }} className={`border-r border-b border-bunny-border/50 p-1 cursor-pointer transition-colors hover:bg-bunny-primary/5 flex flex-col ${!isCurrentMonth ? 'bg-bunny-cream/50 opacity-50' : 'bg-white'}`}>
                      <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-bunny-primary text-white shadow-sm' : 'text-bunny-text'}`}>
                        {d.getDate()}
                      </div>
                      <div className="flex-1 overflow-hidden space-y-1">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div key={ev.id} onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }} className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${ev.completed ? 'bg-bunny-cream text-bunny-muted line-through' : 'bg-bunny-primary/10 text-bunny-primary border border-bunny-primary/20'}`}>
                            {ev.startTime} {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[9px] font-bold text-bunny-muted text-center">+{dayEvents.length - 3} more</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </Card>

      {/* --- EVENT DETAILS MODAL (Reused untouched from Batch 4) --- */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setDetailEvent(null)}>
          <Card className="w-full max-w-md bg-white border-bunny-border shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-bunny-border flex justify-between items-start" style={{ borderTop: `6px solid ${detailEvent.color || '#7c3aed'}` }}>
              <div>
                <h2 className="text-2xl font-bold font-rounded text-bunny-text mb-1">{detailEvent.title}</h2>
                <p className="text-bunny-muted font-medium">{detailEvent.subject}</p>
              </div>
              <button onClick={() => setDetailEvent(null)} className="p-1 text-bunny-muted hover:bg-bunny-cream rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5 bg-bunny-cream/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><CalendarIcon className="w-5 h-5" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-bunny-muted">Date</p><p className="font-bold text-sm">{new Date(detailEvent.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-bunny-muted">Time</p><p className="font-bold text-sm">{detailEvent.startTime} - {detailEvent.endTime}</p></div>
                </div>
              </div>
              
              {detailEvent.goalId && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-bunny-border">
                  <Target className="w-5 h-5 text-bunny-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-bold text-bunny-muted">Connected Goal</p>
                    <p className="font-bold text-sm truncate">{goals.find(g => g.id === detailEvent.goalId)?.title || 'Unknown Goal'}</p>
                  </div>
                </div>
              )}
              
              {detailEvent.description && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-bunny-muted flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> Notes</p>
                  <p className="text-sm text-bunny-text bg-white p-3 rounded-xl border border-bunny-border whitespace-pre-wrap">{detailEvent.description}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-bunny-border flex flex-wrap gap-2">
              <Button onClick={() => handleStartSession(detailEvent)} className="flex-1 py-3 gap-2 shadow-md"><Play className="w-4 h-4" /> Start Timer</Button>
              <Button onClick={() => { setDetailEvent(null); togglePlanner(detailEvent.id, !detailEvent.completed); }} variant="outline" className={`flex-1 py-3 gap-2 border-2 ${detailEvent.completed ? 'text-bunny-muted' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                {detailEvent.completed ? <Circle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} {detailEvent.completed ? 'Mark Incomplete' : 'Complete'}
              </Button>
              <div className="w-full flex gap-2 mt-1">
                <Button onClick={() => openForm(detailEvent)} variant="outline" className="flex-1 text-xs py-2"><Edit2 className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                <Button onClick={() => handleDelete(detailEvent.id)} variant="outline" className="flex-1 text-xs py-2 text-bunny-error hover:bg-red-50 border-red-100"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- CREATE / EDIT FORM MODAL (Reused untouched from Batch 4) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={closeForm}>
          <Card className="w-full max-w-lg bg-white border-bunny-border shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-bunny-border flex justify-between items-center bg-bunny-cream/30">
              <h2 className="text-xl font-bold font-rounded text-bunny-text">{editingId ? 'Edit Session' : 'Schedule Session'}</h2>
              <button onClick={closeForm} className="p-1 text-bunny-muted hover:bg-bunny-border rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-200"><AlertCircle className="w-4 h-4" /> {formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Title *</label><Input value={formData.title} onChange={e => handleFormChange({ title: e.target.value })} placeholder="e.g. Calculus Integration" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Subject</label><Input value={formData.subject} onChange={e => handleFormChange({ subject: e.target.value })} placeholder="e.g. Mathematics" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4 bg-bunny-cream/50 rounded-2xl border border-bunny-border">
                <div className="col-span-3"><label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Date</label><Input type="date" value={formData.date} onChange={e => handleFormChange({ date: e.target.value })} /></div>
                <div><label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Start Time *</label><Input type="time" value={formData.startTime} onChange={e => handleFormChange({ startTime: e.target.value })} /></div>
                <div><label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">End Time *</label><Input type="time" value={formData.endTime} onChange={e => handleFormChange({ endTime: e.target.value })} /></div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Duration</label>
                  <Select value={formData.plannedDurationMs} onChange={e => handleFormChange({ plannedDurationMs: Number(e.target.value) })} className="font-bold text-bunny-primary">
                    {[15, 25, 30, 45, 60, 90, 120, 180, 240].map(mins => <option key={mins} value={mins * 60000}>{mins} min</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Priority</label>
                  <Select value={formData.priority} onChange={e => handleFormChange({ priority: e.target.value as any })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Connect to Goal</label>
                  <Select value={formData.goalId || ''} onChange={e => handleFormChange({ goalId: e.target.value })}><option value="">None</option>{goals.filter(g => g.status === 'active').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</Select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Notes / Description</label>
                <textarea value={formData.description || ''} onChange={e => handleFormChange({ description: e.target.value })} className="w-full bg-white border border-bunny-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 resize-none h-24" placeholder="Pages to read, specific topics, etc." />
              </div>
            </div>
            <div className="p-5 border-t border-bunny-border flex gap-3 bg-white">
              <Button variant="ghost" onClick={closeForm} className="flex-1">Cancel</Button>
              <Button onClick={saveForm} className="flex-1 shadow-md">{editingId ? 'Save Changes' : 'Schedule Session'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};