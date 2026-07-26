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
    <div className="flex flex-col gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-black/[0.03] px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-blue-700">
              {member.user?.name?.slice(0, 1) ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{member.user?.name ?? "Member"}</p>
              <p className="truncate text-xs text-muted">{member.user?.email}</p>
            </div>
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
