export const formatDurationAdaptive = (ms: number, compact = false): string => {
  if (!ms || ms < 0) return compact ? '0s' : '0 sec';
  
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30); // Approximate month

  if (months > 0) {
    const remWeeks = Math.floor((days % 30) / 7);
    return compact ? `${months}mo ${remWeeks}w` : `${months} month${months > 1 ? 's' : ''} ${remWeeks} week${remWeeks !== 1 ? 's' : ''}`;
  }
  if (weeks > 0) {
    const remDays = days % 7;
    return compact ? `${weeks}w ${remDays}d` : `${weeks} week${weeks > 1 ? 's' : ''} ${remDays} day${remDays !== 1 ? 's' : ''}`;
  }
  if (days > 0) {
    return compact ? `${days}d ${hours}h ${minutes}m` : `${days} day${days > 1 ? 's' : ''} ${hours} hr ${minutes} min`;
  }
  if (hours > 0) {
    return compact ? `${hours}h ${minutes}m` : `${hours} hr ${minutes} min ${seconds} sec`;
  }
  if (minutes > 0) {
    return compact ? `${minutes}m ${seconds}s` : `${minutes} min ${seconds} sec`;
  }
  return compact ? `${seconds}s` : `${seconds} sec`;
};

// Helper for inputs/calculations (HH:MM to MS)
export const timeToMs = (timeString: string): number => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 3600000) + (minutes * 60000);
};

export const msToTime = (ms: number): string => {
  const date = new Date(ms);
  return date.toISOString().substring(11, 16); // Returns HH:MM
};