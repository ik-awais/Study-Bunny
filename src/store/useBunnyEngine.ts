import { create } from 'zustand';

export type BunnyState = 'IDLE' | 'ROAMING' | 'STUDYING' | 'RELAXING' | 'CELEBRATING' | 'NOTICE_CURSOR' | 'APPROACH_CURSOR' | 'SNIFFING' | 'CARROT_TARGETED' | 'EATING';

export interface SpatialPoint { x: number; y: number; }

export interface BunnyAgent {
  id: string;
  state: BunnyState;
  pos: SpatialPoint;
  target: SpatialPoint | null;
  velocity: number;
  baseScale: number;
  direction: 1 | -1;
  moodTimer: number;
}

interface BunnyEngineState {
  bunnies: BunnyAgent[];
  cursorState: 'normal' | 'carrot';
  
  spawnBunny: (id: string, startPos: SpatialPoint) => void;
  triggerCarrotMode: (bunnyId: string) => void;
  triggerCelebration: () => void;
  setAllStates: (state: BunnyState) => void;
  tick: () => void;
  dropCarrot: (pos: SpatialPoint) => void;
}

// 🚀 PERFORMANCE: Non-reactive cursor ref.
// Updating this on mousemove avoids re-rendering the entire React tree.
export const engineCursorRef = { x: 50, y: 50 };

export const useBunnyEngine = create<BunnyEngineState>()((set) => ({
  bunnies: [],
  cursorState: 'normal',

  spawnBunny: (id, startPos) => set((state) => ({
    bunnies: [...state.bunnies, {
      id, state: 'IDLE', pos: startPos, target: null, 
      velocity: 0.15 + Math.random() * 0.1, 
      baseScale: 0.6 + Math.random() * 0.4, 
      direction: 1, moodTimer: 0
    }]
  })),

  triggerCarrotMode: (bunnyId) => set((state) => {
    // Graceful fallback for touch/mobile devices
    if (window.matchMedia("(pointer: coarse)").matches || state.cursorState === 'carrot') return state;
    return {
      cursorState: 'carrot',
      bunnies: state.bunnies.map(b => b.id === bunnyId ? { ...b, state: 'CARROT_TARGETED', target: null } : b)
    };
  }),

  dropCarrot: (pos) => set((state) => {
    if (state.cursorState !== 'carrot') return state;
    return {
      cursorState: 'normal',
      // Send the bunny to investigate where you dropped it, then go back to normal
      bunnies: state.bunnies.map(b => b.state === 'CARROT_TARGETED' ? { ...b, state: 'ROAMING', target: pos } : b)
    };
  }),

  triggerCelebration: () => set((state) => ({
    bunnies: state.bunnies.map(b => ({ ...b, state: 'CELEBRATING', moodTimer: 60 }))
  })),

  setAllStates: (newState) => set((state) => ({
    bunnies: state.bunnies.map(b => ({ ...b, state: newState, moodTimer: 0 }))
  })),

  // Engine Physics Loop (Runs at 20fps)
  tick: () => set((state) => {
    let carrotEaten = false;

    const updatedBunnies = state.bunnies.map(bunny => {
      let { pos, target, state: bState, direction, moodTimer, velocity } = bunny;

      // 1. Proximity Check (Investigate the cursor if nearby and not busy)
      if (bState === 'IDLE' || bState === 'ROAMING' || bState === 'STUDYING' || bState === 'RELAXING') {
        const dx = engineCursorRef.x - pos.x;
        const dy = engineCursorRef.y - pos.y;
        if (Math.sqrt(dx*dx + dy*dy) < 8 && state.cursorState === 'normal') {
          bState = 'NOTICE_CURSOR'; 
          moodTimer = 20; 
          target = { x: engineCursorRef.x, y: engineCursorRef.y };
        }
      }

      // 2. Process Current State
      moodTimer = Math.max(0, moodTimer - 1);

      switch (bState) {
        case 'IDLE':
          if (moodTimer === 0 && Math.random() > 0.98) {
            bState = 'ROAMING';
            // Roam anywhere, but prefer mid-to-lower screen for 2.5D perspective
            target = { x: 5 + Math.random() * 90, y: 20 + Math.random() * 75 };
          }
          break;
        
        case 'NOTICE_CURSOR':
          if (moodTimer === 0) bState = 'APPROACH_CURSOR';
          direction = target && target.x > pos.x ? 1 : -1;
          break;

        case 'CARROT_TARGETED':
          // Dynamically track the live cursor!
          target = { x: engineCursorRef.x, y: engineCursorRef.y };
          break;

        case 'CELEBRATING':
          if (moodTimer === 0) bState = 'IDLE';
          break;

        case 'EATING':
          if (moodTimer === 0) {
            bState = 'CELEBRATING';
            moodTimer = 30;
          }
          break;
          
        case 'STUDYING':
          // Bunnies in studying state are focused and less reactive
          if (moodTimer === 0 && Math.random() > 0.99) {
            bState = 'RELAXING';
            moodTimer = 60;
          }
          break;
          
        case 'RELAXING':
          if (moodTimer === 0 && Math.random() > 0.97) {
            bState = 'ROAMING';
            target = { x: 5 + Math.random() * 90, y: 20 + Math.random() * 75 };
          }
          break;
      }

      // 3. Movement Physics
      if (['ROAMING', 'APPROACH_CURSOR', 'CARROT_TARGETED'].includes(bState) && target) {
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0.5) direction = dx > 0 ? 1 : -1;

        if (dist < 2.5) { // Collision/Reached Target
          if (bState === 'CARROT_TARGETED') {
            bState = 'EATING';
            moodTimer = 40;
            carrotEaten = true;
          } else if (bState === 'APPROACH_CURSOR') {
            bState = 'SNIFFING';
            moodTimer = 30;
            target = null;
          } else {
            bState = 'IDLE';
            moodTimer = 50 + Math.random() * 50; // Rest
            target = null;
          }
        } else {
          // Move towards target smoothly
          pos = {
            x: pos.x + (dx / dist) * velocity,
            y: pos.y + (dy / dist) * velocity
          };
        }
      }

      return { ...bunny, pos, target, state: bState, direction, moodTimer };
    });

    // Automatically restore normal cursor exactly when the carrot is eaten
    if (carrotEaten && state.cursorState === 'carrot') {
      return { bunnies: updatedBunnies, cursorState: 'normal' };
    }

    return { bunnies: updatedBunnies };
  })
}));