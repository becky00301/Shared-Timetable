"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays as addDaysToDate, format, startOfWeek } from "date-fns";
import { CalendarDays, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { RangeCalendar } from "@/components/project/RangeCalendar";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

type Step = "mode" | "datepick" | "name";

export function CreateProjectModal() {
  const router = useRouter();
  const open = useUiStore((state) => state.isCreateProjectOpen);
  const setOpen = useUiStore((state) => state.setCreateProjectOpen);
  const createProject = useProjectStore((state) => state.createProject);
  const addDays = useProjectStore((state) => state.addDays);

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<"weekly" | "daterange">("weekly");
  const [weekStart, setWeekStart] = useState<"mon" | "sun">("mon");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("mode");
      setMode("weekly");
      setWeekStart("mon");
      setRangeStart(null);
      setRangeEnd(null);
      setTitle("");
      setDescription("");
    }
  }, [open]);

  function buildDates(): string[] {
    if (mode === "weekly") {
      const first = startOfWeek(new Date(), { weekStartsOn: weekStart === "mon" ? 1 : 0 });
      return Array.from({ length: 7 }, (_, index) => format(addDaysToDate(first, index), "yyyy-MM-dd"));
    }
    if (!rangeStart || !rangeEnd) return [];
    const dayCount = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;
    return Array.from({ length: dayCount }, (_, index) => format(addDaysToDate(rangeStart, index), "yyyy-MM-dd"));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("시간표 이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const project = await createProject(title.trim(), description.trim());
      await addDays(project.id, buildDates());
      setOpen(false);
      toast.success("시간표를 만들었어요.");
      router.push(`/plans/${project.slug}`);
    } catch (error) {
      console.error(error);
      toast.error("시간표를 만들지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        {step === "mode" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">어떤 시간표를 만들까요?</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                드래그로 만들고 링크 하나로 공유하는 시간표
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
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
                <Button
                  className="mt-3 w-full"
                  onClick={() => {
                    setMode("weekly");
                    setStep("name");
                  }}
                >
                  이대로 시작하기
                </Button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode("daterange");
                  setStep("datepick");
                }}
                className="rounded-xl border border-border bg-white/[0.03] p-4 text-left transition hover:border-primary"
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
        ) : step === "datepick" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">기간을 선택하세요</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                시작일과 종료일을 차례로 클릭하세요.
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
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("mode")}>
                뒤로
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!rangeStart || !rangeEnd}
                onClick={() => setStep("name")}
              >
                다음
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">시간표 이름을 정해주세요</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                {mode === "weekly"
                  ? weekStart === "mon"
                    ? "이번 주 월~일 일주일 시간표"
                    : "이번 주 일~토 일주일 시간표"
                  : rangeStart && rangeEnd
                    ? `${format(rangeStart, "M월 d일")} ~ ${format(rangeEnd, "M월 d일")} 시간표`
                    : ""}
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={submit}>
              <label className="flex flex-col gap-2 text-sm text-muted">
                이름
                <Input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 유럽 여행, 동아리 MT"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted">
                설명 (선택)
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="함께 보는 사람들을 위한 간단한 설명"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={saving}
                  onClick={() => setStep(mode === "daterange" ? "datepick" : "mode")}
                >
                  뒤로
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "만드는 중..." : "시간표 만들기"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
