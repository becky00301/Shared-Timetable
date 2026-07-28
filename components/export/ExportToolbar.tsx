"use client";

import { useState } from "react";
import { FileDown, ImageDown, Share2, Sheet, Upload, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportTimetablePdf, exportTimetablePng } from "@/lib/export/timetable-export";
import { useLocale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Project } from "@/types/project";
import { useUiStore } from "@/stores/ui-store";

export function ExportToolbar({ project, targetId }: { project: Project; targetId: string }) {
  const setShareOpen = useUiStore((state) => state.setShareOpen);
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);

  function getTarget() {
    const element = document.getElementById(targetId);
    if (!element) toast.error(t("export.notReady"));
    return element;
  }

  const tiles: { key: MessageKey; icon: LucideIcon; run: () => void }[] = [
    {
      key: "export.tile.share",
      icon: Share2,
      run: () => setShareOpen(true)
    },
    {
      key: "export.tile.png",
      icon: ImageDown,
      run: () => {
        const target = getTarget();
        if (target) void exportTimetablePng(target, `${project.slug}.png`);
      }
    },
    {
      key: "export.tile.pdf",
      icon: FileDown,
      run: () => {
        const target = getTarget();
        if (target) void exportTimetablePdf(target, `${project.slug}.pdf`);
      }
    },
    {
      key: "export.tile.excel",
      icon: Sheet,
      run: () => {
        // Built server-side, so the xlsx writer never ships to the browser.
        window.location.href = `/api/export/excel?projectId=${encodeURIComponent(project.id)}&locale=${locale}`;
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
            {tiles.map(({ key, icon: Icon, run }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setOpen(false);
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
