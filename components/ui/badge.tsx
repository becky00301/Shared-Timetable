import { cn } from "@/lib/utils/cn";

const roleClass = {
  owner: "border-primary/35 bg-primary/15 text-blue-200",
  editor: "border-violet-500/35 bg-violet-500/15 text-violet-200",
  viewer: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200"
};

export function Badge({
  className,
  children,
  tone
}: {
  className?: string;
  children: React.ReactNode;
  tone?: keyof typeof roleClass;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-white/6 px-2 py-0.5 text-xs font-medium text-muted",
        tone && roleClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
