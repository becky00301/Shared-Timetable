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
    toast.success("링크를 복사했어요.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">시간표 공유</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            링크를 복사해서 함께할 사람에게 보내주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-muted">
            프로젝트 링크 (이미 참여 중인 멤버용)
            <div className="flex gap-2">
              <Input readOnly value={projectUrl} />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(projectUrl)}>
                <Copy size={17} />
              </Button>
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted">
            초대 링크 (새로운 사람 초대용)
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(inviteUrl)}>
                <Link2 size={17} />
              </Button>
            </div>
          </label>
          <div className="rounded-lg border border-border bg-black/[0.03] p-3 text-sm leading-6 text-muted">
            초대 링크로 들어온 사람은 <span className="text-foreground">보기 전용(뷰어)</span>으로 참여해요. 편집을
            맡기려면 참여 후 소유자가 권한을 바꿔줄 수 있어요.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
