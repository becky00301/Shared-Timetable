"use client";

import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Project } from "@/types/project";
import { useUiStore } from "@/stores/ui-store";

export function ShareModal({ project }: { project: Project }) {
  const open = useUiStore((state) => state.isShareOpen);
  const setOpen = useUiStore((state) => state.setShareOpen);
  const origin = typeof window === "undefined" ? "https://plantogether.app" : window.location.origin;
  const projectUrl = `${origin}/plans/${project.slug}`;
  const inviteUrl = `${origin}/invite/${project.invite_token}`;

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Link copied.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Share timetable</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            Copy the project URL or invite collaborators with a tokenized link.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-muted">
            Project link
            <div className="flex gap-2">
              <Input readOnly value={projectUrl} />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(projectUrl)}>
                <Copy size={17} />
              </Button>
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted">
            Invite link
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(inviteUrl)}>
                <Link2 size={17} />
              </Button>
            </div>
          </label>
          <div className="rounded-lg border border-border bg-white/[0.03] p-3 text-sm text-muted">
            Invite role defaults to viewer in MVP. The SQL policies are structured so v1 can add
            token-scoped editor invitations.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
