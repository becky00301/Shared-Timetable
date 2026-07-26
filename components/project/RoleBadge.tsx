"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/locale";
import type { ProjectRole } from "@/types/project";

export function RoleBadge({ role }: { role: ProjectRole }) {
  const t = useT();
  return <Badge tone={role}>{t(`role.${role}`)}</Badge>;
}
