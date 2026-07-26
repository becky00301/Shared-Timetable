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
import { useT } from "@/lib/i18n/locale";
import { useDateFormat } from "@/lib/i18n/dates";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

type Step = "mode" | "datepick" | "name";

export function CreateProjectModal() {
  const router = useRouter();
  const open = useUiStore((state) => state.isCreateProjectOpen);
  const setOpen = useUiStore((state) => state.setCreateProjectOpen);
  const createProject = useProjectStore((state) => state.createProject);
  const addDays = useProjectStore((state) => state.addDays);
  const t = useT();
  const fmt = useDateFormat();

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
      toast.error(t("setup.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const project = await createProject(title.trim(), description.trim(), mode === "weekly" ? "weekly" : "daterange");
      await addDays(project.id, buildDates());
      setOpen(false);
      toast.success(t("setup.created"));
      router.push(`/plans/${project.slug}`);
    } catch (error) {
      console.error(error);
      toast.error(t("setup.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        {step === "mode" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">{t("setup.chooseKind")}</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                {t("setup.chooseKindSub")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMode("daterange");
                  setStep("datepick");
                }}
                className="flex flex-col rounded-xl border border-border bg-black/[0.03] p-4 text-left transition hover:border-primary"
              >
                <CalendarRange className="shrink-0 text-primary" size={20} />
                <h3 className="mt-3 font-semibold text-foreground">{t("setup.pickDates")}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t("setup.pickDatesBody")}
                </p>
                <span className="mt-auto pt-4 text-sm font-medium text-primary">{t("setup.pickDatesCta")}</span>
              </button>

              <div className="flex flex-col rounded-xl border border-border bg-black/[0.03] p-4">
                <CalendarDays className="shrink-0 text-primary" size={20} />
                <h3 className="mt-3 font-semibold text-foreground">{t("setup.weekly")}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{t("setup.weeklyBody")}</p>
                <div className="mt-auto pt-4">
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setWeekStart("mon")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm transition",
                        weekStart === "mon" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
                      )}
                    >
                      {t("setup.startMonday")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekStart("sun")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm transition",
                        weekStart === "sun" ? "bg-primary text-white" : "text-muted hover:bg-black/6"
                      )}
                    >
                      {t("setup.startSunday")}
                    </button>
                  </div>
                  <Button
                    className="mt-2 w-full"
                    onClick={() => {
                      setMode("weekly");
                      setStep("name");
                    }}
                  >
                    {t("setup.startAsIs")}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : step === "datepick" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">{t("setup.chooseRange")}</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                {t("setup.chooseRangeSub")}
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
                {t("common.back")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!rangeStart || !rangeEnd}
                onClick={() => setStep("name")}
              >
                {t("common.next")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">{t("setup.nameIt")}</DialogTitle>
              <DialogDescription className="text-sm text-muted">
                {mode === "weekly"
                  ? weekStart === "mon"
                    ? t("setup.defaultNameWeeklyMon")
                    : t("setup.defaultNameWeeklySun")
                  : rangeStart && rangeEnd
                    ? t("setup.defaultNameRange", { start: fmt.monthDay(rangeStart), end: fmt.monthDay(rangeEnd) })
                    : ""}
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={submit}>
              <label className="flex flex-col gap-2 text-sm text-muted">
                {t("common.name")}
                <Input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("setup.namePlaceholder")}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-muted">
                {t("setup.description")}
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("setup.descriptionPlaceholder")}
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
                  {t("common.back")}
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? t("setup.creating") : t("setup.create")}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
