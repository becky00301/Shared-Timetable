"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/locale";

/**
 * Shown, centred, to someone the owner has just removed. There is nothing
 * left for them on the page, so every way out leads to the dashboard.
 */
export function RemovedFromProjectNotice({ removedBy }: { removedBy: string | null }) {
  const router = useRouter();
  const t = useT();
  const leave = () => router.push("/dashboard");

  return (
    <Dialog
      open={removedBy !== null}
      onOpenChange={(open) => {
        if (!open) leave();
      }}
    >
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {removedBy ? t("members.removed.title", { name: removedBy }) : t("members.removed.titleUnknown")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">{t("members.removed.body")}</DialogDescription>
        </DialogHeader>
        <Button type="button" className="w-full" onClick={leave}>
          {t("project.goDashboard")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
