import { useEffect, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useTimerStore } from '../../store/useTimerStore';
import { ArticulatedBunny } from './ArticulatedBunny';

interface BunnyInstance {
  id: string;
  mood: 'idle' | 'hopping' | 'sleepy' | 'happy';
  startX: number;
  direction: 1 | -1;
  duration: number;
  scale: number;
}

export const AmbientBunnySystem = () => {
  const { status, phase } = useTimerStore();
  const prefersReducedMotion = useReducedMotion();
  const [bunnies, setBunnies] = useState<BunnyInstance[]>([]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const spawnBunny = () => {
      // Determine mood based on app state
      let mood: BunnyInstance['mood'] = 'idle';
      if (status === 'running') mood = phase === 'focus' ? 'hopping' : 'idle';
      if (status === 'paused') mood = 'sleepy';
      if (status === 'completed') mood = 'happy';

      const newBunny: BunnyInstance = {
        id: Date.now().toString() + Math.random(),
        mood,
        startX: Math.random() > 0.5 ? -10 : 110, // Start offscreen left or right
        direction: Math.random() > 0.5 ? 1 : -1,
        duration: Math.random() * 15 + 15, // 15-30s travel time
        scale: Math.random() * 0.4 + 0.6 // 0.6 to 1.0 scale
      };

      // Set direction based on starting position so they always walk inward
      newBunny.direction = newBunny.startX === -10 ? 1 : -1;

      setBunnies(prev => [...prev, newBunny]);

      // Cleanup bunny after it finishes its journey
      setTimeout(() => {
        setBunnies(prev => prev.filter(b => b.id !== newBunny.id));
      }, newBunny.duration * 1000);
    };

    // Initial spawn
    spawnBunny();

    // Spawn randomly every 10-25 seconds
    const interval = setInterval(spawnBunny, Math.random() * 15000 + 10000);
    return () => clearInterval(interval);
  }, [status, phase, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {bunnies.map((bunny) => (
          <motion.div
            key={bunny.id}
            initial={{ left: `${bunny.startX}vw`, bottom: '2rem', opacity: 0 }}
            animate={{ 
              left: bunny.direction === 1 ? '110vw' : '-10vw',
              opacity: [0, 1, 1, 0] // Fade in and out at edges
            }}
            transition={{ duration: bunny.duration, ease: "linear" }}
            className="absolute"
            style={{ transform: `scale(${bunny.scale})` }}
          >
            <ArticulatedBunny mood={bunny.mood} direction={bunny.direction} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};