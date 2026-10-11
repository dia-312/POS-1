import { test, expect } from "@playwright/test";
import {
  addToCart,
  dbRows,
  loginAndOpenCashier,
  openTable,
  payActiveOrder,
  printLog,
  stubPrinting,
} from "./helpers";

const LATTE = "ايس لاتيه";
const SPANISH = "ايس سبنش لاتيه";

type FaultWindow = { __e2eFail: { pattern: string; times: number }[] };

const injectFailure = (
  page: import("@playwright/test").Page,
  pattern: string,
  times = 1
) =>
  page.evaluate(
    ([p, t]) => {
      (globalThis as unknown as FaultWindow).__e2eFail = [
        { pattern: p as string, times: t as number },
      ];
    },
    [pattern, times] as const
  );

test.describe("when the database misbehaves during checkout", () => {
  test.beforeEach(async ({ page }) => {
    await stubPrinting(page, "freeze");
    await loginAndOpenCashier(page);
  });

  test("an order with several items is saved completely and then printed", async ({
    page,
  }) => {
    await addToCart(page, LATTE, "Small");
    await addToCart(page, LATTE, "Large");
    await addToCart(page, SPANISH, "Medium");
    await page.getByTestId("cart").getByPlaceholder("إضافة ملاحظة...").first().fill("ثلج");
    await payActiveOrder(page);

    await expect.poll(async () => (await printLog(page)).length).toBe(1);
    const items = await dbRows(page, "SELECT name, size, quantity FROM sale_items ORDER BY id");
    expect(items).toEqual([
      { name: LATTE, size: "Small", quantity: 1 },
      { name: LATTE, size: "Large", quantity: 1 },
      { name: SPANISH, size: "Medium", quantity: 1 },
    ]);
  });

  test("if the items cannot be saved no half-saved sale is left, and nothing is lost on screen", async ({
    page,
  }) => {
    await openTable(page, "5");
    await addToCart(page, LATTE, "Small");
    await addToCart(page, SPANISH, "Medium");

    await injectFailure(page, "INSERT INTO sale_items");
    await payActiveOrder(page);

    await expect(page.getByText("فشل إتمام الطلب")).toBeVisible();
    // no sale without items, no print, and the order is still there to retry
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(0);
    expect(await dbRows(page, "SELECT id FROM sale_items")).toHaveLength(0);
    expect(await printLog(page)).toHaveLength(0);
    expect(await dbRows(page, "SELECT label FROM open_orders")).toHaveLength(1);
    await expect(page.getByTestId("tab-5")).toContainText("2 قطع");

    // the payment window stays open so the cashier can simply retry
    await expect(page.getByText("تأكيد الدفع")).toBeVisible();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await expect.poll(async () => (await printLog(page)).length).toBe(1);
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(1);
    expect(await dbRows(page, "SELECT id FROM sale_items")).toHaveLength(2);
  });

  test("a stock-update failure does not stop the saved order from being finished and printed", async ({
    page,
  }) => {
    await addToCart(page, LATTE, "Small");
    await injectFailure(page, "UPDATE products SET stock", 5);
    await payActiveOrder(page);

    await expect(page.getByText("تعذر تحديث المخزون")).toBeVisible();
    await expect.poll(async () => (await printLog(page)).length).toBe(1);
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(1);
    // the screen is clean, so a retry cannot sell the same cart twice
    await expect(page.getByTestId("tab-quick")).not.toContainText("₪");
    await expect(page.getByText("تأكيد الدفع")).toHaveCount(0);
  });

  test("if the table cannot be closed the cashier is told, and the sale is recorded once", async ({
    page,
  }) => {
    await openTable(page, "9");
    await addToCart(page, LATTE, "Small");

    await injectFailure(page, "DELETE FROM open_orders", 3);
    await payActiveOrder(page);

    await expect(page.getByText("تعذر إغلاق الطاولة")).toBeVisible();
    await expect.poll(async () => (await printLog(page)).length).toBe(1);
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(1);
  });
});
