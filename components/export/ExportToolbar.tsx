"use client";

import { FileDown, ImageDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportTimetablePdf, exportTimetablePng } from "@/lib/export/timetable-export";
import type { Project } from "@/types/project";
import { useUiStore } from "@/stores/ui-store";

export function ExportToolbar({ project, targetId }: { project: Project; targetId: string }) {
  const setShareOpen = useUiStore((state) => state.setShareOpen);

  function getTarget() {
    const element = document.getElementById(targetId);
    if (!element) toast.error("아직 내보낼 준비가 안 됐어요.");
    return element;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
        <Share2 size={15} />
        공유
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
    </div>
  );
}
