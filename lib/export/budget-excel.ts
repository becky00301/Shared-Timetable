import { getSheetData, type CellObject, type Column, type SheetData } from "write-excel-file/node";
import { currencyFractionDigits, DEFAULT_CURRENCY, toAmount } from "@/lib/utils/money";

export const BUDGET_LABELS = {
  ko: {
    sheetBudget: "예산 요약", sheetExpenses: "지출 내역", metric: "항목", amount: "금액", currency: "통화",
    total: "전체 예산", scheduleSpending: "일정 지출", otherSpending: "기타 지출", spent: "총 지출",
    remaining: "남은 예산", notSet: "미설정", date: "날짜", source: "구분", description: "내용",
    location: "장소", memo: "메모", sourceSchedule: "일정", sourceOther: "기타 지출"
  },
  en: {
    sheetBudget: "Budget summary", sheetExpenses: "Spending", metric: "Item", amount: "Amount", currency: "Currency",
    total: "Total budget", scheduleSpending: "Schedule spending", otherSpending: "Other spending", spent: "Total spending",
    remaining: "Remaining budget", notSet: "Not set", date: "Date", source: "Source", description: "Description",
    location: "Location", memo: "Notes", sourceSchedule: "Schedule", sourceOther: "Other spending"
  }
} as const;

type Locale = keyof typeof BUDGET_LABELS;
type MoneyValue = number | string | null;
type BudgetProject = { title: string; budget_total: MoneyValue; budget_currency: string | null };
type BudgetItem = {
  day_id: string; title: string; amount: MoneyValue;
  location?: string | null; description?: string | null;
};
type Expense = { label: string; amount: number | string; spent_on?: string | null };
type SpendingRow = {
  date: string | null; source: string; description: string; amount: number;
  currency: string; location: string; memo: string;
};

const HEADER = { fontWeight: "bold", backgroundColor: "#F0EFEC", align: "center", height: 24 } as const;

export function moneyColumn<T>(header: string, currency: string, pick: (row: T) => number | null): Column<T> {
  return {
    header: { value: header, ...HEADER },
    cell: (row) => ({ value: pick(row) ?? undefined, type: Number, format: moneyFormat(currency), align: "right", alignVertical: "center" }),
    width: 22
  };
}

function moneyFormat(currency: string) {
  const number = currencyFractionDigits(currency) === 0 ? "#,##0" : "#,##0.00";
  return `${number};[Red]-${number};${currencyFractionDigits(currency) === 0 ? "0" : "0.00"}`;
}

function amount(value: MoneyValue) {
  const parsed = toAmount(value);
  if (value !== null && parsed === null) throw new Error("Invalid amount in Excel export");
  return parsed;
}

function text(value: string, style: Partial<CellObject> = {}): CellObject {
  return { value, type: String, fontFamily: "Arial", fontSize: 10, wrap: true, alignVertical: "center", ...style };
}

export function buildBudgetSheets(
  project: BudgetProject,
  days: { id: string; date: string }[],
  items: BudgetItem[],
  expenses: Expense[],
  locale: Locale
) {
  const labels = BUDGET_LABELS[locale];
  const currency = project.budget_currency || DEFAULT_CURRENCY;
  const dayById = new Map(days.map((day) => [day.id, day.date]));
  const rows: SpendingRow[] = [];
  for (const item of items) {
    const value = amount(item.amount);
    if (value === null) continue;
    // A multi-day schedule is one charge, even though it spans several days.
    rows.push({ date: dayById.get(item.day_id) ?? null, source: labels.sourceSchedule,
      description: item.title, amount: value, currency, location: item.location ?? "", memo: item.description ?? "" });
  }
  for (const expense of expenses) {
    const value = amount(expense.amount);
    if (value === null) throw new Error("Missing expense amount in Excel export");
    rows.push({ date: expense.spent_on ?? null, source: labels.sourceOther,
      description: expense.label, amount: value, currency, location: "", memo: "" });
  }
  rows.sort((a, b) => (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31"));

  const textColumn = (header: string, width: number, pick: (row: SpendingRow) => string, align: "left" | "center" = "left"): Column<SpendingRow> => ({
    header: { value: header, ...HEADER }, cell: (row) => text(pick(row), { align }), width
  });
  const columns: Column<SpendingRow>[] = [
    { header: { value: labels.date, ...HEADER }, width: 16,
      cell: (row) => ({ value: row.date ? new Date(`${row.date}T00:00:00Z`) : undefined, type: Date, format: "yyyy-mm-dd", align: "center", alignVertical: "center" }) },
    textColumn(labels.source, 18, (row) => row.source),
    textColumn(labels.description, 36, (row) => row.description),
    moneyColumn(labels.amount, currency, (row) => row.amount),
    textColumn(labels.currency, 10, (row) => row.currency, "center"),
    textColumn(labels.location, 26, (row) => row.location),
    textColumn(labels.memo, 44, (row) => row.memo)
  ];
  const lastRow = Math.max(2, rows.length + 1);
  const sheetRef = `'${labels.sheetExpenses.replaceAll("'", "''")}'`;
  const sumFor = (source: string) => `=SUMIFS(${sheetRef}!D2:D${lastRow},${sheetRef}!B2:B${lastRow},"${source}")`;
  const numericStyle = { fontFamily: "Arial", fontSize: 10, align: "right", alignVertical: "center", format: moneyFormat(currency), height: 26 } as const;
  const formula = (value: string, bold = false): CellObject => ({ value, type: "Formula", ...numericStyle, fontWeight: bold ? "bold" : undefined });
  const budget = amount(project.budget_total);
  const budgetData: SheetData = [
    [],
    [text(labels.sheetBudget, { fontSize: 14, fontWeight: "bold", height: 36 }), text(project.title, { fontWeight: "bold", height: Math.max(36, Math.ceil([...project.title].length / 14) * 15) })],
    [text(labels.currency), text(currency)],
    [],
    [text(labels.metric, HEADER), text(labels.amount, HEADER), text(labels.currency, HEADER)],
    [text(labels.total), budget === null ? text(labels.notSet, { align: "right" }) : { value: budget, type: Number, ...numericStyle }, text(currency)],
    [text(labels.scheduleSpending), formula(sumFor(labels.sourceSchedule)), text(currency)],
    [text(labels.otherSpending), formula(sumFor(labels.sourceOther)), text(currency)],
    [text(labels.spent, { fontWeight: "bold" }), formula("=SUM(B7:B8)", true), text(currency)],
    [text(labels.remaining, { fontWeight: "bold" }), formula(`=IF(ISNUMBER(B6),B6-B9,"${labels.notSet}")`, true), text(currency)]
  ];
  const expenseData: SheetData = getSheetData(rows, columns);
  expenseData.push([], [null, null, text(labels.spent, { fontWeight: "bold" }), formula(`=SUM(D2:D${lastRow})`, true), text(currency)]);

  return [
    { sheet: labels.sheetBudget, data: budgetData, columns: [{ width: 28 }, { width: 28 }, { width: 12 }], showGridLines: false },
    { sheet: labels.sheetExpenses, data: expenseData, columns: columns.map((column) => ({ width: column.width })), stickyRowsCount: 1, showGridLines: false }
  ];
}
