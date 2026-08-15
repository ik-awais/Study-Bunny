import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Sparkles, User, Loader2 } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimerStore } from '../../store/useTimerStore';
import { executeAIActions } from '../../lib/CommandRegistry';
import { formatDuration } from '../../lib/timeUtils';
import { Button, Input } from '../ui/SharedUI';

export const AIAssistantTab = () => {
  const { user } = useAuthStore();
  const timerStore = useTimerStore();
  const { aiConversations, currentChatMessages, loadAiMessages, saveAiMessage, deleteAiConversation, goals, planner, stats } = useDataStore();
  
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiConversations.length > 0 && !activeChatId) {
      setActiveChatId(aiConversations[0].id);
    }
  }, [aiConversations, activeChatId]);

  useEffect(() => {
    if (activeChatId) loadAiMessages(activeChatId);
  }, [activeChatId, loadAiMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentChatMessages, isTyping]);

  const handleNewChat = () => {
    setActiveChatId(`chat_${Date.now()}`);
    loadAiMessages(''); 
  };

  const handleClearChat = () => {
    if (activeChatId && window.confirm('Delete this conversation entirely?')) {
      deleteAiConversation(activeChatId);
      setActiveChatId('');
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input.trim();
    if (!text || isTyping) return;
    
    const chatId = activeChatId || `chat_${Date.now()}`;
    if (!activeChatId) setActiveChatId(chatId);
    
    setInput('');
    setIsTyping(true);

    await saveAiMessage(chatId, 'user', text, text.slice(0, 30));

    try {
      const messagesPayload = [
        ...currentChatMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ];

      // 🚀 THE SECURE CONTEXT BUILDER
      const contextPayload = {
        user: { name: user?.name?.split(' ')[0] },
        currentDateTime: new Date().toLocaleString(),
        stats: {
          today: formatDuration(stats.todayMs, { compact: false }),
          weekly: formatDuration(stats.weeklyMs, { compact: false }),
          streak: stats.streak
        },
        goals: goals.filter(g => g.status === 'active').map(g => ({
          title: g.title, target: formatDuration(g.targetMs, { compact: true })
        })),
        planner: planner.filter(p => !p.completed).map(p => ({
          title: p.title, subject: p.subject, date: p.date, startTime: p.startTime
        })),
        timer: {
          status: timerStore.status,
          phase: timerStore.phase,
          subject: timerStore.context?.subject || 'None'
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
      await saveAiMessage(chatId, 'assistant', data.message);

      if (data.actions && data.actions.length > 0) {
        if (data.requiresConfirmation) {
          if (window.confirm(`Bunny Assistant wants to execute actions based on your request.\n\nProceed?`)) {
            await executeAIActions(data.actions);
          }
        } else {
          await executeAIActions(data.actions);
        }
      }
    } catch (error) {
      await saveAiMessage(chatId, 'assistant', 'I lost my connection. Please check your network and try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formatted = formatted.replace(/^- (.*)/g, '• $1');
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-bunny-border overflow-hidden shadow-sm animate-in fade-in">
      <div className="flex justify-between items-center p-3 border-b border-bunny-border bg-bunny-cream/50">
        <select 
          className="text-sm font-bold text-bunny-text bg-transparent outline-none max-w-[200px] truncate cursor-pointer"
          value={activeChatId}
          onChange={(e) => setActiveChatId(e.target.value)}
        >
          {aiConversations.length === 0 && <option value="">New Conversation</option>}
          {aiConversations.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
          {activeChatId && !aiConversations.find(c => c.id === activeChatId) && (
            <option value={activeChatId}>New Conversation</option>
          )}
        </select>
        
        <div className="flex items-center gap-1">
          <Button onClick={handleNewChat} variant="ghost" className="p-2 text-bunny-primary hover:bg-bunny-primary/10 rounded-lg">
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={handleClearChat} variant="ghost" className="p-2 text-bunny-muted hover:text-red-500 hover:bg-red-50 rounded-lg" disabled={!activeChatId || currentChatMessages.length === 0}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-bunny-cream/20">
        {currentChatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <Sparkles className="w-12 h-12 text-bunny-primary mb-3" />
            <h3 className="font-bold text-bunny-text mb-2">Ask Bunny Assistant</h3>
            <div className="flex flex-col gap-2 mt-4">
              {['How much have I studied this week?', 'What should I focus on today?', 'Schedule a 2 hour physics session tomorrow.'].map(prompt => (
                <button 
                  key={prompt} 
                  onClick={() => handleSend(prompt)}
                  className="text-xs bg-white border border-bunny-border px-4 py-2 rounded-xl hover:border-bunny-primary hover:text-bunny-primary transition-colors shadow-sm"
                >
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
              <div className={`max-w-[80%] p-3 text-sm rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-bunny-primary text-white rounded-tr-sm' 
                  : 'bg-white border border-bunny-border text-bunny-text rounded-tl-sm'
              }`}>
                {renderMarkdown(msg.content)}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-bunny-cream text-bunny-muted border border-bunny-border flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-bunny-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white border border-bunny-border p-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
              <Loader2 className="w-4 h-4 text-bunny-primary animate-spin" />
              <span className="text-xs text-bunny-muted font-medium">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-bunny-border bg-white flex gap-2">
        <Input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question or request an action..."
          className="flex-1"
          disabled={isTyping}
        />
        <Button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="px-4 shadow-md">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};