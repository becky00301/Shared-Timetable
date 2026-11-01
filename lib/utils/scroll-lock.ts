/** How long a finger rests on the grid before moving a block or drawing one
    takes over from scrolling, and how far it may drift meanwhile. */
export const TOUCH_LONG_PRESS_MS = 450;
export const TOUCH_MOVE_TOLERANCE = 10;

/** The id of the timetable's own scroller, which export captures too. */
export const TIMETABLE_SCROLLER_ID = "timetable-export";

/**
 * Holds the timetable still while a block is being moved or resized. Both
 * place the block from the pointer's travel, so a finger panning the grid (or
 * a wheel on desktop) would land it somewhere other than where it was let go.
 * Returns the release.
 *
 * Only the user's own scrolling is blocked. The scroller stays scrollable,
 * because a resize scrolls it from code when held at an edge, and phone
 * browsers can ignore that on an overflow-hidden element.
 */
export function holdScroll(): () => void {
  const block = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  // On window, not the scroller: a finger can wander past the grid's edge.
  window.addEventListener("touchmove", block, { passive: false });
  window.addEventListener("wheel", block, { passive: false });
  return () => {
    window.removeEventListener("touchmove", block);
    window.removeEventListener("wheel", block);
  };
}
