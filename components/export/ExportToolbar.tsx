"use client";

import { useState } from "react";
import { Code2, FileDown, ImageDown, Sheet, Upload, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { track, type ExportFormat } from "@/lib/analytics";
import { exportFilename } from "@/lib/export/filename";
import { exportTimetablePdf, exportTimetablePng } from "@/lib/export/timetable-export";
import { useLocale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { useProjectStore } from "@/stores/project-store";
import type { Project } from "@/types/project";

export function ExportToolbar({ project, targetId }: { project: Project; targetId: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  // Sent with each export: a file made from a one-person timetable is how
  // people share plans without inviting anyone.
  const memberCount = useProjectStore((state) => state.members.filter((m) => m.project_id === project.id).length);

  function getTarget() {
    const element = document.getElementById(targetId);
    if (!element) toast.error(t("export.notReady"));
    return element;
  }

  const tiles: { key: MessageKey; format: ExportFormat; icon: LucideIcon; run: () => void }[] = [
    {
      key: "export.tile.png",
      format: "png",
      icon: ImageDown,
      run: () => {
        const target = getTarget();
        if (target) void exportTimetablePng(target, exportFilename(project.title, "png"));
      }
    },
    {
      key: "export.tile.pdf",
      format: "pdf",
      icon: FileDown,
      run: () => {
        const target = getTarget();
        if (target) void exportTimetablePdf(target, exportFilename(project.title, "pdf"));
      }
    },
    {
      key: "export.tile.excel",
      format: "excel",
      icon: Sheet,
      run: () => {
        // Built server-side, so the xlsx writer never ships to the browser.
        window.location.href = `/api/export/excel?projectId=${encodeURIComponent(project.id)}&locale=${locale}`;
      }
    },
    {
      key: "export.tile.html",
      format: "html",
      icon: Code2,
      run: () => {
        // Written from the data rather than captured from the screen, so the
        // file is text someone can read, search and print — not a picture.
        window.location.href = `/api/export/html?projectId=${encodeURIComponent(project.id)}&locale=${locale}`;
      }
    }
  ];

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <Upload size={15} />
        {t("export.open")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">{t("export.title")}</DialogTitle>
            <DialogDescription className="text-sm text-muted">{t("export.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(({ key, format, icon: Icon, run }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  track({ event: "export", format, member_count: memberCount });
                  run();
                }}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-black/[0.04] text-foreground transition hover:bg-black/[0.07]"
              >
                <Icon size={22} className="text-muted" />
                <span className="text-sm font-medium">{t(key)}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
