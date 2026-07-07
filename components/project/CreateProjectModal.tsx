"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

export function CreateProjectModal() {
  const router = useRouter();
  const open = useUiStore((state) => state.isCreateProjectOpen);
  const setOpen = useUiStore((state) => state.setCreateProjectOpen);
  const createProject = useProjectStore((state) => state.createProject);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Project title is required.");
      return;
    }
    try {
      const project = await createProject(title.trim(), description.trim());
      setOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Project created.");
      router.push(`/plans/${project.slug}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not create the project.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Create project</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            Build a shareable timetable from selected dates only.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <label className="flex flex-col gap-2 text-sm text-muted">
            Title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="European Trip" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted">
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A collaborative itinerary for the selected travel dates."
            />
          </label>
          <Button type="submit">Create timetable</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
