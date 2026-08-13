export const BunnyEars = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 60" fill="none" className={className}>
    {/* Left Ear */}
    <ellipse cx="30" cy="40" rx="14" ry="38" transform="rotate(-20 30 40)" fill="#FFFFFF" />
    <ellipse cx="30" cy="40" rx="7" ry="28" transform="rotate(-20 30 40)" fill="#FFD6E0" />
    {/* Right Ear */}
    <ellipse cx="70" cy="40" rx="14" ry="38" transform="rotate(20 70 40)" fill="#FFFFFF" />
    <ellipse cx="70" cy="40" rx="7" ry="28" transform="rotate(20 70 40)" fill="#FFD6E0" />
  </svg>
);

export const BunnyFaceFocused = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
    <ellipse cx="32" cy="70" rx="6" ry="3" fill="#FFD6E0" opacity="0.6"/>
    <ellipse cx="68" cy="70" rx="6" ry="3" fill="#FFD6E0" opacity="0.6"/>
    {/* Focused Eyes (Open) */}
    <circle cx="35" cy="55" r="4" fill="#4A3F3F" />
    <circle cx="65" cy="55" r="4" fill="#4A3F3F" />
    {/* Nose */}
    <path d="M47 62 Q50 65 53 62" stroke="#FFB6C1" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

export const BunnySleep = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
    <ellipse cx="50" cy="50" rx="45" ry="40" fill="#FFFFFF" />
    {/* Droopy Ears */}
    <ellipse cx="10" cy="50" rx="8" ry="25" transform="rotate(-60 10 50)" fill="#FFFFFF" />
    <ellipse cx="90" cy="50" rx="8" ry="25" transform="rotate(60 90 50)" fill="#FFFFFF" />
    {/* Closed Eyes */}
    <path d="M 30 55 Q 35 60 40 55" stroke="#8E7F7F" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M 60 55 Q 65 60 70 55" stroke="#8E7F7F" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Nose */}
    <path d="M48 65 Q50 67 52 65" stroke="#FFB6C1" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Zzz */}
    <text x="75" y="30" fill="#8E7F7F" fontSize="14" fontFamily="sans-serif" fontWeight="bold">Z</text>
    <text x="85" y="20" fill="#8E7F7F" fontSize="10" fontFamily="sans-serif" fontWeight="bold">z</text>
  </svg>
);
// Add to the bottom of src/components/ui/BunnyElements.tsx
export const BunnyFaceHappy = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
    <ellipse cx="32" cy="65" rx="8" ry="4" fill="#FFD6E0" opacity="0.8"/>
    <ellipse cx="68" cy="65" rx="8" ry="4" fill="#FFD6E0" opacity="0.8"/>
    {/* Happy Eyes (Arch) */}
    <path d="M 30 55 Q 35 48 40 55" stroke="#4A3F3F" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M 60 55 Q 65 48 70 55" stroke="#4A3F3F" strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* Happy Mouth & Nose */}
    <path d="M47 62 Q50 65 53 62" stroke="#FFB6C1" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M50 64 Q50 72 50 64" stroke="#4A3F3F" strokeWidth="2" fill="none" />
  </svg>
);

export const BunnyFaceBreak = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
    <ellipse cx="32" cy="70" rx="5" ry="3" fill="#FFD6E0" opacity="0.4"/>
    <ellipse cx="68" cy="70" rx="5" ry="3" fill="#FFD6E0" opacity="0.4"/>
    {/* Relaxed Eyes */}
    <path d="M 32 55 L 38 55" stroke="#8E7F7F" strokeWidth="4" strokeLinecap="round" />
    <path d="M 62 55 L 68 55" stroke="#8E7F7F" strokeWidth="4" strokeLinecap="round" />
    <path d="M48 62 Q50 64 52 62" stroke="#FFB6C1" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);