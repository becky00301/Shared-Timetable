"use client";

import { Copy, Link2 } from "lucide-react";
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
  const projectUrl = project.embed_token
    ? `${origin}/plans/${project.slug}?embed=${project.embed_token}`
    : `${origin}/plans/${project.slug}`;
  const inviteUrl = `${origin}/invite/${project.invite_token}`;

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
          {/* Invite link first: sharing the project link with a non-member only
              gets them an access-denied page. */}
          <label className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/[0.06] p-3 text-sm text-muted">
            <span>
              <span className="font-medium text-foreground">{t("share.inviteLabel")}</span> — {t("share.inviteHint")}
            </span>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} />
              <Button type="button" size="icon" onClick={() => copy(inviteUrl)}>
                <Link2 size={17} />
              </Button>
            </div>
          </label>

          <div className="rounded-lg border border-border bg-black/[0.03] p-3 text-sm leading-6 text-muted">
            {t("share.inviteExplainer")}
          </div>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span>
              {t("share.projectLabel")} — {t("share.projectHint")}
            </span>
            <div className="flex gap-2">
              <Input readOnly value={projectUrl} />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(projectUrl)}>
                <Copy size={17} />
              </Button>
            </div>
          </label>

        </div>
      </DialogContent>
    </Dialog>
  );
}
