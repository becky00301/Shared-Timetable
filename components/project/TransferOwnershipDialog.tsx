"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoleBadge } from "@/components/project/RoleBadge";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectMember } from "@/types/project";

/**
 * Picks who takes over the timetable. Only people already in it can be
 * chosen, one at a time, and nothing happens until the owner confirms.
 */
export function TransferOwnershipDialog({
  open,
  onOpenChange,
  members
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Everyone in the project; the current owner is left out of the choices. */
  members: ProjectMember[];
}) {
  const transferOwnership = useProjectStore((state) => state.transferOwnership);
  const [choice, setChoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const t = useT();
  const candidates = members.filter((member) => member.role !== "owner");

  function close(next: boolean) {
    if (saving) return;
    if (!next) setChoice(null);
    onOpenChange(next);
  }

  async function confirm() {
    const target = candidates.find((member) => member.user_id === choice);
    if (!target) return;
    setSaving(true);
    try {
      await transferOwnership(target.project_id, target.user_id);
      toast.success(t("members.transfer.done", { name: target.user?.name ?? "Member" }));
      setChoice(null);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(t("members.transfer.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">{t("members.transfer.title")}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">{t("members.transfer.body")}</DialogDescription>
        </DialogHeader>

        {candidates.length ? (
          <div role="radiogroup" aria-label={t("members.transfer.title")} className="flex flex-col gap-2">
            {candidates.map((member) => {
              const selected = choice === member.user_id;
              return (
                <label
                  key={member.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition",
                    selected ? "border-primary bg-primary/[0.06]" : "border-border hover:bg-black/[0.03]"
                  )}
                >
                  <input
                    type="radio"
                    name="new-owner"
                    value={member.user_id}
                    checked={selected}
                    onChange={() => setChoice(member.user_id)}
                    className="size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[11px] font-semibold text-foreground">
                    {member.user?.name?.slice(0, 1) ?? "U"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{member.user?.name ?? "Member"}</span>
                  <RoleBadge role={member.role} className="shrink-0" />
                </label>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm leading-6 text-muted">
            {t("members.transfer.empty")}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={confirm} disabled={!choice || saving}>
            {t("members.transfer.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
