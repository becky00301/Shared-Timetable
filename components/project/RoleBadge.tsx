import { Badge } from "@/components/ui/badge";
import type { ProjectRole } from "@/types/project";

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: "소유자",
  editor: "편집자",
  viewer: "뷰어"
};

export function RoleBadge({ role }: { role: ProjectRole }) {
  return <Badge tone={role}>{ROLE_LABEL[role]}</Badge>;
}
