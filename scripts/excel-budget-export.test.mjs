import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import fs from "node:fs/promises";
import writeXlsxFile from "write-excel-file/node";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return { url: 'data:text/javascript,export const createSupabaseServerClient = async () => globalThis.excelExportTestClient;', shortCircuit: true };
    }
    if (specifier.startsWith("@/lib/")) return { url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context);
  }
});
const { buildBudgetSheets, moneyColumn } = await import("../lib/export/budget-excel.ts");
const { GET } = await import("../app/api/export/excel/route.ts");
const project = { title: "유럽 여행", budget_total: 2000000, budget_currency: "KRW" };
const days = [{ id: "day-1", date: "2026-10-06" }, { id: "day-2", date: "2026-10-07" }];
const items = [
  { day_id: "day-1", end_day_id: "day-2", title: "숙소 2박", amount: "300000", location: "파리", description: "보증금 포함" },
  { day_id: "day-2", title: "무료 산책", amount: 0 },
  { day_id: "day-1", title: "금액 미입력", amount: null }
];
const expenses = [
  { label: "택시", amount: "25000", spent_on: "2026-10-06" },
  { label: "공동 준비물", amount: 10000, spent_on: null }
];

test("exports schedule and other spending once, keeping zero, unset dates and typed money distinct", () => {
  const [summary, detail] = buildBudgetSheets(project, days, items, expenses, "ko");
  assert.equal(summary.sheet, "예산 요약");
  assert.equal(detail.sheet, "지출 내역");
  const records = detail.data.slice(1, 5);
  assert.equal(records.length, 4);
  assert.deepEqual(records.map((row) => row[2].value), ["숙소 2박", "택시", "무료 산책", "공동 준비물"]);
  assert.deepEqual(records.map((row) => row[3].value), [300000, 25000, 0, 10000]);
  assert(records.every((row) => row[3].type === Number));
  assert(records[0][0].value instanceof Date);
  assert.equal(records[3][0].value, undefined);
  assert.equal(summary.data[5][1].value, 2000000);
  assert.equal(summary.data[6][1].value, '=SUMIFS(\'지출 내역\'!D2:D5,\'지출 내역\'!B2:B5,"일정")');
  assert.equal(summary.data[7][1].value, '=SUMIFS(\'지출 내역\'!D2:D5,\'지출 내역\'!B2:B5,"기타 지출")');
  assert.equal(summary.data[8][1].value, "=SUM(B7:B8)");
  assert.equal(summary.data[9][1].value, '=IF(ISNUMBER(B6),B6-B9,"미설정")');
  assert.equal(detail.data.at(-1)[3].value, "=SUM(D2:D5)");
});

test("distinguishes no budget from a zero budget and handles empty spending without a circular total", () => {
  const [unset, empty] = buildBudgetSheets({ ...project, budget_total: null }, [], [], [], "ko");
  const [zero] = buildBudgetSheets({ ...project, budget_total: 0 }, [], [], [], "ko");
  assert.equal(unset.data[5][1].value, "미설정");
  assert.equal(zero.data[5][1].value, 0);
  assert.equal(zero.data[5][1].type, Number);
  assert.equal(empty.data[0][3].value, "금액");
  assert.equal(empty.data[2][3].value, "=SUM(D2:D2)");
  assert.match(unset.data[6][1].value, /D2:D2/);
});

test("uses English sheet references and preserves cents and literal descriptions", () => {
  const [summary, detail] = buildBudgetSheets(
    { ...project, budget_currency: "USD", budget_total: "100.50" }, days,
    [{ ...items[0], title: "=1+1", amount: "12.34" }], [], "en"
  );
  assert.equal(summary.sheet, "Budget summary");
  assert.equal(detail.sheet, "Spending");
  assert.equal(summary.data[5][1].value, 100.5);
  assert.equal(detail.data[1][3].value, 12.34);
  assert.match(detail.data[1][3].format, /#,##0\.00/);
  assert.equal(detail.data[1][2].type, String);
  assert.equal(detail.data[1][2].value, "=1+1");
  assert.match(summary.data[6][1].value, /'Spending'!D2:D2/);
  const column = moneyColumn("Amount", "USD", (row) => row.amount);
  assert.equal(column.cell({ amount: null }).value, undefined);
  assert.equal(column.cell({ amount: 0 }).value, 0);
});

test("rejects invalid financial data instead of exporting misleading zero spending", () => {
  assert.throws(() => buildBudgetSheets(project, days, [{ ...items[0], amount: "invalid" }], [], "ko"), /Invalid amount/);
});

test("serializes both finance sheets to a real XLSX workbook", async () => {
  const sheets = buildBudgetSheets(project, days, items, expenses, "ko");
  const file = await writeXlsxFile(sheets);
  const buffer = await file.toBuffer();
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  assert(buffer.length > 1000);
  if (process.env.EXCEL_EXPORT_SAMPLE_PATH) await fs.writeFile(process.env.EXCEL_EXPORT_SAMPLE_PATH, buffer);
});

function client({ user = { id: "export-user" }, found = true, expensesError = null } = {}) {
  const queries = [];
  const tables = {
    projects: found ? { ...project, id: "project-1" } : null,
    project_days: days.map((day, index) => ({ ...day, sort_order: index })),
    schedule_items: items.map((item, index) => ({ ...item, start_time: "09:00:00", end_time: "10:00:00", all_day: index === 0, color: null })),
    project_notes: [{ body: "준비물 확인", created_at: "2026-10-01T00:00:00Z" }],
    project_expenses: expenses
  };
  return {
    queries,
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      const result = { data: tables[table], error: table === "project_expenses" ? expensesError : null };
      return {
        select(columns) { query.columns = columns; return this; },
        eq(column, value) { query.filters.push([column, value]); return this; },
        order() { return this; },
        maybeSingle: async () => result,
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
      };
    }
  };
}

test("the authenticated download loads financial data and scopes every query to the project", async () => {
  globalThis.excelExportTestClient = client();
  const response = await GET(new Request("https://example.test/api/export/excel?projectId=project-1&locale=ko"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /spreadsheetml/);
  assert.match(response.headers.get("content-disposition"), /attachment/);
  const queries = globalThis.excelExportTestClient.queries;
  assert.equal(queries.length, 5);
  for (const query of queries) {
    assert.deepEqual(query.filters, [[query.table === "projects" ? "id" : "project_id", "project-1"]]);
  }
  assert.match(queries.find((query) => query.table === "projects").columns, /budget_total/);
  assert.match(queries.find((query) => query.table === "schedule_items").columns, /amount/);
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  if (process.env.EXCEL_EXPORT_SAMPLE_PATH) await fs.writeFile(process.env.EXCEL_EXPORT_SAMPLE_PATH.replace(/\.xlsx$/, "-full.xlsx"), buffer);
});

test("requires login and rejects partial downloads when a spending query fails", async (t) => {
  globalThis.excelExportTestClient = client({ user: null });
  const request = new Request("https://example.test/api/export/excel?projectId=project-1");
  assert.equal((await GET(request)).status, 401);
  assert.equal(globalThis.excelExportTestClient.queries.length, 0);
  globalThis.excelExportTestClient = client({ expensesError: { message: "Database unavailable" } });
  t.mock.method(console, "error", () => {});
  const response = await GET(request);
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /엑셀 데이터를/);
  globalThis.excelExportTestClient = client({ found: false });
  assert.equal((await GET(request)).status, 404);
});
