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
          {/* Invite link first: sharing the project link with a non-member only
              gets them an access-denied page. */}
          <label className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/[0.06] p-3 text-sm text-muted">
            <span>
              <span className="font-medium text-foreground">초대 링크</span> — 함께할 사람에게 보낼 링크예요
            </span>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} />
              <Button type="button" size="icon" onClick={() => copy(inviteUrl)}>
                <Link2 size={17} />
              </Button>
            </div>
          </label>

          <div className="rounded-lg border border-border bg-black/[0.03] p-3 text-sm leading-6 text-muted">
            초대 링크를 연 사람은 로그인(또는 회원가입) 후 <span className="text-foreground">보기 전용(뷰어)</span>
            으로 참여해요. 편집을 맡기려면 참여한 뒤 소유자가 참여자 목록에서 권한을 바꿔주면 됩니다.
          </div>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span>
              프로젝트 링크 — <span className="text-foreground">이미 참여 중인 멤버</span>만 열 수 있어요
            </span>
            <div className="flex gap-2">
              <Input readOnly value={projectUrl} />
              <Button type="button" size="icon" variant="outline" onClick={() => copy(projectUrl)}>
                <Copy size={17} />
              </Button>
            </div>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
