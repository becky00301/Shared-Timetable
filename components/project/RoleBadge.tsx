"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/locale";
import type { ProjectRole } from "@/types/project";

export function RoleBadge({
  role,
  className,
  icon
}: {
  role: ProjectRole;
  className?: string;
  /** Drawn after the label, where a role select draws its chevron. */
  icon?: ReactNode;
}) {
  const t = useT();
  return (
    <Badge tone={role} className={className}>
      {t(`role.${role}`)}
      {icon}
    </Badge>
  );
}
