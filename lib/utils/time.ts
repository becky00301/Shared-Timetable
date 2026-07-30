/** Hour height at 100% zoom. Every layout helper below takes the live height
    so the grid can be scaled without the pixel maths drifting from it. */
export const HOUR_HEIGHT = 72;
export const DAY_START_MINUTES = 0;
export const DAY_END_MINUTES = 24 * 60;
export const SLOT_MINUTES = 5;
export const MIN_DURATION_MINUTES = 5;

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
// Quarter steps land on exact binary fractions, so repeated +/- never drifts.
export const ZOOM_STEP = 0.25;

export function clampZoom(zoom: number) {
  const stepped = Math.round(zoom / ZOOM_STEP) * ZOOM_STEP;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, stepped));
}

export function zoomToHourHeight(zoom: number) {
  return Math.round(HOUR_HEIGHT * zoom);
}

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

export function minutesToTop(minutes: number, hourHeight: number = HOUR_HEIGHT) {
  return (minutes / 60) * hourHeight;
}

export function durationToHeight(startTime: string, endTime: string, hourHeight: number = HOUR_HEIGHT) {
  return ((timeToMinutes(endTime) - timeToMinutes(startTime)) / 60) * hourHeight;
}

export function pointerYToTime(y: number, hourHeight: number = HOUR_HEIGHT) {
  return minutesToTime(snapMinutes((y / hourHeight) * 60));
}

export function formatTimeRange(start: string, end: string) {
  return `${start} - ${end}`;
}
