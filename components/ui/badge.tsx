"use client";

import { Badge as AppicaBadge, type BadgeProps as AppicaBadgeProps } from "@appica/ui-react/badge";
import { cn } from "@/lib/utils/cn";

type Tone = "owner" | "editor" | "viewer";

const TONE_MAP: Record<Tone, NonNullable<AppicaBadgeProps["variant"]>> = {
  owner: "primary",
  editor: "info",
  viewer: "success"
};

export function Badge({
  className,
  children,
  tone
}: {
  className?: string;
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <AppicaBadge variant={tone ? TONE_MAP[tone] : "soft"} size="sm" className={cn(className)}>
      {children}
    </AppicaBadge>
  );
}
