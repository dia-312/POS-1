import { test, expect, type Page } from "@playwright/test";
import { login, plantDatabase, type SeedExpense, type SeedSale } from "./helpers";

// Thursday 15 Oct 2026, 12:00 in Jerusalem (UTC+3, summer time until 25 Oct)
test.use({ timezoneId: "Asia/Jerusalem" });
const NOW = new Date("2026-10-15T09:00:00Z");

const sales: SeedSale[] = [
  { createdAt: "2026-10-15T07:00:00Z", total: 20 }, // today
  { createdAt: "2026-10-03T08:00:00Z", total: 30 }, // earlier this month
  // 00:30 on 1 Oct LOCAL time (still 30 Sep in UTC): counts for October
  { createdAt: "2026-09-30T21:30:00Z", total: 7 },
  // 23:00 on 30 Sep LOCAL time: belongs to September, not October
  { createdAt: "2026-09-30T20:00:00Z", total: 100 },
  { createdAt: "2026-08-20T09:00:00Z", total: 500 }, // old month
];

const expenses: SeedExpense[] = [
  { createdAt: "2026-10-15T06:00:00Z", amount: 5 }, // today
  { createdAt: "2026-10-03T08:00:00Z", amount: 10 },
  { createdAt: "2026-09-12T08:00:00Z", amount: 999 }, // last month
];

type Overview = { chart: { day: number; date: string; total: number }[] };

/* The app's own query, run in the page (same module instance as the app's). */
const overview = (page: Page) =>
  page.evaluate(async (): Promise<Overview> => {
    const path = "/src/lib/database.ts";
    const database = await import(/* @vite-ignore */ path);
    return database.getDashboardOverview();
  });

test.describe("dashboard shows the current month", () => {
  test.beforeEach(async ({ page, context }) => {
    await page.clock.install({ time: NOW });
    await plantDatabase(context, { sales, expenses });
    await login(page);
    await expect(page.getByTestId("dashboard-month")).toBeVisible();
  });

  test("figures are this month's only, with today underneath", async ({ page }) => {
    await expect(page.getByTestId("dashboard-month")).toContainText("أكتوبر 2026");

    // October: revenue 20 + 30 + 7 = 57, expenses 5 + 10 = 15, net 42, 3 orders
    await expect(page.getByTestId("month-orders")).toHaveText("3");
    await expect(page.getByTestId("month-net")).toHaveText("₪42.00");
    await expect(page.getByText("إيرادات ₪57.00 · مصاريف ₪15.00")).toBeVisible();

    // today: 20 - 5, one order
    await expect(page.getByTestId("today-net")).toHaveText("اليوم: ₪15.00");
    await expect(page.getByTestId("today-orders")).toHaveText("اليوم: 1");
  });

  test("the chart has one point per day from the 1st to today, in local days", async ({
    page,
  }) => {
    const { chart } = await overview(page);

    expect(chart).toHaveLength(15);
    expect(chart[0]).toMatchObject({ day: 1, total: 7 }); // the 00:30 sale
    expect(chart[2]).toMatchObject({ day: 3, total: 30 });
    expect(chart[14]).toMatchObject({ day: 15, total: 20 });
    expect(chart.filter((p) => p.total === 0)).toHaveLength(12);
    // nothing from September or August leaks in
    expect(chart.reduce((sum, p) => sum + p.total, 0)).toBe(57);
  });
});

test("when the month changes while the app is open, the dashboard starts over", async ({
  page,
  context,
}) => {
  // 23:59:30 on 31 Oct local time (UTC+2: summer time ended on 25 Oct); the app stays open across midnight
  await page.clock.install({ time: new Date("2026-10-31T21:59:30Z") });
  await plantDatabase(context, {
    sales: [
      { createdAt: "2026-10-31T10:00:00Z", total: 40 },
      { createdAt: "2026-10-20T10:00:00Z", total: 60 },
    ],
    expenses: [{ createdAt: "2026-10-05T10:00:00Z", amount: 25 }],
  });

  await login(page);
  await expect(page.getByTestId("dashboard-month")).toContainText("أكتوبر 2026");
  await expect(page.getByTestId("month-orders")).toHaveText("2");
  await expect(page.getByTestId("month-net")).toHaveText("₪75.00");

  // midnight passes
  await page.clock.fastForward(60_000);

  await expect(page.getByTestId("dashboard-month")).toContainText("نوفمبر 2026");
  await expect(page.getByTestId("month-orders")).toHaveText("0");
  await expect(page.getByTestId("month-net")).toHaveText("₪0.00");
  await expect(page.getByTestId("today-orders")).toHaveText("اليوم: 0");
});
