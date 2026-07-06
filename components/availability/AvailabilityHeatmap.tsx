import { cn } from "@/lib/utils/cn";
import { minutesToTop, timeToMinutes } from "@/lib/utils/time";
import type { AvailabilitySlot } from "@/types/schedule";

export function AvailabilityHeatmap({
  slots,
  memberCount,
  active
}: {
  slots: AvailabilitySlot[];
  memberCount: number;
  active: boolean;
}) {
  if (!active) return null;

  const increments = Array.from({ length: 48 }, (_, index) => index * 30);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1728px]">
      {increments.map((minute) => {
        const count = slots.filter(
          (slot) => timeToMinutes(slot.start_time) <= minute && timeToMinutes(slot.end_time) > minute
        ).length;
        const opacity = count === 0 ? 0 : count >= memberCount ? 0.42 : 0.12 + count * 0.1;
        return (
          <div
            key={minute}
            className={cn("absolute left-0 right-0 border-y border-primary/10 bg-primary", count === memberCount && "ring-1 ring-primary/60")}
            style={{
              top: minutesToTop(minute),
              height: 36,
              opacity
            }}
          />
        );
      })}
    </div>
  );
}
