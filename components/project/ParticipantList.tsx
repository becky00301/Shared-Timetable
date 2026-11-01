"use client";

import { createElement, useState } from "react";
import { ChevronDown, Crown, Eye, Pencil, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/project/RoleBadge";
import { TransferOwnershipDialog } from "@/components/project/TransferOwnershipDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/locale";
import { announceMemberRemoval } from "@/lib/supabase/member-events";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectMember } from "@/types/project";

/** One box for every role in the list, whether it is a fixed badge or the
    owner's select, so the column reads as a single edge. */
const ROLE_BOX = "h-7 w-[4.75rem] rounded-full text-xs";

/** Fixed roles carry an icon where the select has its chevron, so the two
    read as one shape. Not a chevron: these can't be opened. */
const ROLE_ICONS: Record<ProjectMember["role"], LucideIcon> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye
};

export function ParticipantList({
  members,
  canManage = false
}: {
  members: ProjectMember[];
  canManage?: boolean;
}) {
  const updateMemberRole = useProjectStore((state) => state.updateMemberRole);
  const transferOwnership = useProjectStore((state) => state.transferOwnership);
  const removeMember = useProjectStore((state) => state.removeMember);
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const [transferOpen, setTransferOpen] = useState(false);
  // Making someone owner and removing them both wait for a yes; the select
  // springs back to the member's role meanwhile, since it is controlled.
  const [pending, setPending] = useState<{ action: "owner" | "remove"; member: ProjectMember } | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

  function choose(member: ProjectMember, value: string) {
    if (value === "owner" || value === "remove") {
      setPending({ action: value, member });
      return;
    }
    if (value === member.role) return;
    updateMemberRole(member.id, value as "editor" | "viewer")
      .then(() => toast.success(t("members.roleChanged")))
      .catch((error) => {
        console.error(error);
        toast.error(t("members.roleChangeFailed"));
      });
  }

  async function confirmPending() {
    if (!pending) return;
    const { action, member } = pending;
    const name = member.user?.name ?? "Member";
    setBusy(true);
    try {
      if (action === "owner") {
        await transferOwnership(member.project_id, member.user_id);
        toast.success(t("members.transfer.done", { name }));
      } else {
        await removeMember(member.id);
        const me = members.find((candidate) => candidate.user_id === currentUserId);
        announceMemberRemoval(member.project_id, { userId: member.user_id, by: me?.user?.name ?? "" });
        toast.success(t("members.remove.done", { name }));
      }
      setPending(null);
    } catch (error) {
      console.error(error);
      toast.error(t(action === "owner" ? "members.transfer.failed" : "members.remove.failed"));
    } finally {
      setBusy(false);
    }
  }

  const pendingName = pending?.member.user?.name ?? "Member";

  return (
    <div className="flex flex-col">
      {members.map((member) => (
        // Plain rows rather than stacked cards: a boxed card per person turned a
        // three-person list into three competing blocks. The email moves to the
        // row's title so the list stays one line per participant.
        <div
          key={member.id}
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-black/[0.04]"
          title={member.user?.email}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[11px] font-semibold text-foreground">
              {member.user?.name?.slice(0, 1) ?? "U"}
            </div>
            <p className="truncate text-sm text-foreground">{member.user?.name ?? "Member"}</p>
          </div>
          {canManage && member.role !== "owner" ? (
            // appearance-none with a drawn chevron: left to itself, iOS
            // renders the select as a taller pill of its own, and the role
            // badges beside it no longer line up.
            <div className="relative shrink-0">
              <select
                className={`${ROLE_BOX} appearance-none border border-border bg-background pl-3 pr-6 text-foreground outline-none`}
                value={member.role}
                onChange={(event) => choose(member, event.target.value)}
                aria-label={t("members.changeRoleLabel")}
              >
                <option value="editor">{t("role.editor")}</option>
                <option value="viewer">{t("role.viewer")}</option>
                <option value="owner">{t("role.owner")}</option>
                <option value="remove">{t("members.remove.option")}</option>
              </select>
              <ChevronDown
                size={13}
                aria-hidden
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          ) : canManage ? (
            // The owner's own badge opens the hand-over: it is the one row the
            // owner can't change any other way.
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              aria-label={t("members.transfer.open")}
              title={t("members.transfer.open")}
              className="shrink-0 rounded-full transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {roleBadge(member)}
            </button>
          ) : (
            roleBadge(member)
          )}
        </div>
      ))}
      {canManage ? (
        <>
          <TransferOwnershipDialog open={transferOpen} onOpenChange={setTransferOpen} members={members} />
          <Dialog
            open={Boolean(pending)}
            onOpenChange={(open) => {
              if (!open && !busy) setPending(null);
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {pending?.action === "owner"
                    ? t("members.transfer.confirmTitle", { name: pendingName })
                    : t("members.remove.confirmTitle", { name: pendingName })}
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 text-muted">
                  {pending?.action === "owner" ? t("members.transfer.body") : t("members.remove.body")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPending(null)} disabled={busy}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant={pending?.action === "remove" ? "danger" : "default"}
                  onClick={confirmPending}
                  disabled={busy}
                >
                  {pending?.action === "owner" ? t("members.transfer.switch") : t("common.delete")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

function roleBadge(member: ProjectMember) {
  return (
    <RoleBadge
      role={member.role}
      className={`${ROLE_BOX} shrink-0 justify-between pl-3 pr-2`}
      icon={createElement(ROLE_ICONS[member.role], { size: 13, "aria-hidden": true, className: "shrink-0" })}
    />
  );
}
