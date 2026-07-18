import { cn } from "@/lib/utils/cn";

const roleClass = {
  owner: "border-primary/30 bg-primary/10 text-blue-700",
  editor: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  viewer: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
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
        "inline-flex items-center rounded-md border border-border bg-black/6 px-2 py-0.5 text-xs font-medium text-muted",
        tone && roleClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
