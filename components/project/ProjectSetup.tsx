"use client";

import { useMemo, useState } from "react";
import { addDays as addDaysToDate, addMonths, endOfMonth, format, getDay, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_RANGE_DAYS = 31;

type Step = "mode" | "datepick";

export function ProjectSetup({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const addDays = useProjectStore((state) => state.addDays);
  const [step, setStep] = useState<Step>("mode");
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState<"mon" | "sun">("mon");
  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const calendarCells = useMemo(() => {
    const first = startOfMonth(calMonth);
    const last = endOfMonth(calMonth);
    const cells: (Date | null)[] = Array.from({ length: getDay(first) }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      cells.push(new Date(calMonth.getFullYear(), calMonth.getMonth(), day));
    }
    return cells;
  }, [calMonth]);

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

  function pickDate(date: Date) {
    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date < rangeStart) {
      setRangeStart(date);
      return;
    }
    const dayCount = Math.round((date.getTime() - rangeStart.getTime()) / 86400000) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      toast.error(`최대 ${MAX_RANGE_DAYS}일까지 선택할 수 있어요.`);
      return;
    }
    setRangeEnd(date);
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

  const inRange = (date: Date) => rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd;

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-glow">
        <p className="text-sm text-muted">PlanTogether</p>
        {step === "mode" ? (
          <>
            <h2 className="mt-6 text-3xl font-semibold text-white">어떤 시간표를 만들까요?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              드래그로 만들고 링크 하나로 공유하는 시간표
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">일주일 시간표 만들기</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">날짜 입력 없이 기본 틀로 즉시 시작</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setWeekStart("mon")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition",
                      weekStart === "mon" ? "bg-primary text-white" : "text-muted hover:bg-white/6"
                    )}
                  >
                    월요일 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekStart("sun")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition",
                      weekStart === "sun" ? "bg-primary text-white" : "text-muted hover:bg-white/6"
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
                className="rounded-xl border border-border bg-white/[0.03] p-4 text-left transition hover:border-primary disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <CalendarRange className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">날짜 직접 선택</h3>
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
            <h2 className="mt-6 text-3xl font-semibold text-white">기간을 선택하세요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">시작일과 종료일을 차례로 클릭하세요.</p>
            <div className="mt-6 rounded-xl border border-border bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setCalMonth((month) => addMonths(month, -1))}>
                  ‹
                </Button>
                <span className="text-sm font-medium text-white">{format(calMonth, "yyyy년 M월")}</span>
                <Button variant="ghost" size="sm" onClick={() => setCalMonth((month) => addMonths(month, 1))}>
                  ›
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label} className="py-1">
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((date, index) =>
                  date ? (
                    <button
                      key={index}
                      type="button"
                      onClick={() => pickDate(date)}
                      className={cn(
                        "rounded-lg py-2 text-sm text-white transition hover:bg-white/10",
                        inRange(date) && "bg-primary/30",
                        rangeStart &&
                          format(date, "yyyy-MM-dd") === format(rangeStart, "yyyy-MM-dd") &&
                          "bg-primary text-white",
                        rangeEnd &&
                          format(date, "yyyy-MM-dd") === format(rangeEnd, "yyyy-MM-dd") &&
                          "bg-primary text-white"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <span key={index} />
                  )
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              {rangeStart && rangeEnd
                ? `${format(rangeStart, "M월 d일")} ~ ${format(rangeEnd, "M월 d일")} (${Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1}일)`
                : rangeStart
                  ? `${format(rangeStart, "M월 d일")} ~ 종료일을 클릭하세요`
                  : "시작일을 클릭하세요"}
            </p>
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
