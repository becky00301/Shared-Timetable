"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";

type DeletionSummary = {
  willDelete: number;
  willTransfer: number;
};

export function DeleteAccountSection() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState<DeletionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const confirmWord = t("account.confirm.word");
  const canDelete = typed.trim() === confirmWord && password.length > 0 && !working;

  async function showConfirmation() {
    setTyped("");
    setPassword("");
    setPasswordError(false);
    setSummary(null);
    setSummaryFailed(false);
    setSummaryLoading(true);
    setOpen(true);

    try {
      const response = await fetch("/api/account/delete", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      setSummary((await response.json()) as DeletionSummary);
    } catch (error) {
      console.error(error);
      setSummaryFailed(true);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function remove() {
    if (!canDelete) return;
    setWorking(true);
    setPasswordError(false);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation: "DELETE" })
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 403 && result?.error === "invalid-password") {
        setPasswordError(true);
        setWorking(false);
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "account-delete-failed");
      toast.success(t("account.deleted"));
      window.location.replace("/");
    } catch (error) {
      console.error(error);
      toast.error(t("account.deleteFailed"));
      setWorking(false);
    }
  }

  return (
    <section className="mt-16 rounded-xl border border-red-500/25 bg-red-500/[0.03] p-5">
      <h2 className="text-base font-semibold text-foreground">{t("account.danger.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("account.danger.body")}</p>
      <Button
        variant="danger"
        size="sm"
        className="mt-4"
        onClick={showConfirmation}
      >
        {t("account.danger.cta")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (working) return;
          setOpen(next);
          if (!next) {
            setPassword("");
            setTyped("");
            setPasswordError(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">
              {t("account.confirm.title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted">
              {t("account.danger.body")}
            </DialogDescription>
          </DialogHeader>

          <div className="border-y border-border py-3 text-sm">
            {summaryLoading ? (
              <p className="text-muted">{t("account.summary.loading")}</p>
            ) : summary ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">{t("account.summary.delete")}</span>
                  <strong className="font-semibold text-foreground">{summary.willDelete}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted">{t("account.summary.transfer")}</span>
                  <strong className="font-semibold text-foreground">{summary.willTransfer}</strong>
                </div>
              </div>
            ) : summaryFailed ? (
              <p className="text-red-600">{t("account.summary.failed")}</p>
            ) : null}
          </div>

          <label className="mt-4 flex flex-col gap-1.5 text-sm text-muted">
            {t("account.password.label")}
            <Input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError(false);
              }}
              placeholder={t("account.password.placeholder")}
              autoComplete="current-password"
              disabled={working}
              aria-invalid={passwordError}
              autoFocus
            />
            {passwordError ? (
              <span className="text-xs text-red-600" role="alert">
                {t("account.password.incorrect")}
              </span>
            ) : null}
          </label>

          <label className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            {t("account.confirm.body", { word: confirmWord })}
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={confirmWord}
              autoComplete="off"
              disabled={working}
            />
          </label>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={working}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="danger" className="flex-1" disabled={!canDelete} onClick={remove}>
              {working ? t("account.confirm.working") : t("account.confirm.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
