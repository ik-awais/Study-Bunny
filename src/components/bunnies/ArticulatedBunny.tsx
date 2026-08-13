import { motion } from 'framer-motion';

interface ArticulatedBunnyProps {
  mood: 'idle' | 'hopping' | 'sleepy' | 'happy';
  direction?: 1 | -1;
  className?: string;
}

export const ArticulatedBunny = ({ mood, direction = 1, className = '' }: ArticulatedBunnyProps) => {
  const isHopping = mood === 'hopping';
  const isHappy = mood === 'happy';
  const isSleepy = mood === 'sleepy';

  return (
    <motion.div 
      className={`relative w-24 h-24 ${className}`}
      style={{ scaleX: direction }}
      animate={
        isHopping ? { y: [0, -15, 0], x: [0, 10, 20] } :
        isHappy ? { y: [0, -10, 0] } : 
        { y: 0 }
      }
      transition={{ duration: isHopping ? 0.6 : isHappy ? 0.4 : 2, repeat: isHopping || isHappy ? Infinity : 0, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full overflow-visible">
        
        {/* Soft 2.5D Shading Gradients */}
        <defs>
          <linearGradient id="furGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EAEAEA" />
            <stop offset="100%" stopColor="#BDBDBD" />
          </linearGradient>
          <linearGradient id="backLegGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C4C4C4" />
            <stop offset="100%" stopColor="#9E9E9E" />
          </linearGradient>
        </defs>

        {/* Tail */}
        <circle cx="20" cy="75" r="8" fill="url(#furGradient)" />
        
        {/* Back Leg (Darker for depth) */}
        <motion.ellipse 
          cx="30" 
          cy="85" 
          rx="8" 
          ry="4" 
          fill="url(#backLegGradient)"
          animate={isHopping ? { rotate: [0, -20, 0], cy: [85, 80, 85] } : { rotate: 0, cy: 85 }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />

        {/* Main Body */}
        <ellipse cx="50" cy="65" rx="30" ry="25" fill="url(#furGradient)" />
        
        {/* Front Leg */}
        <motion.ellipse 
          cx="65" 
          cy="85" 
          rx="6" 
          ry="4" 
          fill="url(#furGradient)"
          animate={isHopping ? { rotate: [0, 20, 0], cy: [85, 75, 85] } : { rotate: 0, cy: 85 }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />

        {/* Head Assembly */}
        <motion.g
          animate={
            isHopping ? { y: [0, -5, 0], rotate: [0, 5, 0] } :
            isSleepy ? { y: 5, rotate: -5 } : 
            isHappy ? { rotate: [0, -10, 10, 0] } : { rotate: [0, 2, -2, 0] }
          }
          transition={{ duration: isHopping ? 0.6 : 3, repeat: Infinity }}
          style={{ originX: '70px', originY: '50px' }}
        >
          {/* Ears */}
          <motion.g
            animate={isSleepy ? { rotate: -40, y: 10 } : isHopping ? { rotate: [-10, 10, -10] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{ originX: '70px', originY: '30px' }}
          >
            <ellipse cx="65" cy="25" rx="6" ry="22" transform="rotate(-15 65 25)" fill="url(#backLegGradient)" />
            <ellipse cx="65" cy="25" rx="3" ry="16" transform="rotate(-15 65 25)" fill="#FFD6E0" />
            <ellipse cx="78" cy="28" rx="6" ry="22" transform="rotate(15 78 28)" fill="url(#furGradient)" />
            <ellipse cx="78" cy="28" rx="3" ry="16" transform="rotate(15 78 28)" fill="#FFD6E0" />
          </motion.g>

          {/* Head Base */}
          <ellipse cx="75" cy="50" rx="20" ry="18" fill="url(#furGradient)" />
          
          {/* Facial Features (Readable dark tones) */}
          {isSleepy || isHappy ? (
            <>
              <path d="M 68 48 Q 71 52 74 48" stroke="#4A3F3F" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M 82 48 Q 85 52 88 48" stroke="#4A3F3F" strokeWidth="2" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <circle cx="70" cy="48" r="3" fill="#2D2424" />
              <circle cx="84" cy="48" r="3" fill="#2D2424" />
            </>
          )}

          {/* Blush & Nose */}
          <ellipse cx="68" cy="55" rx="4" ry="2" fill="#FFD6E0" opacity="0.8"/>
          <ellipse cx="86" cy="55" rx="4" ry="2" fill="#FFD6E0" opacity="0.8"/>
          <path d="M75 52 Q77 55 79 52" stroke="#FFB6C1" strokeWidth="2" strokeLinecap="round" fill="none" />
          
          {isSleepy && <text x="85" y="35" fill="#5C4F4F" fontSize="12" fontWeight="bold">z</text>}
        </motion.g>
      </svg>
    </motion.div>
  );
};