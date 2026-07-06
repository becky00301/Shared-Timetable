import { RoleBadge } from "@/components/project/RoleBadge";
import type { ProjectMember } from "@/types/project";

export function ParticipantList({ members }: { members: ProjectMember[] }) {
  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-3 py-2"
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
          <RoleBadge role={member.role} />
        </div>
      ))}
    </div>
  );
}
