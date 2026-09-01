"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import {
  amountToInput,
  BUDGET_CURRENCIES,
  currencyFractionDigits,
  DEFAULT_CURRENCY,
  formatMoney,
  parseAmountInput
} from "@/lib/utils/money";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { Project } from "@/types/project";

/**
 * The money side of a timetable. What has been spent is never stored: it is
 * the sum of the amounts written on schedules plus the expenses recorded here,
 * so the figure can never disagree with the rows it came from.
 */
export function SidebarBudget({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const schedules = useProjectStore((state) => state.schedules);
  const expenses = useProjectStore((state) => state.expenses);
  const updateProjectBudget = useProjectStore((state) => state.updateProjectBudget);
  const addExpense = useProjectStore((state) => state.addExpense);
  const deleteExpense = useProjectStore((state) => state.deleteExpense);
  const updateExpense = useProjectStore((state) => state.updateExpense);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const { locale } = useLocale();
  const t = useT();

  const currency = project.budget_currency || DEFAULT_CURRENCY;
  const projectExpenses = useMemo(
    () => expenses.filter((expense) => expense.project_id === project.id),
    [expenses, project.id]
  );
  const pricedSchedules = useMemo(
    () =>
      schedules
        .filter(
          (item) =>
            item.project_id === project.id && typeof item.amount === "number" && item.amount > 0
        )
        .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)),
    [schedules, project.id]
  );

  const scheduleTotal = pricedSchedules.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const expenseTotal = projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const spent = scheduleTotal + expenseTotal;
  const budget = project.budget_total ?? null;
  const remaining = budget === null ? null : budget - spent;
  const over = remaining !== null && remaining < 0;
  // Clamped so the bar stays inside its track once spending passes the budget;
  // the "over" figure below carries the overrun. A budget of exactly 0 has no
  // ratio to show, so any spending against it reads as full.
  const percent =
    budget === null || budget <= 0
      ? spent > 0
        ? 100
        : 0
      : Math.min(100, Math.round((spent / budget) * 100));

  const [budgetDraft, setBudgetDraft] = useState(amountToInput(budget));
  useEffect(() => {
    setBudgetDraft(amountToInput(project.budget_total ?? null));
  }, [project.budget_total]);

  function saveBudget() {
    const raw = budgetDraft.trim();
    const parsed = raw ? parseAmountInput(raw) : null;
    if (raw && parsed === null) {
      toast.error(t("budget.invalidAmount"));
      setBudgetDraft(amountToInput(budget));
      return;
    }
    setBudgetDraft(amountToInput(parsed));
    if (parsed === budget) return;
    updateProjectBudget(project.id, { budget_total: parsed }).catch((error) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("budget.saveFailed"));
      setBudgetDraft(amountToInput(budget));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-black/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{t("budget.total")}</span>
          <select
            className="h-6 rounded-md border border-border bg-background px-1.5 text-[11px] tabular-nums text-muted outline-none disabled:opacity-60"
            value={currency}
            disabled={!canEdit}
            aria-label={t("budget.currency")}
            onChange={(event) => {
              updateProjectBudget(project.id, { budget_currency: event.target.value }).catch(
                (error) => {
                  console.error(error);
                  toast.error(error instanceof Error ? error.message : t("budget.saveFailed"));
                }
              );
            }}
          >
            {/* A currency already stored but no longer offered still renders. */}
            {[...new Set([currency, ...BUDGET_CURRENCIES])].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={currencyFractionDigits(currency) === 0 ? 1 : 0.01}
          className="mt-2 h-9 text-sm tabular-nums"
          value={budgetDraft}
          disabled={!canEdit}
          placeholder={t("budget.totalPlaceholder")}
          onChange={(event) => setBudgetDraft(event.target.value)}
          onBlur={saveBudget}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />

        {budget !== null ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8">
            <div
              className={cn("h-full rounded-full transition-[width]", over ? "bg-red-500" : "bg-primary")}
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}

        <dl className="mt-3 flex flex-col gap-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">
              {t("budget.spent")}
              {budget !== null ? (
                <span className="ml-1.5 tabular-nums">
                  · {t("budget.percentUsed", { percent })}
                </span>
              ) : null}
            </dt>
            <dd className="font-medium tabular-nums text-foreground">
              {formatMoney(spent, currency, locale)}
            </dd>
          </div>
          {remaining === null ? (
            <p className="pt-1 leading-5 text-muted">{t("budget.noBudget")}</p>
          ) : (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted">{over ? t("budget.over") : t("budget.remaining")}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  over ? "text-red-600" : "text-foreground"
                )}
              >
                {formatMoney(Math.abs(remaining), currency, locale)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <BreakdownRow
        label={t("budget.fromSchedules")}
        count={pricedSchedules.length}
        total={scheduleTotal}
        currency={currency}
      />
      {pricedSchedules.length ? (
        <div className="-mt-1 flex flex-col gap-1">
          {pricedSchedules.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedSchedule(item.id);
                setViewMode("grid");
              }}
              className="flex items-baseline justify-between gap-2 rounded-lg border border-border bg-black/[0.02] px-2.5 py-1.5 text-left transition hover:border-primary"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color ?? undefined }}
                />
                <span className="truncate text-xs text-foreground">{item.title}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {formatMoney(item.amount ?? 0, currency, locale)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <BreakdownRow
        label={t("budget.otherSpending")}
        count={projectExpenses.length}
        total={expenseTotal}
        currency={currency}
      />

      {canEdit ? (
        <ExpenseForm
          currency={currency}
          onAdd={(label, amount) => addExpense(project.id, { label, amount })}
        />
      ) : null}

      {projectExpenses.length ? (
        <div className="flex flex-col gap-1">
          {projectExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              label={expense.label}
              amount={expense.amount}
              currency={currency}
              canEdit={canEdit}
              onSave={(patch) =>
                updateExpense(expense.id, patch).catch((error) => {
                  console.error(error);
                  toast.error(t("budget.saveFailed"));
                })
              }
              onDelete={() =>
                deleteExpense(expense.id)
                  .then(() => toast.success(t("budget.expenseDeleted")))
                  .catch((error) => {
                    console.error(error);
                    toast.error(error instanceof Error ? error.message : t("budget.deleteFailed"));
                  })
              }
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs leading-5 text-muted">
          {t("budget.expenseEmpty")}
        </p>
      )}
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  total,
  currency
}: {
  label: string;
  count: number;
  total: number;
  currency: string;
}) {
  const { locale } = useLocale();
  const t = useT();
  return (
    <div className="flex items-baseline justify-between gap-2 px-0.5">
      <span className="text-[11px] font-medium text-muted">
        {label}
        <span className="ml-1.5 font-normal tabular-nums">{t("budget.itemCount", { count })}</span>
      </span>
      <span className="text-[11px] tabular-nums text-muted">
        {formatMoney(total, currency, locale)}
      </span>
    </div>
  );
}

function ExpenseForm({
  currency,
  onAdd
}: {
  currency: string;
  onAdd: (label: string, amount: number) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const t = useT();

  const parsed = parseAmountInput(amount);
  const ready = Boolean(label.trim()) && parsed !== null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || parsed === null) return;
    setSaving(true);
    try {
      await onAdd(label.trim(), parsed);
      setLabel("");
      setAmount("");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("budget.addFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2">
        <Input
          value={label}
          className="h-9 text-sm"
          placeholder={t("budget.expenseLabelPlaceholder")}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={currencyFractionDigits(currency) === 0 ? 1 : 0.01}
          className="h-9 text-sm tabular-nums"
          value={amount}
          placeholder={t("budget.expenseAmountPlaceholder")}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={!ready || saving}>
        <Plus size={15} />
        {saving ? t("budget.adding") : t("budget.addExpense")}
      </Button>
    </form>
  );
}

function ExpenseRow({
  label,
  amount,
  currency,
  canEdit,
  onSave,
  onDelete
}: {
  label: string;
  amount: number;
  currency: string;
  canEdit: boolean;
  onSave: (patch: { label?: string; amount?: number }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(label);
  const [amountDraft, setAmountDraft] = useState(amountToInput(amount));
  const { locale } = useLocale();
  const t = useT();

  function commit() {
    setEditing(false);
    const nextLabel = labelDraft.trim();
    const nextAmount = parseAmountInput(amountDraft);
    if (!nextLabel || nextAmount === null) {
      setLabelDraft(label);
      setAmountDraft(amountToInput(amount));
      return;
    }
    const patch: { label?: string; amount?: number } = {};
    if (nextLabel !== label) patch.label = nextLabel;
    if (nextAmount !== amount) patch.amount = nextAmount;
    if (Object.keys(patch).length) onSave(patch);
  }

  if (editing && canEdit) {
    return (
      <div
        className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2"
        // One commit for the pair: moving between the two fields must not save
        // a half-edited row.
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          commit();
        }}
      >
        <Input
          autoFocus
          value={labelDraft}
          className="h-9 text-sm"
          onChange={(event) => setLabelDraft(event.target.value)}
        />
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={currencyFractionDigits(currency) === 0 ? 1 : 0.01}
          className="h-9 text-sm tabular-nums"
          value={amountDraft}
          onChange={(event) => setAmountDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1 rounded-lg border border-border bg-black/[0.02] px-2.5 py-1.5">
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => {
          setLabelDraft(label);
          setAmountDraft(amountToInput(amount));
          setEditing(true);
        }}
        className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left disabled:cursor-default"
        title={canEdit ? t("budget.expenseEditHint") : undefined}
      >
        <span className="truncate text-xs text-foreground">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {formatMoney(amount, currency, locale)}
        </span>
      </button>
      {canEdit ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("budget.expenseDeleteLabel")}
          className="shrink-0 rounded-sm p-1 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  );
}
