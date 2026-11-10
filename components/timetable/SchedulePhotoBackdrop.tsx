/**
 * A schedule's photo filling its box, darkened most at the top where the title
 * sits so white text reads on any picture, even in a narrow split lane on a
 * phone. The box keeps its colour underneath until the photo has loaded.
 */
export function SchedulePhotoBackdrop({ url }: { url: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, sized by its box */}
      <img src={url} alt="" draggable={false} className="size-full object-cover" />
      <span className="absolute inset-0 bg-linear-to-b from-black/65 via-black/40 to-black/25" />
    </span>
  );
}

/** Text on a photo: white, with a soft shadow for bright spots the gradient
    does not fully cover. */
export const PHOTO_TEXT_COLOR = "#FFFFFF";
export const PHOTO_TEXT_SHADOW = "[text-shadow:0_1px_2px_rgba(0,0,0,0.55)]";
