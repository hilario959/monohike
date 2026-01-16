export const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters)) return '--';
  return `${(meters / 1000).toFixed(2)} km`;
};

export const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  parts.push(`${mins}m`, `${secs}s`);
  return parts.join(' ');
};

export const formatPace = (meters: number, seconds: number) => {
  if (meters <= 0 || seconds <= 0) return '--';
  const minutesPerKm = seconds / 60 / (meters / 1000);
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
};
