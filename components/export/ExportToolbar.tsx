"use client";

import { useState } from "react";
import { Code2, Copy, FileDown, ImageDown, Sheet, Upload, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { exportTimetablePdf, exportTimetablePng } from "@/lib/export/timetable-export";
import { useLocale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { SITE_URL } from "@/lib/seo";
import type { Project } from "@/types/project";

export function ExportToolbar({ project, targetId }: { project: Project; targetId: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;
  // The read-only embed route, not the project page: it renders standalone and
  // ships the frame-ancestors header Notion needs. The token is absent until
  // the embed migration has run, and a link without one only 404s.
  const embedUrl = project.embed_token ? `${origin}/embed/${project.embed_token}` : null;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" style="border:0" loading="lazy"></iframe>`;

  async function copy(value: string, message: string) {
    // Clipboard access is denied outside secure contexts and in some in-app
    // browsers, so fall back to telling the reader to copy by hand.
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error(t("export.embed.copyFailed"));
    }
  }

  function getTarget() {
    const element = document.getElementById(targetId);
    if (!element) toast.error(t("export.notReady"));
    return element;
  }

  const tiles: { key: MessageKey; icon: LucideIcon; run: () => void }[] = [
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

          <div className="grid grid-cols-3 gap-3">
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

          {embedUrl && (
            <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <span className="text-sm font-medium text-foreground">{t("export.embed.title")}</span>
              <p className="text-sm leading-6 text-muted">{t("export.embed.hint")}</p>
              <div className="flex gap-2">
                <Input readOnly value={embedUrl} aria-label={t("export.embed.linkLabel")} />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t("export.embed.linkLabel")}
                  onClick={() => void copy(embedUrl, t("share.copied"))}
                >
                  <Copy size={17} />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => void copy(iframeCode, t("export.embed.codeCopied"))}
              >
                <Code2 size={15} />
                {t("export.embed.copyCode")}
              </Button>
              <p className="text-xs leading-5 text-muted">{t("export.embed.warning")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
