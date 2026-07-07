"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";

export function AddDateModal({ projectId }: { projectId: string }) {
  const [date, setDate] = useState("");
  const open = useUiStore((state) => state.isAddDateOpen);
  const setOpen = useUiStore((state) => state.setAddDateOpen);
  const addDay = useProjectStore((state) => state.addDay);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!date) {
      toast.error("Choose a date.");
      return;
    }
    try {
      await addDay(projectId, date);
      setDate("");
      setOpen(false);
      toast.success("Date added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the date.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Add selected date</DialogTitle>
          <DialogDescription className="text-sm text-muted">
            PlanTogether adds only the dates this project needs.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button type="submit">Add date</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
