export interface FormatOptions {
  compact?: boolean;
  showSeconds?: boolean;
}

export const formatDuration = (ms: number, options: FormatOptions = {}): string => {
  const { compact = false, showSeconds = false } = options;
  
  if (ms == null || ms <= 0) {
    return showSeconds ? (compact ? '0s' : '0 seconds') : (compact ? '0m' : '0 minutes');
  }

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  // >= 30 days: Convert to Months
  if (totalDays >= 30) {
    const months = Math.floor(totalDays / 30);
    const remDays = totalDays % 30;
    if (remDays === 0) return compact ? `${months}mo` : `${months} month${months !== 1 ? 's' : ''}`;
    return compact ? `${months}mo ${remDays}d` : `${months} month${months !== 1 ? 's' : ''} ${remDays} day${remDays !== 1 ? 's' : ''}`;
  }

  // >= 7 days: Convert to Weeks
  if (totalDays >= 7) {
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    if (remDays === 0) return compact ? `${weeks}w` : `${weeks} week${weeks !== 1 ? 's' : ''}`;
    return compact ? `${weeks}w ${remDays}d` : `${weeks} week${weeks !== 1 ? 's' : ''} ${remDays} day${remDays !== 1 ? 's' : ''}`;
  }

  // >= 24 hours: Convert to Days
  if (totalDays >= 1) {
    const days = totalDays;
    const remHours = totalHours % 24;
    if (remHours === 0) return compact ? `${days}d` : `${days} day${days !== 1 ? 's' : ''}`;
    return compact ? `${days}d ${remHours}h` : `${days} day${days !== 1 ? 's' : ''} ${remHours} hour${remHours !== 1 ? 's' : ''}`;
  }

  // >= 60 minutes: Convert to Hours
  if (totalHours >= 1) {
    const hours = totalHours;
    const remMinutes = totalMinutes % 60;
    if (remMinutes === 0) return compact ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`;
    return compact ? `${hours}h ${remMinutes}m` : `${hours} hour${hours !== 1 ? 's' : ''} ${remMinutes} minute${remMinutes !== 1 ? 's' : ''}`;
  }

  // < 60 minutes: Display Minutes (and optionally seconds)
  const minutes = totalMinutes;
  const remSeconds = totalSeconds % 60;

  if (minutes > 0) {
    if (showSeconds && remSeconds > 0) {
      return compact ? `${minutes}m ${remSeconds}s` : `${minutes} minute${minutes !== 1 ? 's' : ''} ${remSeconds} second${remSeconds !== 1 ? 's' : ''}`;
    }
    return compact ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  // Less than 1 minute
  if (showSeconds) {
    return compact ? `${remSeconds}s` : `${remSeconds} second${remSeconds !== 1 ? 's' : ''}`;
  }
  
  return compact ? '0m' : '0 minutes';
};

// Helper for inputs/calculations (HH:MM to MS)
export const timeToMs = (timeString: string): number => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 3600000) + (minutes * 60000);
};

// Helper to format MS to time string (HH:MM)
export const msToTime = (ms: number): string => {
  const date = new Date(ms);
  return date.toISOString().substring(11, 16); // Returns HH:MM
};

// Legacy function maintained for backward compatibility
export const formatDurationAdaptive = (ms: number, compact = false): string => {
  return formatDuration(ms, { compact, showSeconds: true });
};

export const formatLiveTimer = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const minStr = minutes.toString().padStart(2, '0');
  const secStr = seconds.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minStr}:${secStr}`;
  }
  return `${minStr}:${secStr}`;
};