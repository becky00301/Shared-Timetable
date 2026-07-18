"use client";

import { useState } from "react";
import { addDays as addDaysToDate, format, startOfWeek } from "date-fns";
import { CalendarDays, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/project/RangeCalendar";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";

type Step = "mode" | "datepick";

export function ProjectSetup({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const addDays = useProjectStore((state) => state.addDays);
  const [step, setStep] = useState<Step>("mode");
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState<"mon" | "sun">("mon");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  if (!canEdit) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-center text-sm leading-6 text-muted">
          아직 선택된 날짜가 없어요. 편집 권한이 있는 멤버가 날짜를 추가하면 시간표가 표시됩니다.
        </p>
      </div>
    );
  }

  async function createWeekly() {
    setSaving(true);
    try {
      const first = startOfWeek(new Date(), { weekStartsOn: weekStart === "mon" ? 1 : 0 });
      const dates = Array.from({ length: 7 }, (_, index) => format(addDaysToDate(first, index), "yyyy-MM-dd"));
      await addDays(projectId, dates);
      toast.success(weekStart === "mon" ? "월~일 일주일 시간표를 만들었어요." : "일~토 일주일 시간표를 만들었어요.");
    } catch (error) {
      console.error(error);
      toast.error("날짜를 추가하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function createRange() {
    if (!rangeStart || !rangeEnd) return;
    setSaving(true);
    try {
      const dayCount = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
      const dates = Array.from({ length: dayCount }, (_, index) =>
        format(addDaysToDate(rangeStart, index), "yyyy-MM-dd")
      );
      await addDays(projectId, dates);
      toast.success(`${dayCount}일짜리 시간표를 만들었어요.`);
    } catch (error) {
      console.error(error);
      toast.error("날짜를 추가하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-glow">
        <p className="text-sm text-muted">PlanTogether</p>
        {step === "mode" ? (
          <>
            <h2 className="mt-6 text-3xl font-semibold text-foreground">어떤 시간표를 만들까요?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              드래그로 만들고 링크 하나로 공유하는 시간표
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-black/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">일주일 시간표 만들기</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">날짜 입력 없이 기본 틀로 즉시 시작</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setWeekStart("mon")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition",
                      weekStart === "mon" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
                    )}
                  >
                    월요일 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekStart("sun")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition",
                      weekStart === "sun" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
                    )}
                  >
                    일요일 시작
                  </button>
                </div>
                <Button className="mt-3 w-full" disabled={saving} onClick={createWeekly}>
                  {saving ? "만드는 중..." : "이대로 시작하기"}
                </Button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setStep("datepick")}
                className="rounded-xl border border-border bg-black/[0.03] p-4 text-left transition hover:border-primary disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <CalendarRange className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">날짜 직접 선택</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      기간을 골라 여행·MT·행사 일정에 맞는 날짜만 추가
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-3xl font-semibold text-foreground">기간을 선택하세요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">시작일과 종료일을 차례로 클릭하세요.</p>
            <div className="mt-6">
              <RangeCalendar
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onChange={(start, end) => {
                  setRangeStart(start);
                  setRangeEnd(end);
                }}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("mode")} disabled={saving}>
                뒤로
              </Button>
              <Button className="flex-1" onClick={createRange} disabled={!rangeStart || !rangeEnd || saving}>
                {saving ? "만드는 중..." : "시간표 만들기"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
