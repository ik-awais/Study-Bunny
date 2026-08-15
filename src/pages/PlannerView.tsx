import { useState, useMemo } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, Target, FileText, CheckCircle, Circle, Play, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useTimerStore } from '../store/useTimerStore';
import { globalNavigate } from '../lib/navigationService';
import { calculateDurationMs, addDurationToTime, formatDuration } from '../lib/timeUtils';
import type { PlannerItem } from '../lib/db';
import { Card, Button, Input, Select } from '../components/ui/SharedUI';

export const PlannerView = () => {
  const { planner, goals, addPlannerItem, updatePlannerItem, deletePlannerItem, togglePlanner } = useDataStore();
  const startTimer = useTimerStore(s => s.start);
  const setTimerMode = useTimerStore(s => s.setMode);

  // --- UI State ---
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [detailEvent, setDetailEvent] = useState<PlannerItem | null>(null);
  
  // --- Form State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PlannerItem>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto-sort events by start time
  const dayEvents = useMemo(() => {
    return planner
      .filter(p => p.date === selectedDate)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [planner, selectedDate]);

  // --- Handlers ---
  const handleStartSession = (event: PlannerItem) => {
    setDetailEvent(null);
    setTimerMode('countdown');
    const mins = Math.floor(event.plannedDurationMs / 60000);
    startTimer(mins, {
      title: event.title,
      subject: event.subject,
      plannerId: event.id
    });
    globalNavigate('/timer');
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this planned session? Your historical study records will not be deleted.")) {
      deletePlannerItem(id);
      setDetailEvent(null);
    }
  };

  // --- Form Logic ---
  const openForm = (event?: PlannerItem) => {
    if (event) {
      setEditingId(event.id);
      setFormData({ ...event });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        subject: '',
        date: selectedDate,
        startTime: '09:00',
        endTime: '10:00',
        plannedDurationMs: 60 * 60 * 1000,
        priority: 'medium',
        goalId: '',
        description: '',
        color: '#7c3aed'
      });
    }
    setIsDirty(false);
    setFormError('');
    setDetailEvent(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    setIsFormOpen(false);
  };

  const handleFormChange = (updates: Partial<PlannerItem>) => {
    setIsDirty(true);
    setFormData(prev => {
      const next = { ...prev, ...updates };
      
      // Strict Time/Duration Syncing
      if (updates.startTime && prev.plannedDurationMs) {
        next.endTime = addDurationToTime(updates.startTime, prev.plannedDurationMs);
      } else if (updates.endTime && prev.startTime) {
        next.plannedDurationMs = calculateDurationMs(prev.startTime, updates.endTime);
      } else if (updates.plannedDurationMs && prev.startTime) {
        next.endTime = addDurationToTime(prev.startTime, updates.plannedDurationMs);
      }
      
      return next;
    });
  };

  const saveForm = async () => {
    if (!formData.title?.trim()) return setFormError('Title is required.');
    if (!formData.startTime) return setFormError('Start time is required.');
    if (!formData.endTime) return setFormError('End time is required.');
    if ((formData.plannedDurationMs || 0) <= 0) return setFormError('Duration must be greater than 0.');

    if (editingId) {
      await updatePlannerItem(editingId, formData as Partial<PlannerItem>);
    } else {
      await addPlannerItem(formData as Omit<PlannerItem, 'id' | 'userId'>);
    }
    
    setIsDirty(false);
    setIsFormOpen(false);
  };

  // --- Render ---
  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-rounded text-bunny-text">Study Planner</h1>
          <p className="text-bunny-muted">Organize your sessions and sync directly to the timer.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto font-bold text-bunny-primary"
          />
          <Button onClick={() => openForm()} className="gap-2 flex-shrink-0">
            <Plus className="w-5 h-5" /> New Event
          </Button>
        </div>
      </div>

      {/* Main Timeline View */}
      <Card className="p-4 sm:p-6 bg-white border-bunny-border">
        {dayEvents.length === 0 ? (
          <div className="text-center py-16">
            <CalendarIcon className="w-16 h-16 text-bunny-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-bunny-text mb-2">No events scheduled</h3>
            <p className="text-bunny-muted mb-6">Your day is entirely clear. Ready to plan a session?</p>
            <Button onClick={() => openForm()} variant="outline">Schedule a Session</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(event => (
              <div 
                key={event.id}
                onClick={() => setDetailEvent(event)}
                className={`group flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md ${
                  event.completed ? 'bg-bunny-cream/50 border-transparent opacity-70' : 'bg-white border-bunny-border hover:border-bunny-primary/40'
                }`}
                style={{ borderLeftColor: event.completed ? 'transparent' : event.color || '#7c3aed', borderLeftWidth: '6px' }}
              >
                {/* Time Column */}
                <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end w-full sm:w-24 flex-shrink-0 sm:border-r border-bunny-border/50 sm:pr-4">
                  <span className="font-bold text-bunny-text">{event.startTime}</span>
                  <span className="text-xs text-bunny-muted font-medium">{event.endTime}</span>
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-bold text-lg truncate ${event.completed ? 'line-through text-bunny-muted' : 'text-bunny-text'}`}>
                      {event.title}
                    </h4>
                    {event.priority === 'high' && !event.completed && (
                      <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">High Priority</span>
                    )}
                  </div>
                  <p className="text-sm text-bunny-muted font-medium mb-3">{event.subject}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1 text-bunny-muted bg-bunny-cream px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5" /> {formatDuration(event.plannedDurationMs, { compact: false })}
                    </span>
                    {event.goalId && (
                      <span className="flex items-center gap-1 text-bunny-primary bg-bunny-primary/10 px-2 py-1 rounded-md">
                        <Target className="w-3.5 h-3.5" /> Linked to Goal
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions (Desktop Hover) */}
                <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                  {!event.completed && (
                    <Button onClick={(e) => { e.stopPropagation(); handleStartSession(event); }} className="py-2 px-3 text-xs gap-1">
                      <Play className="w-3.5 h-3.5" /> Start
                    </Button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); togglePlanner(event.id, !event.completed); }}
                    className="p-2 text-bunny-muted hover:text-green-600 bg-bunny-cream rounded-xl"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- EVENT DETAILS MODAL --- */}
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

      {/* --- CREATE / EDIT FORM MODAL --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={closeForm}>
          <Card className="w-full max-w-lg bg-white border-bunny-border shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-bunny-border flex justify-between items-center bg-bunny-cream/30">
              <h2 className="text-xl font-bold font-rounded text-bunny-text">{editingId ? 'Edit Session' : 'Schedule Session'}</h2>
              <button onClick={closeForm} className="p-1 text-bunny-muted hover:bg-bunny-border rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Title *</label>
                  <Input value={formData.title} onChange={e => handleFormChange({ title: e.target.value })} placeholder="e.g. Calculus Integration" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Subject</label>
                  <Input value={formData.subject} onChange={e => handleFormChange({ subject: e.target.value })} placeholder="e.g. Mathematics" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-bunny-cream/50 rounded-2xl border border-bunny-border">
                <div className="col-span-3">
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Date</label>
                  <Input type="date" value={formData.date} onChange={e => handleFormChange({ date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Start Time *</label>
                  <Input type="time" value={formData.startTime} onChange={e => handleFormChange({ startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">End Time *</label>
                  <Input type="time" value={formData.endTime} onChange={e => handleFormChange({ endTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Duration</label>
                  <Select 
                    value={formData.plannedDurationMs} 
                    onChange={e => handleFormChange({ plannedDurationMs: Number(e.target.value) })}
                    className="font-bold text-bunny-primary"
                  >
                    {[15, 25, 30, 45, 60, 90, 120, 180, 240].map(mins => (
                      <option key={mins} value={mins * 60000}>{mins} min</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Priority</label>
                  <Select value={formData.priority} onChange={e => handleFormChange({ priority: e.target.value as any })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Connect to Goal</label>
                  <Select value={formData.goalId || ''} onChange={e => handleFormChange({ goalId: e.target.value })}>
                    <option value="">None</option>
                    {goals.filter(g => g.status === 'active').map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-bunny-muted ml-1 mb-1 block">Notes / Description</label>
                <textarea 
                  value={formData.description || ''} 
                  onChange={e => handleFormChange({ description: e.target.value })} 
                  className="w-full bg-white border border-bunny-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 resize-none h-24"
                  placeholder="Pages to read, specific topics, etc."
                />
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