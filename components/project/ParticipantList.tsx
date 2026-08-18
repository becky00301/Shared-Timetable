"use client";

import { toast } from "sonner";
import { RoleBadge } from "@/components/project/RoleBadge";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectMember } from "@/types/project";

export function ParticipantList({
  members,
  canManage = false
}: {
  members: ProjectMember[];
  canManage?: boolean;
}) {
  const updateMemberRole = useProjectStore((state) => state.updateMemberRole);
  const t = useT();

  function changeRole(member: ProjectMember, role: "editor" | "viewer") {
    if (role === member.role) return;
    updateMemberRole(member.id, role)
      .then(() => toast.success(t("members.roleChanged")))
      .catch((error) => {
        console.error(error);
        toast.error(t("members.roleChangeFailed"));
      });
  }

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
            <select
              className="h-7 shrink-0 rounded-md border border-border bg-background px-1.5 text-xs text-foreground outline-none"
              value={member.role}
              onChange={(event) => changeRole(member, event.target.value as "editor" | "viewer")}
              aria-label={t("members.changeRoleLabel")}
            >
              <option value="editor">{t("role.editor")}</option>
              <option value="viewer">{t("role.viewer")}</option>
            </select>
          ) : (
            <RoleBadge role={member.role} />
          )}
        </div>
      ))}
    </div>
  );
}
