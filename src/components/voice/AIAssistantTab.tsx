import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Sparkles, User, Loader2, Maximize2, Minimize2, Mic, CheckCircle, XCircle, X } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { executeAIActions } from '../../lib/CommandRegistry';
import { formatDuration } from '../../lib/timeUtils';
import type { AIMessage } from '../../lib/db';
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
  const { aiConversations, currentChatMessages, loadAiMessages, saveAiMessage, updateAiMessage, goals, planner, stats } = useDataStore();
  
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiConversations.length > 0 && !activeChatId) setActiveChatId(aiConversations[0].id);
  }, [aiConversations, activeChatId]);

  useEffect(() => {
    if (activeChatId) loadAiMessages(activeChatId);
  }, [activeChatId, loadAiMessages]);

  // 🚀 Smart Auto-Scroll Behavior
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50; // 50px buffer
    setShouldAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChatMessages, isTyping, shouldAutoScroll]);

  const handleNewChat = () => {
    setActiveChatId(`chat_${Date.now()}`);
    loadAiMessages(''); 
  };

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
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev + ' ' + transcript).trim());
    };
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
    setShouldAutoScroll(true); // Force scroll to bottom on new message

    await saveAiMessage(chatId, 'user', text, text.slice(0, 30));

    try {
      const messagesPayload = [
        ...currentChatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ];

      // 🚀 VERBOSE DATE STRING FOR LLM DATE MATH
      const contextPayload = {
        user: { name: user?.name?.split(' ')[0] },
        currentDateTime: new Date().toLocaleString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        stats: { 
          today: formatDuration(stats.todayMs, { compact: false }), 
          weekly: formatDuration(stats.weeklyMs, { compact: false }), 
          streak: stats.streak 
        },
        goals: goals.filter(g => g.status === 'active').map(g => ({ 
          title: g.title, 
          target: formatDuration(g.targetMs, { compact: true }) 
        })),
        planner: planner.filter(p => !p.completed).map(p => ({ 
          title: p.title, 
          subject: p.subject, 
          date: p.date, 
          startTime: p.startTime 
        })),
        timer: { 
          status: timerStore.status, 
          phase: timerStore.phase 
        }
      };

      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          context: contextPayload
        })
      });

      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message);

      await saveAiMessage(chatId, 'assistant', data.message, undefined, data.proposal);
    } catch (error: any) {
      await saveAiMessage(chatId, 'assistant', error.message || 'I encountered a connection error.');
    } finally {
      setIsTyping(false);
    }
  };

  const executeProposal = async (msg: AIMessage) => {
    // 🚀 STRICT LOCK: Only execute if strictly PENDING. Protects against duplicate clicks.
    if (!msg.proposal || msg.proposalState !== 'PENDING') return;
    
    await updateAiMessage(msg.id, { proposalState: 'EXECUTING' });
    
    const success = await executeAIActions(msg.proposal.actions);
    
    if (success) {
      await updateAiMessage(msg.id, { proposalState: 'EXECUTED' });
      await saveAiMessage(msg.conversationId, 'assistant', 'Done! I have safely applied the complete plan to your Bunny Planner and Goals.');
    } else {
      await updateAiMessage(msg.id, { proposalState: 'FAILED' });
      await saveAiMessage(msg.conversationId, 'assistant', 'I encountered an error and could not complete the plan atomically. No changes were applied.');
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
    <div className={`flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in ${isMaximized ? '' : 'sm:rounded-b-3xl'}`}>
      
      {/* 🚀 STICKY HEADER - Flex None ensures it NEVER scrolls away */}
      <div className="flex-none flex justify-between items-center p-3 border-b border-bunny-border bg-bunny-cream/95 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-bunny-primary hidden sm:block" />
          <select 
            className="text-sm font-bold text-bunny-text bg-white border border-bunny-border rounded-lg px-2 py-1.5 outline-none max-w-[140px] sm:max-w-[200px] truncate cursor-pointer shadow-sm"
            value={activeChatId}
            onChange={(e) => setActiveChatId(e.target.value)}
          >
            {aiConversations.length === 0 && <option value="">New Conversation</option>}
            {aiConversations.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            {activeChatId && !aiConversations.find(c => c.id === activeChatId) && <option value={activeChatId}>New Conversation</option>}
          </select>
        </div>
        
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-bunny-border shadow-sm flex-shrink-0">
          <Button onClick={handleNewChat} variant="ghost" className="p-1.5 text-bunny-primary hover:bg-bunny-primary/10 rounded-lg text-xs gap-1 hidden sm:flex">
            <Plus className="w-3.5 h-3.5" /> New Chat
          </Button>
          <Button onClick={handleNewChat} variant="ghost" className="p-1.5 text-bunny-primary hover:bg-bunny-primary/10 rounded-lg sm:hidden" title="New Chat">
            <Plus className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-4 bg-bunny-border mx-1"></div>
          
          <Button onClick={() => setIsMaximized(!isMaximized)} variant="ghost" className="p-1.5 text-bunny-muted hover:text-bunny-primary hover:bg-bunny-cream rounded-lg" title={isMaximized ? "Minimize" : "Maximize"}>
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          {/* 🚀 DIRECT FULLSCREEN CLOSE BUTTON */}
          <Button onClick={onClose} variant="ghost" className="p-1.5 text-bunny-muted hover:text-bunny-error hover:bg-red-50 rounded-lg" title="Close Assistant">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 🚀 INDEPENDENT SCROLL AREA - Flex 1 min-h-0 securely bounds the scrollbar */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-bunny-cream/20"
      >
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
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-bunny-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              
              <div className="flex flex-col max-w-[85%]">
                <div className={`p-3 text-sm rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-bunny-primary text-white rounded-tr-sm' : 'bg-white border border-bunny-border text-bunny-text rounded-tl-sm'}`}>
                  {renderMarkdown(msg.content)}
                </div>

                {msg.proposal && (
                  <Card className="mt-2 p-4 bg-white border-2 border-bunny-primary/30 shadow-md">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-bunny-primary mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> Proposed Action</h4>
                    <p className="text-sm font-medium text-bunny-text mb-4 bg-bunny-cream/50 p-2 rounded-lg">{msg.proposal.summary}</p>
                    
                    {msg.proposalState === 'PENDING' && (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => executeProposal(msg)} className="text-xs py-1.5 px-3 flex-1 min-w-[120px] shadow-sm"><CheckCircle className="w-3.5 h-3.5 mr-1"/> Add to Bunny Planner</Button>
                        <Button onClick={() => cancelProposal(msg)} variant="outline" className="text-xs py-1.5 px-3 flex-1 min-w-[120px]"><XCircle className="w-3.5 h-3.5 mr-1"/> Cancel</Button>
                      </div>
                    )}
                    
                    {msg.proposalState === 'EXECUTING' && (
                      <span className="text-xs font-bold text-bunny-primary flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin"/> Executing...
                      </span>
                    )}
                    
                    {msg.proposalState === 'EXECUTED' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Action Executed</span>}
                    {msg.proposalState === 'CANCELLED' && <span className="text-xs font-bold text-bunny-muted flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Cancelled</span>}
                    {msg.proposalState === 'FAILED' && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Execution Failed</span>}
                  </Card>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-bunny-cream text-bunny-muted border border-bunny-border flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
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

      {/* 🚀 FIXED COMPOSER - Flex None ensures it docks to the bottom */}
      <div className="flex-none p-3 border-t border-bunny-border bg-white flex gap-2 items-center z-20">
        <button 
          onClick={toggleDictation}
          className={`p-2.5 rounded-xl transition-colors border shadow-sm flex-shrink-0 ${isDictating ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-bunny-cream border-bunny-border text-bunny-muted hover:text-bunny-primary hover:border-bunny-primary/30'}`}
          title="Dictate message"
        >
          <Mic className="w-5 h-5" />
        </button>
        
        <Input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={isDictating ? "Listening..." : "Ask Bunny Assistant..."}
          className="flex-1 bg-bunny-cream/30 focus:bg-white min-w-0"
          disabled={isTyping}
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="px-4 shadow-md flex-shrink-0"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
};