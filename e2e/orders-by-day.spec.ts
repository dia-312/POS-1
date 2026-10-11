import { test, expect } from "@playwright/test";
import { login, plantDatabase, type SeedSale } from "./helpers";

// A fixed place and moment, so "today", "yesterday" and day boundaries are
// the same on every machine: Thursday 15 Oct 2026, 12:00 in Jerusalem (UTC+3).
test.use({ timezoneId: "Asia/Jerusalem" });
const NOW = new Date("2026-10-15T09:00:00Z");

const item = { name: "ايس لاتيه", size: "Small", price: 10, quantity: 1 };
const sale = (createdAt: string, total: number): SeedSale => ({
  createdAt,
  total,
  items: [{ ...item, price: total }],
});

const dayKeys = (page: import("@playwright/test").Page) =>
  page
    .locator('[data-testid^="day-"]')
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-testid")!.replace("day-", ""))
    );

test.describe("orders grouped by day", () => {
  test.beforeEach(async ({ page, context }) => {
    await page.clock.install({ time: NOW });
    await plantDatabase(context, {
      sales: [
        sale("2026-10-15T07:00:00Z", 20), // today 10:00
        sale("2026-10-15T03:30:00Z", 30), // today 06:30
        sale("2026-10-14T15:00:00Z", 15), // yesterday 18:00
        // 00:30 on the 14th LOCAL time, still the 13th in UTC: belongs to the 14th
        sale("2026-10-13T21:30:00Z", 5),
        sale("2026-10-10T09:00:00Z", 8), // 5 days ago
        sale("2026-08-31T09:00:00Z", 12), // 45 days ago: beyond the first 30 days
      ],
    });
    await login(page);
    await page.getByRole("link", { name: "الطلبات" }).click();
    await expect(page.getByTestId("day-2026-10-15")).toBeVisible();
  });

  test("orders are grouped per local day, newest day first, with counts and totals", async ({
    page,
  }) => {
    expect(await dayKeys(page)).toEqual(["2026-10-15", "2026-10-14", "2026-10-10"]);

    const today = page.getByTestId("day-2026-10-15");
    await expect(today).toContainText("اليوم");
    await expect(today).toContainText("2 طلبات");
    await expect(today).toContainText("₪50.00");

    const yesterday = page.getByTestId("day-2026-10-14");
    await expect(yesterday).toContainText("أمس");
    await expect(yesterday).toContainText("2 طلبات"); // incl. the 00:30 one
    await expect(yesterday).toContainText("₪20.00");

    // a plain older day shows its date, not "today"/"yesterday"
    const older = page.getByTestId("day-2026-10-10");
    await expect(older).toContainText("10");
    await expect(older).not.toContainText("اليوم");
    await expect(older).not.toContainText("أمس");
    await expect(older).toContainText("1 طلبات");
  });

  test("only the newest day is open; the others fold and unfold on click", async ({
    page,
  }) => {
    // today's two orders are listed, the older days' are not
    await expect(page.getByTestId("day-2026-10-15").locator('[data-testid^="order-"]')).toHaveCount(2);
    await expect(page.getByTestId("day-2026-10-14").locator('[data-testid^="order-"]')).toHaveCount(0);

    const yesterdayHeader = page.getByTestId("day-2026-10-14").getByRole("button").first();
    await yesterdayHeader.click();
    await expect(page.getByTestId("day-2026-10-14").locator('[data-testid^="order-"]')).toHaveCount(2);
    await expect(yesterdayHeader).toHaveAttribute("aria-expanded", "true");

    await page.getByTestId("day-2026-10-15").getByRole("button").first().click();
    await expect(page.getByTestId("day-2026-10-15").locator('[data-testid^="order-"]')).toHaveCount(0);
  });

  test("each order shows its time and opens its details", async ({ page }) => {
    await page.getByTestId("day-2026-10-14").getByRole("button").first().click();

    // the 00:30 sale (order #4) is listed under the 14th with its local time
    const order4 = page.getByTestId("order-4");
    await expect(order4).toContainText("#4");
    await expect(order4).toContainText("12:30");

    await order4.getByRole("button", { name: "عرض" }).click();
    await expect(page.getByText("طلب رقم #4")).toBeVisible();
    await expect(page.getByText("ايس لاتيه (Small)")).toBeVisible();
  });

  test("older orders are loaded on request", async ({ page }) => {
    // Aug 31 is 45 days back: not loaded yet
    await expect(page.getByTestId("day-2026-08-31")).toHaveCount(0);

    await page.getByRole("button", { name: "عرض طلبات أقدم" }).click();
    await expect(page.getByTestId("day-2026-08-31")).toBeVisible();
    expect(await dayKeys(page)).toEqual([
      "2026-10-15",
      "2026-10-14",
      "2026-10-10",
      "2026-08-31",
    ]);

    // nothing older is left, so the button is gone
    await expect(page.getByRole("button", { name: "عرض طلبات أقدم" })).toHaveCount(0);
  });

  test("one click shows the whole history", async ({ page }) => {
    await expect(page.getByTestId("day-2026-08-31")).toHaveCount(0);

    await page.getByRole("button", { name: "عرض كل الطلبات" }).click();

    await expect(page.getByTestId("day-2026-08-31")).toBeVisible();
    expect(await dayKeys(page)).toHaveLength(4);
    await expect(page.getByRole("button", { name: "عرض كل الطلبات" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "عرض طلبات أقدم" })).toHaveCount(0);
  });

  test("deleting an order updates its day", async ({ page }) => {
    const today = page.getByTestId("day-2026-10-15");
    await today.getByTestId("order-1").getByRole("button", { name: "حذف" }).click();
    await page.getByRole("button", { name: "حذف", exact: true }).last().click();

    await expect(today).toContainText("1 طلبات");
    await expect(today).toContainText("₪30.00");
  });
});

test("a long history stays usable: only the recent days are loaded", async ({
  page,
  context,
}) => {
  await page.clock.install({ time: NOW });

  // 2,400 sales over 60 days, 3 lines each
  const sales: SeedSale[] = [];
  for (let day = 0; day < 60; day++) {
    for (let n = 0; n < 40; n++) {
      const at = new Date(NOW.getTime() - day * 86_400_000 - n * 60_000);
      sales.push({
        createdAt: at.toISOString(),
        total: 30,
        items: [item, item, item],
      });
    }
  }
  await plantDatabase(context, { sales });

  await login(page);
  const started = Date.now();
  await page.getByRole("link", { name: "الطلبات" }).click();
  await expect(page.getByTestId("day-2026-10-15")).toContainText("40 طلبات");

  expect((await dayKeys(page)).length).toBe(30); // 30 days, not 60
  expect(Date.now() - started).toBeLessThan(8000);
  await expect(page.getByRole("button", { name: "عرض طلبات أقدم" })).toBeVisible();
});
