"use client";

import { toast } from "sonner";
import { RoleBadge } from "@/components/project/RoleBadge";
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

  function changeRole(member: ProjectMember, role: "editor" | "viewer") {
    if (role === member.role) return;
    updateMemberRole(member.id, role)
      .then(() => toast.success("권한을 변경했어요."))
      .catch((error) => {
        console.error(error);
        toast.error("권한을 변경하지 못했어요.");
      });
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white/[0.03] px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-blue-100">
              {member.user?.name?.slice(0, 1) ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{member.user?.name ?? "Member"}</p>
              <p className="truncate text-xs text-muted">{member.user?.email}</p>
            </div>
          </div>
          {canManage && member.role !== "owner" ? (
            <select
              className="h-7 shrink-0 rounded-md border border-border bg-[#101010] px-1.5 text-xs text-white outline-none"
              value={member.role}
              onChange={(event) => changeRole(member, event.target.value as "editor" | "viewer")}
              aria-label="멤버 권한 변경"
            >
              <option value="editor">편집자</option>
              <option value="viewer">뷰어</option>
            </select>
          ) : (
            <RoleBadge role={member.role} />
          )}
        </div>
      ))}
    </div>
  );
}
