"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { timeToMinutes } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

const COLORS = ["#1972F7", "#8B5CF6", "#F59E0B", "#22C55E", "#EF4444"];

export function ScheduleDetailPanel({
  days,
  canEdit
}: {
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const deleteSchedule = useProjectStore((state) => state.deleteSchedule);
  const upsertSchedule = useProjectStore((state) => state.upsertSchedule);
  const schedules = useProjectStore((state) => state.schedules);
  const item = schedules.find((schedule) => schedule.id === selectedScheduleId);

  const [title, setTitle] = useState("");
  const [dayId, setDayId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDayId(item.day_id);
    setStartTime(item.start_time.slice(0, 5));
    setEndTime(item.end_time.slice(0, 5));
    setLocation(item.location ?? "");
    setDescription(item.description ?? "");
  }, [item]);

  if (!item) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-border bg-surface p-5 xl:block">
        <h2 className="text-sm font-semibold text-foreground">일정 상세</h2>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-black/[0.02] p-5 text-sm leading-6 text-muted">
          일정을 클릭하면 여기에서 바로 수정할 수 있어요.
        </div>
      </aside>
    );
  }

  function save(patch: Partial<typeof item> & Record<string, unknown>) {
    if (!item || !canEdit) return;
    upsertSchedule({ ...item, ...patch }).catch((error) => {
      console.error(error);
      toast.error("변경사항을 저장하지 못했어요.");
    });
  }

  function saveTitle() {
    const next = title.trim() || "새 일정";
    if (next !== item!.title) save({ title: next });
  }

  function saveTimes(nextStart: string, nextEnd: string) {
    if (timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
      toast.error("종료 시간은 시작 시간보다 뒤여야 해요.");
      return;
    }
    save({ start_time: nextStart, end_time: nextEnd });
  }

  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-40 max-h-[78vh] overflow-auto border-t border-border bg-surface p-5 xl:static xl:z-auto xl:max-h-none xl:w-80 xl:shrink-0 xl:border-l xl:border-t-0"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">일정 상세</h2>
        <button
          type="button"
          onClick={() => setSelectedSchedule(null)}
          className="rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1.5 text-muted">
          이름
          <Input
            value={title}
            disabled={!canEdit}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-muted">
          날짜
          <select
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none disabled:opacity-60"
            value={dayId}
            disabled={!canEdit}
            onChange={(event) => {
              setDayId(event.target.value);
              save({ day_id: event.target.value });
            }}
          >
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                {day.date}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-muted">
            시작
            <Input
              type="time"
              step={300}
              value={startTime}
              disabled={!canEdit}
              onChange={(event) => {
                setStartTime(event.target.value);
                saveTimes(event.target.value, endTime);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-muted">
            종료
            <Input
              type="time"
              step={300}
              value={endTime}
              disabled={!canEdit}
              onChange={(event) => {
                setEndTime(event.target.value);
                saveTimes(startTime, event.target.value);
              }}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-muted">
          장소
          <Input
            value={location}
            disabled={!canEdit}
            placeholder="선택 입력"
            onChange={(event) => setLocation(event.target.value)}
            onBlur={() => save({ location: location.trim() })}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-muted">
          메모
          <Textarea
            value={description}
            disabled={!canEdit}
            placeholder="선택 입력"
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => save({ description: description.trim() })}
          />
        </label>

        <div className="flex flex-col gap-1.5 text-muted">
          색상
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                disabled={!canEdit}
                onClick={() => save({ color })}
                className="size-8 rounded-full border border-black/20 transition"
                style={{ backgroundColor: color, outline: item.color === color ? "2px solid white" : "none" }}
                aria-label={`색상 ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          variant="danger"
          className="w-full"
          disabled={!canEdit}
          onClick={() => {
            deleteSchedule(item.id)
              .then(() => {
                setSelectedSchedule(null);
                toast.success("일정을 삭제했어요.");
              })
              .catch((error) => {
                console.error(error);
                toast.error("일정을 삭제하지 못했어요.");
              });
          }}
        >
          <Trash2 size={16} />
          삭제
        </Button>
      </div>
    </aside>
  );
}
