"use client";

import { FileDown, ImageDown, Share2, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportTimetablePdf, exportTimetablePng } from "@/lib/export/timetable-export";
import { useLocale } from "@/lib/i18n/locale";
import type { Project } from "@/types/project";
import { useUiStore } from "@/stores/ui-store";

export function ExportToolbar({ project, targetId }: { project: Project; targetId: string }) {
  const setShareOpen = useUiStore((state) => state.setShareOpen);
  const { t, locale } = useLocale();

  function getTarget() {
    const element = document.getElementById(targetId);
    if (!element) toast.error(t("export.notReady"));
    return element;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
        <Share2 size={15} />
        {t("share.button")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const target = getTarget();
          if (target) void exportTimetablePng(target, `${project.slug}.png`);
        }}
      >
        <ImageDown size={15} />
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const target = getTarget();
          if (target) void exportTimetablePdf(target, `${project.slug}.pdf`);
        }}
      >
        <FileDown size={15} />
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Built server-side, so the xlsx writer never ships to the browser.
          window.location.href = `/api/export/excel?projectId=${encodeURIComponent(project.id)}&locale=${locale}`;
        }}
      >
        <Sheet size={15} />
        {t("export.excel")}
      </Button>
    </div>
  );
}
