import { useEffect, useRef } from 'react';
import { useBunnyEngine, engineCursorRef } from '../../store/useBunnyEngine';
import { useTimerStore } from '../../store/useTimerStore';
import { ArticulatedBunny } from './ArticulatedBunny';

export const BunnyWorld = () => {
  const { bunnies, tick, spawnBunny, cursorState, triggerCarrotMode, setAllStates } = useBunnyEngine();
  const { status } = useTimerStore();
  const customCursorRef = useRef<HTMLDivElement>(null);

  // Initialize & Tick Engine
  useEffect(() => {
    if (bunnies.length === 0) {
      spawnBunny('bunny-1', { x: 20, y: 70 });
      spawnBunny('bunny-2', { x: 80, y: 40 });
    }
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [bunnies.length, spawnBunny, tick]);

  // Sync Timer States
  useEffect(() => {
    if (status === 'paused') setAllStates('SLEEPING');
    else if (status === 'running') setAllStates('IDLE'); 
  }, [status, setAllStates]);

  // Native DOM Mouse Tracking (Highly performant, bypasses React state cascade)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Update engine reference for physics math
      engineCursorRef.x = (e.clientX / window.innerWidth) * 100;
      engineCursorRef.y = (e.clientY / window.innerHeight) * 100;
      
      // 2. Visually update the Carrot DOM node instantly
      if (customCursorRef.current) {
        customCursorRef.current.style.left = `${e.clientX}px`;
        customCursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Absolute Wildcard Override: Hides standard cursor across the ENTIRE APP including over inputs/buttons */}
      {cursorState === 'carrot' && (
        <style>{`
          * {
            cursor: none !important;
          }
        `}</style>
      )}

      {/* Global Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        
        {bunnies.map((bunny) => {
          let mood: 'idle' | 'hopping' | 'sleepy' | 'happy' = 'idle';
          if (['ROAMING', 'APPROACH_CURSOR', 'CARROT_TARGETED'].includes(bunny.state)) mood = 'hopping';
          if (['CELEBRATING', 'EATING'].includes(bunny.state)) mood = 'happy';
          if (bunny.state === 'SLEEPING') mood = 'sleepy';

          // 2.5D Depth Engine: Lower Y = higher on screen = further back = smaller + behind.
          const depthScale = bunny.baseScale * (0.5 + (bunny.pos.y / 100) * 0.7);
          const depthZIndex = Math.round(bunny.pos.y * 10);

          return (
            <div
              key={bunny.id}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${bunny.pos.x}vw`,
                top: `${bunny.pos.y}vh`,
                transform: `translate(-50%, -100%) scale(${depthScale})`,
                transition: 'left 50ms linear, top 50ms linear',
                zIndex: depthZIndex
              }}
              onClick={(e) => {
                e.stopPropagation();
                triggerCarrotMode(bunny.id);
              }}
            >
              <ArticulatedBunny mood={mood} direction={bunny.direction} className="w-32 h-32 md:w-48 md:h-48 drop-shadow-md" />
            </div>
          );
        })}
      </div>

      {/* Hardware-accelerated Carrot Cursor Overlay */}
      <div 
        ref={customCursorRef}
        className={`fixed z-[9999] pointer-events-none text-4xl drop-shadow-lg transition-opacity duration-200 ease-in-out ${cursorState === 'carrot' ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: 'translate(-20%, -20%)', willChange: 'left, top' }}
      >
        🥕
      </div>
    </>
  );
};