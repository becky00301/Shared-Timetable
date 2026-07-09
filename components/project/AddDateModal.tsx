"use client";

import { useEffect, useState } from "react";
import { addDays as addDaysToDate, format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RangeCalendar } from "@/components/project/RangeCalendar";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

export function AddDateModal({ projectId }: { projectId: string }) {
  const open = useUiStore((state) => state.isAddDateOpen);
  const setOpen = useUiStore((state) => state.setAddDateOpen);
  const addDays = useProjectStore((state) => state.addDays);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRangeStart(null);
      setRangeEnd(null);
    }
  }, [open]);

  async function submit() {
    if (!rangeStart || !rangeEnd) return;
    setSaving(true);
    try {
      const dayCount = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
      const dates = Array.from({ length: dayCount }, (_, index) =>
        format(addDaysToDate(rangeStart, index), "yyyy-MM-dd")
      );
      await addDays(projectId, dates);
      setOpen(false);
      toast.success("날짜를 추가했어요.");
    } catch (error) {
      console.error(error);
      toast.error("날짜를 추가하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">날짜 추가</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            추가할 기간을 선택하세요. 이미 있는 날짜는 자동으로 건너뜁니다.
          </DialogDescription>
        </DialogHeader>
        <RangeCalendar
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onChange={(start, end) => {
            setRangeStart(start);
            setRangeEnd(end);
          }}
        />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>
            취소
          </Button>
          <Button className="flex-1" onClick={submit} disabled={!rangeStart || !rangeEnd || saving}>
            {saving ? "추가 중..." : "날짜 추가"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
