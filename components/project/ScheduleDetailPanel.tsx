"use client";

import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatTimeRange } from "@/lib/utils/time";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

export function ScheduleDetailPanel({
  days,
  canEdit
}: {
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const selectedScheduleId = useUiStore((state) => state.selectedScheduleId);
  const openScheduleModal = useUiStore((state) => state.openScheduleModal);
  const deleteSchedule = useProjectStore((state) => state.deleteSchedule);
  const schedules = useProjectStore((state) => state.schedules);
  const attachments = useProjectStore((state) => state.attachments);
  const item = schedules.find((schedule) => schedule.id === selectedScheduleId);

  if (!item) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-border bg-[#121212] p-5 xl:block">
        <h2 className="text-sm font-semibold text-white">Schedule detail</h2>
        <div className="mt-6 rounded-xl border border-dashed border-border bg-white/[0.02] p-5 text-sm leading-6 text-muted">
          Drag the timetable to create the first schedule item.
        </div>
      </aside>
    );
  }

  const day = days.find((candidate) => candidate.id === item.day_id);
  const itemAttachments = attachments.filter((attachment) => attachment.schedule_item_id === item.id);

  return (
    <aside className="hidden w-80 shrink-0 border-l border-border bg-[#121212] p-5 xl:block">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{day?.date}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{item.title}</h2>
        </div>
        <span className="mt-1 size-3 rounded-full" style={{ backgroundColor: item.color }} />
      </div>
      <div className="mt-5 flex flex-col gap-4 text-sm">
        <div className="rounded-lg border border-border bg-white/[0.03] p-3">
          <p className="text-muted">Time</p>
          <p className="mt-1 font-medium text-white">{formatTimeRange(item.start_time, item.end_time)}</p>
        </div>
        {item.location ? (
          <div className="rounded-lg border border-border bg-white/[0.03] p-3">
            <p className="text-muted">Location</p>
            <p className="mt-1 flex items-center gap-2 font-medium text-white">
              <MapPin size={15} />
              {item.location}
            </p>
          </div>
        ) : null}
        <div className="rounded-lg border border-border bg-white/[0.03] p-3">
          <p className="text-muted">Description</p>
          <p className="mt-1 leading-6 text-white/90">{item.description || "No notes yet."}</p>
        </div>
        <div>
          <p className="mb-2 text-muted">Attachments</p>
          <div className="flex flex-col gap-2">
            {itemAttachments.length ? (
              itemAttachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  className="flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-white transition hover:border-primary/40"
                >
                  {attachment.title ?? attachment.type}
                  <ExternalLink size={14} />
                </a>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-muted">No attachments.</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={!canEdit} onClick={() => openScheduleModal(null, item)}>
          Edit
        </Button>
        <Button
          variant="danger"
          size="icon"
          disabled={!canEdit}
          onClick={() => {
            deleteSchedule(item.id)
              .then(() => toast.success("Schedule deleted."))
              .catch((error) => {
                console.error(error);
                toast.error("Could not delete the schedule.");
              });
          }}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </aside>
  );
}
