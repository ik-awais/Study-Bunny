import { useState } from 'react';
import { Play, Square, RotateCcw, Pause } from 'lucide-react';
import { BunnyEars, BunnyFaceFocused, BunnySleep, BunnyFaceHappy, BunnyFaceBreak } from '../components/ui/BunnyElements';
import { Badge } from '../components/ui/SharedUI';
import { useTimerStore } from '../store/useTimerStore';

const formatTime = (ms: number) => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const TimerView = () => {
  const { status, mode, phase, remainingMs, targetDurationMs, setMode, start, pause, resume, stop } = useTimerStore();
  const [customMins, setCustomMins] = useState(45);

  const isRunning = status === 'running';
  const progress = status === 'idle' ? 0 : 100 - (remainingMs / targetDurationMs) * 100;
  const strokeDashoffset = 1000 - (1000 * progress) / 100;

  const renderBunnyFace = () => {
    if (status === 'completed') return <BunnyFaceHappy className="w-full text-bunny-text" />;
    if (status === 'paused') return <BunnySleep className="w-full drop-shadow-sm" />;
    if (phase === 'break') return <BunnyFaceBreak className="w-full" />;
    if (isRunning) return <BunnyFaceFocused className="w-full" />;
    return <div className="text-center font-bold text-xl text-bunny-muted tracking-widest">- -</div>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in pb-10">
      
      {/* Mode Selector */}
      <div className="flex bg-bunny-card p-1.5 rounded-2xl shadow-sm border border-bunny-border mb-8 pointer-events-auto">
        <button onClick={() => setMode('pomodoro')} disabled={status !== 'idle'} className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'pomodoro' ? 'bg-bunny-blush text-bunny-text' : 'text-bunny-muted hover:text-bunny-text'} disabled:opacity-50`}>Pomodoro</button>
        <button onClick={() => setMode('countdown')} disabled={status !== 'idle'} className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${mode === 'countdown' ? 'bg-bunny-blush text-bunny-text' : 'text-bunny-muted hover:text-bunny-text'} disabled:opacity-50`}>Custom</button>
      </div>

      {mode === 'countdown' && status === 'idle' && (
        <div className="flex gap-2 mb-8 animate-in slide-in-from-top-2">
          {[15, 30, 45, 60].map(mins => (
            <button key={mins} onClick={() => start(mins)} className="px-4 py-1.5 bg-bunny-card border border-bunny-border rounded-xl text-sm font-medium hover:bg-bunny-cream hover:border-bunny-rose transition-colors">
              {mins}m
            </button>
          ))}
          <input type="number" min="1" max="180" value={customMins} onChange={(e) => setCustomMins(Number(e.target.value))} className="w-16 px-2 py-1.5 bg-bunny-card border border-bunny-border rounded-xl text-sm text-center focus:outline-none focus:border-bunny-rose" />
          <button onClick={() => start(customMins)} className="px-3 py-1.5 bg-bunny-primary text-white rounded-xl text-sm font-medium hover:bg-pink-400">Go</button>
        </div>
      )}

      {/* Timer Visual Assembly */}
      <div className="relative group mt-4">
        <div className={`absolute -top-16 left-1/2 -translate-x-1/2 w-32 transition-transform duration-1000 ${isRunning && phase === 'focus' ? 'translate-y-2' : ''}`}>
          <BunnyEars className={`w-full drop-shadow-sm ${phase === 'break' ? 'opacity-70 rotate-6 translate-y-4' : ''}`} />
        </div>

        <div className="w-72 h-72 md:w-96 md:h-96 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-[12px] border-bunny-cream flex flex-col items-center justify-center relative z-10 transition-all duration-700">
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle cx="50%" cy="50%" r="47%" fill="none" stroke={phase === 'break' ? '#87CEEB' : '#FFD6E0'} strokeWidth="8" strokeDasharray="1000" strokeDashoffset={strokeDashoffset} className="transition-all duration-500 ease-linear" />
          </svg>

          <Badge className={`mb-4 ${phase === 'break' ? 'bg-blue-100 text-blue-600' : 'bg-bunny-rose/10 text-bunny-rose'}`}>
            {phase === 'break' ? 'Take a Break' : 'Focus Phase'}
          </Badge>
          <h1 className="text-7xl md:text-8xl font-rounded font-bold text-bunny-text tracking-tighter tabular-nums z-20">
            {formatTime(remainingMs)}
          </h1>
          
          <div className="absolute bottom-10 w-16 opacity-70 z-20 transition-all duration-300">
            {renderBunnyFace()}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mt-16">
        <button onClick={() => stop(false)} disabled={status === 'idle'} className="p-4 bg-bunny-card rounded-2xl shadow-sm border border-bunny-border text-bunny-muted hover:text-bunny-rose hover:bg-bunny-cream transition-all disabled:opacity-50">
          <RotateCcw className="w-6 h-6" />
        </button>
        
        {status === 'idle' && (
          <button onClick={() => start(mode === 'pomodoro' ? (phase === 'break' ? 5 : 25) : customMins)} className={`px-12 py-5 text-white rounded-3xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3 font-bold text-lg ${phase === 'break' ? 'bg-blue-400 hover:bg-blue-500' : 'bg-bunny-rose hover:bg-pink-400'}`}>
            <Play fill="currentColor" className="w-6 h-6" />
            {phase === 'break' ? 'Start Break' : 'Start Session'}
          </button>
        )}
        
        {status === 'running' && (
          <button onClick={pause} className="px-10 py-5 bg-bunny-card text-bunny-text border border-bunny-border rounded-3xl shadow-md hover:scale-105 transition-all flex items-center gap-3 font-bold text-lg">
            <Pause fill="currentColor" className="w-6 h-6" />
            Pause
          </button>
        )}

        {status === 'paused' && (
          <button onClick={resume} className="px-10 py-5 bg-bunny-rose text-white rounded-3xl shadow-md hover:scale-105 transition-all flex items-center gap-3 font-bold text-lg">
            <Play fill="currentColor" className="w-6 h-6" />
            Resume
          </button>
        )}
        
        {status !== 'idle' && (
          <button onClick={() => stop(false)} className="px-10 py-5 bg-bunny-text text-white rounded-3xl shadow-md hover:scale-105 transition-all flex items-center gap-3 font-bold text-lg">
            <Square fill="currentColor" className="w-6 h-6" />
            Stop
          </button>
        )}
      </div>
    </div>
  );
};