"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";
import type { ScheduleItem } from "@/types/schedule";

export function MobileTimeline({
  days,
  schedules,
  canEdit
}: {
  days: ProjectDay[];
  schedules: ScheduleItem[];
  canEdit: boolean;
}) {
  const selectedDateId = useUiStore((state) => state.selectedDateId) ?? days[0]?.id;
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);
  const openScheduleModal = useUiStore((state) => state.openScheduleModal);
  const currentSchedules = schedules
    .filter((item) => item.day_id === selectedDateId)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="flex flex-col gap-4 p-4 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => (
          <button
            key={day.id}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left text-sm transition ${
              selectedDateId === day.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-muted"
            }`}
            onClick={() => setSelectedDate(day.id)}
          >
            <span className="block font-semibold">{format(new Date(day.date), "MMM d")}</span>
            <span className="text-xs opacity-80">{format(new Date(day.date), "EEE")}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {currentSchedules.length ? (
          currentSchedules.map((item) => (
            <button
              key={item.id}
              className="flex gap-3 rounded-xl border border-border bg-card p-4 text-left"
              onClick={() => openScheduleModal(null, item)}
            >
              <span className="mt-1 size-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>
                <span className="block text-sm text-muted">
                  {item.start_time} - {item.end_time}
                </span>
                <span className="mt-1 block font-semibold text-white">{item.title}</span>
                {item.location ? <span className="mt-1 block text-sm text-muted">{item.location}</span> : null}
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted">
            시간표를 드래그해서 첫 일정을 추가하세요.
          </div>
        )}
      </div>
      <Button disabled={!canEdit} onClick={() => openScheduleModal({ day_id: selectedDateId ?? days[0]?.id, start_time: "09:00", end_time: "10:00" })}>
        Add schedule
      </Button>
    </div>
  );
}
