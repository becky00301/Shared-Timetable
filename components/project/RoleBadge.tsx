import { Badge } from "@/components/ui/badge";
import type { ProjectRole } from "@/types/project";

export function RoleBadge({ role }: { role: ProjectRole }) {
  return <Badge tone={role}>{role}</Badge>;
}
