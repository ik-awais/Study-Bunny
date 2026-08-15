import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Sparkles, User, Loader2, Maximize2, Minimize2, Mic, CheckCircle, XCircle, X, AlertTriangle, History, Edit2, Trash2, Search } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { executeAIActions } from '../../lib/CommandRegistry';
import { formatDuration } from '../../lib/timeUtils';
import type { AIMessage, AIConversation } from '../../lib/db';
import { Button, Input, Card } from '../ui/SharedUI';

declare global { interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; } }

interface AIAssistantTabProps {
  isMaximized: boolean;
  setIsMaximized: (val: boolean) => void;
  onClose: () => void;
}

export const AIAssistantTab = ({ isMaximized, setIsMaximized, onClose }: AIAssistantTabProps) => {
  const { user } = useAuthStore();
  const timerStore = useTimerStore();
  const { aiConversations, currentChatMessages, loadAiMessages, saveAiMessage, updateAiMessage, renameAiConversation, deleteAiConversation, goals, planner, stats } = useDataStore();
  
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  // 🚀 History UI State
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = aiConversations.find(c => c.id === activeChatId);

  // Auto-select most recent chat on mount
  useEffect(() => {
    if (aiConversations.length > 0 && !activeChatId) setActiveChatId(aiConversations[0].id);
  }, [aiConversations, activeChatId]);

  useEffect(() => {
    if (activeChatId) loadAiMessages(activeChatId);
  }, [activeChatId, loadAiMessages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setShouldAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentChatMessages, isTyping, shouldAutoScroll]);

  const handleNewChat = () => {
    setActiveChatId(`chat_${Date.now()}`);
    loadAiMessages(''); 
    setShowHistory(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setShowHistory(false);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation and all its messages?")) {
      deleteAiConversation(id);
      if (activeChatId === id) setActiveChatId('');
    }
  };

  const startEditingTitle = (chat: AIConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(chat.id);
    setEditTitleText(chat.title);
  };

  const saveEditedTitle = async (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (editingTitleId && editTitleText.trim()) {
      await renameAiConversation(editingTitleId, editTitleText.trim());
    }
    setEditingTitleId(null);
  };

  const filteredConversations = aiConversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported in this browser.');

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => { setInput(prev => (prev + ' ' + e.results[0][0].transcript).trim()); };
    rec.onend = () => setIsDictating(false);
    rec.onerror = () => setIsDictating(false);
    
    recognitionRef.current = rec;
    rec.start();
    setIsDictating(true);
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || isTyping) return;
    
    const chatId = activeChatId || `chat_${Date.now()}`;
    if (!activeChatId) setActiveChatId(chatId);
    
    setInput('');
    setIsTyping(true);
    setShouldAutoScroll(true);

    const isFirstMessage = currentChatMessages.length === 0;

    await saveAiMessage(chatId, 'user', text);

    try {
      const messagesPayload = [
        ...currentChatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ];

      const contextPayload = {
        user: { name: user?.name?.split(' ')[0] },
        currentDateTime: new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        stats: { today: formatDuration(stats.todayMs, { compact: false }), weekly: formatDuration(stats.weeklyMs, { compact: false }), streak: stats.streak },
        goals: goals.filter(g => g.status === 'active').map(g => ({ id: g.id, title: g.title, target: formatDuration(g.targetMs, { compact: true }) })),
        planner: planner.filter(p => !p.completed).map(p => ({ id: p.id, title: p.title, subject: p.subject, date: p.date, startTime: p.startTime, endTime: p.endTime })),
        timer: { status: timerStore.status, phase: timerStore.phase }
      };

      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesPayload, context: contextPayload, generateTitle: isFirstMessage })
      });

      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message);

      await saveAiMessage(chatId, 'assistant', data.message, data.title, data.proposal);
    } catch (error: any) {
      await saveAiMessage(chatId, 'assistant', error.message || 'I encountered a connection error.');
    } finally {
      setIsTyping(false);
    }
  };

  const executeProposal = async (msg: AIMessage) => {
    if (!msg.proposal || msg.proposalState !== 'PENDING') return;
    await updateAiMessage(msg.id, { proposalState: 'EXECUTING' });
    const success = await executeAIActions(msg.proposal.actions);
    if (success) {
      await updateAiMessage(msg.id, { proposalState: 'EXECUTED' });
      await saveAiMessage(msg.conversationId, 'assistant', 'Done! I have safely applied the changes to your Bunny Planner.');
    } else {
      await updateAiMessage(msg.id, { proposalState: 'FAILED' });
      await saveAiMessage(msg.conversationId, 'assistant', 'I encountered an error and could not complete the transaction atomically. No changes were applied.');
    }
  };

  const cancelProposal = async (msg: AIMessage) => {
    if (!msg.proposal || msg.proposalState !== 'PENDING') return;
    await updateAiMessage(msg.id, { proposalState: 'CANCELLED' });
    await saveAiMessage(msg.conversationId, 'assistant', 'No problem. I have cancelled the proposal.');
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^- (.*)/g, '• $1');
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className={`flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in relative ${isMaximized ? '' : 'sm:rounded-b-3xl'}`}>
      
      {/* 🚀 STICKY HEADER */}
      <div className="flex-none flex justify-between items-center p-3 border-b border-bunny-border bg-bunny-cream/95 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button onClick={() => setShowHistory(!showHistory)} variant="ghost" className="p-2 text-bunny-text hover:bg-bunny-primary/10 rounded-lg flex-shrink-0" title="Chat History">
            <History className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-bold text-bunny-muted tracking-wider hidden sm:block">Bunny Assistant</span>
            <span className="text-sm font-bold text-bunny-text truncate">{activeChat ? activeChat.title : 'New Conversation'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-bunny-border shadow-sm flex-shrink-0">
          <Button onClick={handleNewChat} variant="ghost" className="p-1.5 text-bunny-primary hover:bg-bunny-primary/10 rounded-lg text-xs gap-1 hidden sm:flex"><Plus className="w-3.5 h-3.5" /> New Chat</Button>
          <Button onClick={handleNewChat} variant="ghost" className="p-1.5 text-bunny-primary hover:bg-bunny-primary/10 rounded-lg sm:hidden" title="New Chat"><Plus className="w-4 h-4" /></Button>
          <div className="w-px h-4 bg-bunny-border mx-1"></div>
          <Button onClick={() => setIsMaximized(!isMaximized)} variant="ghost" className="p-1.5 text-bunny-muted hover:text-bunny-primary hover:bg-bunny-cream rounded-lg" title={isMaximized ? "Minimize" : "Maximize"}>
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button onClick={onClose} variant="ghost" className="p-1.5 text-bunny-muted hover:text-bunny-error hover:bg-red-50 rounded-lg" title="Close Assistant"><X className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* 🚀 HISTORY DRAWER OVERLAY */}
      {showHistory && (
        <div className="absolute inset-0 top-[60px] z-30 bg-white/95 backdrop-blur-md flex flex-col animate-in slide-in-from-left-2">
          <div className="p-4 border-b border-bunny-border bg-bunny-cream/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-bunny-muted" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="pl-9 w-full bg-white shadow-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredConversations.length === 0 ? (
              <p className="text-center text-sm font-bold text-bunny-muted mt-10">No conversations found.</p>
            ) : (
              filteredConversations.map(chat => (
                <div key={chat.id} onClick={() => handleSelectChat(chat.id)} className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${activeChatId === chat.id ? 'bg-bunny-primary/5 border-bunny-primary shadow-sm' : 'bg-white border-bunny-border hover:border-bunny-primary/50'}`}>
                  {editingTitleId === chat.id ? (
                    <Input autoFocus value={editTitleText} onChange={e => setEditTitleText(e.target.value)} onKeyDown={saveEditedTitle} onBlur={saveEditedTitle} className="h-8 text-sm px-2 w-full max-w-[200px]" onClick={e => e.stopPropagation()} />
                  ) : (
                    <div className="flex flex-col min-w-0 flex-1 pr-4">
                      <span className="text-sm font-bold text-bunny-text truncate">{chat.title}</span>
                      <span className="text-[10px] font-bold text-bunny-muted">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => startEditingTitle(chat, e)} className="p-1.5 text-bunny-muted hover:text-bunny-primary rounded-lg bg-bunny-cream"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleDeleteChat(chat.id, e)} className="p-1.5 text-bunny-muted hover:text-red-500 rounded-lg bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 🚀 INDEPENDENT SCROLL AREA */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-bunny-cream/20">
        {currentChatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <Sparkles className="w-12 h-12 text-bunny-primary mb-3" />
            <h3 className="font-bold text-bunny-text mb-2">Ask Bunny Assistant</h3>
            <div className="flex flex-col gap-2 mt-4 max-w-sm w-full">
              {['How much have I studied this week?', 'What should I focus on today?', 'Schedule a 2 hour physics session tomorrow.'].map(prompt => (
                <button key={prompt} onClick={() => handleSend(prompt)} className="text-xs bg-white border border-bunny-border px-4 py-2 rounded-xl hover:border-bunny-primary hover:text-bunny-primary transition-colors shadow-sm">
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          currentChatMessages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-bunny-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm"><Sparkles className="w-4 h-4" /></div>}
              
              <div className="flex flex-col max-w-[85%]">
                <div className={`p-3 text-sm rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-bunny-primary text-white rounded-tr-sm' : 'bg-white border border-bunny-border text-bunny-text rounded-tl-sm'}`}>
                  {renderMarkdown(msg.content)}
                </div>

                {msg.proposal && (
                  <Card className="mt-2 p-4 bg-white border-2 border-bunny-primary/30 shadow-md">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-bunny-primary mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> Proposed Action</h4>
                    <p className="text-sm font-medium text-bunny-text mb-3 bg-bunny-cream/50 p-2 rounded-lg">{msg.proposal.summary}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                       <span className="text-[10px] uppercase font-bold text-bunny-muted bg-bunny-cream px-2 py-1 rounded-md border border-bunny-border">{msg.proposal.affectedRecords || msg.proposal.actions.length} Records Affected</span>
                    </div>

                    {msg.proposal.conflicts && msg.proposal.conflicts.length > 0 && (
                      <div className="mb-4 p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                        <p className="text-xs font-bold text-orange-700 flex items-center gap-1 mb-1"><AlertTriangle className="w-3.5 h-3.5"/> Schedule Conflict</p>
                        <ul className="text-xs text-orange-600 list-disc list-inside ml-1">{msg.proposal.conflicts.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                      </div>
                    )}
                    
                    {msg.proposalState === 'PENDING' && (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => executeProposal(msg)} className="text-xs py-1.5 px-3 flex-1 min-w-[120px] shadow-sm"><CheckCircle className="w-3.5 h-3.5 mr-1"/> Apply Changes</Button>
                        <Button onClick={() => cancelProposal(msg)} variant="outline" className="text-xs py-1.5 px-3 flex-1 min-w-[120px]"><XCircle className="w-3.5 h-3.5 mr-1"/> Cancel</Button>
                      </div>
                    )}
                    {msg.proposalState === 'EXECUTING' && <span className="text-xs font-bold text-bunny-primary flex items-center gap-1 animate-pulse"><Loader2 className="w-3.5 h-3.5 animate-spin"/> Executing...</span>}
                    {msg.proposalState === 'EXECUTED' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Changes Applied</span>}
                    {msg.proposalState === 'CANCELLED' && <span className="text-xs font-bold text-bunny-muted flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Cancelled</span>}
                    {msg.proposalState === 'FAILED' && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Execution Failed</span>}
                  </Card>
                )}
              </div>

              {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-bunny-cream text-bunny-muted border border-bunny-border flex items-center justify-center flex-shrink-0 shadow-sm"><User className="w-4 h-4" /></div>}
            </div>
          ))
        )}
        
        {isTyping && (
           <div className="flex gap-3 justify-start items-center">
             <div className="w-8 h-8 rounded-full bg-bunny-primary text-white flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4" /></div>
             <div className="bg-white border border-bunny-border p-3 rounded-2xl shadow-sm flex gap-1"><Loader2 className="w-4 h-4 text-bunny-primary animate-spin" /><span className="text-xs text-bunny-muted">Thinking...</span></div>
           </div>
        )}
      </div>

      <div className="flex-none p-3 border-t border-bunny-border bg-white flex gap-2 items-center z-20">
        <button onClick={toggleDictation} className={`p-2.5 rounded-xl transition-colors border shadow-sm flex-shrink-0 ${isDictating ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-bunny-cream border-bunny-border text-bunny-muted hover:text-bunny-primary hover:border-bunny-primary/30'}`} title="Dictate message"><Mic className="w-5 h-5" /></button>
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={isDictating ? "Listening..." : "Ask Bunny Assistant..."} className="flex-1 bg-bunny-cream/30 focus:bg-white min-w-0" disabled={isTyping} />
        <Button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="px-4 shadow-md flex-shrink-0"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};