export const HOUR_HEIGHT = 72;
export const DAY_START_MINUTES = 0;
export const DAY_END_MINUTES = 24 * 60;
export const SLOT_MINUTES = 30;

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  const clamped = Math.max(DAY_START_MINUTES, Math.min(DAY_END_MINUTES, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function snapMinutes(minutes: number) {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

export function minutesToTop(minutes: number) {
  return (minutes / 60) * HOUR_HEIGHT;
}

export function durationToHeight(startTime: string, endTime: string) {
  return ((timeToMinutes(endTime) - timeToMinutes(startTime)) / 60) * HOUR_HEIGHT;
}

export function pointerYToTime(y: number) {
  return minutesToTime(snapMinutes((y / HOUR_HEIGHT) * 60));
}

export function formatTimeRange(start: string, end: string) {
  return `${start} - ${end}`;
}
