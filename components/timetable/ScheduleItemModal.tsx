"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { timeToMinutes } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

const COLORS = ["#1972F7", "#8B5CF6", "#F59E0B", "#22C55E", "#EF4444"];

export function ScheduleItemModal({
  projectId,
  days,
  canEdit
}: {
  projectId: string;
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const open = useUiStore((state) => state.isScheduleModalOpen);
  const close = useUiStore((state) => state.closeScheduleModal);
  const draft = useUiStore((state) => state.draftSelection);
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const schedules = useProjectStore((state) => state.schedules);
  const upsertSchedule = useProjectStore((state) => state.upsertSchedule);
  const selectedItem = schedules.find((item) => item.id === selectedScheduleId);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setTitle(selectedItem?.title ?? "");
    setLocation(selectedItem?.location ?? "");
    setDescription(selectedItem?.description ?? "");
    setDayId(selectedItem?.day_id ?? draft?.day_id ?? days[0]?.id ?? "");
    setStartTime(selectedItem?.start_time ?? draft?.start_time ?? "09:00");
    setEndTime(selectedItem?.end_time ?? draft?.end_time ?? "10:00");
    setColor(selectedItem?.color ?? COLORS[0]);
  }, [open, selectedItem, draft, days]);

  const modeTitle = useMemo(() => (selectedItem ? "Edit schedule" : "Create schedule"), [selectedItem]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) {
      toast.error("Viewer role cannot edit schedules.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      toast.error("End time must be after start time.");
      return;
    }
    upsertSchedule({
      id: selectedItem?.id,
      project_id: projectId,
      day_id: dayId,
      title: title.trim(),
      location: location.trim(),
      description: description.trim(),
      start_time: startTime,
      end_time: endTime,
      color
    });
    close();
    toast.success(selectedItem ? "Schedule updated." : "Schedule created.");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? close() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">{modeTitle}</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            Drag selections open here with editable date and time fields.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              className="h-10 rounded-lg border border-border bg-[#101010] px-3 text-sm text-white outline-none"
              value={dayId}
              onChange={(event) => setDayId(event.target.value)}
            >
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.date}
                </option>
              ))}
            </select>
            <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
          <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description or notes"
          />
          <div className="flex gap-2">
            {COLORS.map((option) => (
              <button
                key={option}
                type="button"
                className="size-8 rounded-full border border-white/20 ring-offset-2 ring-offset-card transition"
                style={{ backgroundColor: option, outline: color === option ? "2px solid white" : "none" }}
                onClick={() => setColor(option)}
                aria-label={`Use ${option}`}
              />
            ))}
          </div>
          <Button type="submit" disabled={!canEdit}>
            Save schedule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
