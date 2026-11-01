"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import { SITE_URL } from "@/lib/seo";
import type { Project } from "@/types/project";
import { useUiStore } from "@/stores/ui-store";

export function ShareModal({ project }: { project: Project }) {
  const open = useUiStore((state) => state.isShareOpen);
  const setOpen = useUiStore((state) => state.setShareOpen);
  const t = useT();
  const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;
  // One link for everyone. The invite route lets a newcomer join and sends
  // anyone already in the timetable straight to it, so it works as the
  // project's link too. The bare /plans/<slug> address can't stand in for
  // it: slugs come from titles, so they are guessable. The read-only key
  // rides along so someone not signed in sees the timetable before logging in.
  const shareUrl = project.embed_token
    ? `${origin}/invite/${project.invite_token}?view=${project.embed_token}`
    : `${origin}/invite/${project.invite_token}`;

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success(t("share.copied"));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">{t("share.title")}</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            {t("share.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/[0.06] p-3 text-sm text-muted">
            <span className="font-medium text-foreground">{t("share.linkLabel")}</span>
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} />
              <Button type="button" size="icon" onClick={() => copy(shareUrl)}>
                <Copy size={17} />
              </Button>
            </div>
          </label>

          <div className="rounded-lg border border-border bg-black/[0.03] p-3 text-sm leading-6 text-muted">
            {t("share.linkExplainer")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
