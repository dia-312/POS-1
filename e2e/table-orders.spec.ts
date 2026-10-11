import { test, expect } from "@playwright/test";
import {
  addToCart,
  dbRows,
  loginAndOpenCashier,
  openTable,
  payActiveOrder,
  plantLegacyDatabase,
} from "./helpers";

const LATTE = "ايس لاتيه"; // Small 8 / Medium 10 / Large 12, stock 100
const SPANISH = "ايس سبنش لاتيه"; // Small 12 / Medium 14 / Large 16

test.describe("table orders", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndOpenCashier(page);
  });

  test("each table keeps its own order and can be edited any time", async ({
    page,
  }) => {
    const cart = page.getByTestId("cart");

    // a quick (take-away) order in progress
    await addToCart(page, LATTE, "Small");

    await openTable(page, "3");
    await expect(cart).toContainText("طاولة 3");
    await expect(cart.getByText(`${LATTE} (Small)`)).toHaveCount(0); // starts empty
    await addToCart(page, SPANISH, "Large");

    await openTable(page, "5");
    await addToCart(page, LATTE, "Medium");
    await addToCart(page, LATTE, "Medium");

    // back to table 3: only its own item, then edit it later ("they ordered more")
    await page.getByTestId("tab-3").click();
    await expect(cart).toContainText(`${SPANISH} (Large)`);
    await expect(cart).not.toContainText(`${LATTE} (Medium)`);
    await addToCart(page, LATTE, "Small");
    await cart.getByRole("button", { name: "+" }).first().click();

    // table 5 is untouched by the edits made on table 3
    await page.getByTestId("tab-5").click();
    await expect(cart).toContainText(`${LATTE} (Medium)`);
    await expect(cart).not.toContainText(SPANISH);
    await expect(cart).toContainText("₪20.00");

    // the quick order is still exactly what it was
    await page.getByTestId("tab-quick").click();
    await expect(cart).toContainText(`${LATTE} (Small)`);
    await expect(cart).toContainText("₪8.00");

    // the tabs are fully visible, not squeezed or clipped by the layout
    for (const id of ["tab-quick", "tab-3", "tab-5"]) {
      await expect(page.getByTestId(id)).toBeInViewport({ ratio: 1 });
      expect((await page.getByTestId(id).boundingBox())!.height).toBeGreaterThan(36);
    }

    // tab summaries
    await expect(page.getByTestId("tab-3")).toContainText("₪");
    await expect(page.getByTestId("tab-5")).toContainText("2 قطع");
  });

  test("discount and notes are per table", async ({ page }) => {
    const cart = page.getByTestId("cart");

    await openTable(page, "1");
    await addToCart(page, LATTE, "Large"); // 12
    await page.getByRole("button", { name: "%50 خصم" }).click();
    await cart.getByPlaceholder("إضافة ملاحظة...").fill("بدون سكر");
    await expect(cart).toContainText("₪6.00"); // 12 - 50%

    await openTable(page, "2");
    await addToCart(page, LATTE, "Large");
    await expect(cart).toContainText("₪12.00"); // no discount leaked over

    await page.getByTestId("tab-1").click();
    await expect(cart).toContainText("₪6.00");
    await expect(cart.getByPlaceholder("إضافة ملاحظة...")).toHaveValue("بدون سكر");
  });

  test("open tables survive an app restart", async ({ page }) => {
    await openTable(page, "8");
    await addToCart(page, SPANISH, "Medium");
    await addToCart(page, SPANISH, "Medium");
    await page.getByRole("button", { name: "%10 خصم" }).click();
    await page.getByTestId("cart").getByPlaceholder("إضافة ملاحظة...").fill("حار");

    await openTable(page, "9");
    await addToCart(page, LATTE, "Small");

    // saved in the database right away (not only in memory)
    await expect
      .poll(async () => (await dbRows(page, "SELECT label FROM open_orders ORDER BY id")).map((r) => r.label))
      .toEqual(["8", "9"]);

    await page.reload(); // = closing and reopening the desktop app
    await expect(page.getByTestId("tab-8")).toBeVisible();
    await expect(page.getByTestId("tab-9")).toBeVisible();

    await page.getByTestId("tab-8").click();
    const cart = page.getByTestId("cart");
    await expect(cart).toContainText(`${SPANISH} (Medium)`);
    await expect(cart).toContainText("₪25.20"); // 2 x 14 - 10%
    await expect(cart.getByPlaceholder("إضافة ملاحظة...")).toHaveValue("حار");
  });

  test("many fast clicks are all saved, in order", async ({ page }) => {
    await openTable(page, "12");

    const button = page
      .getByTestId("products")
      .locator("> div")
      .filter({ has: page.getByRole("heading", { name: LATTE, exact: true }) })
      .getByRole("button", { name: /^Small/ });

    for (let i = 0; i < 25; i++) await button.click({ delay: 0 });

    await expect(page.getByTestId("tab-12")).toContainText("25 قطع");
    await expect
      .poll(async () => {
        const rows = await dbRows(page, "SELECT items FROM open_orders WHERE label = '12'");
        return JSON.parse(rows[0].items as string)[0].quantity;
      })
      .toBe(25);
  });

  test("a table name must be new and not empty", async ({ page }) => {
    await openTable(page, "3");

    await page.getByRole("button", { name: "+ طاولة جديدة" }).click();
    const input = page.getByPlaceholder("رقم أو اسم الطاولة");

    await input.fill(" 3 ");
    await page.getByRole("button", { name: "فتح", exact: true }).click();
    await expect(page.getByText("هذه الطاولة لديها طلب مفتوح بالفعل")).toBeVisible();

    await input.fill("   ");
    await page.getByRole("button", { name: "فتح", exact: true }).click();
    await expect(page.getByText("اكتب اسم أو رقم الطاولة")).toBeVisible();

    expect(await dbRows(page, "SELECT id FROM open_orders")).toHaveLength(1);
  });

  test("paying a table records one sale with its name and closes it", async ({
    page,
  }) => {
    await openTable(page, "4");
    await addToCart(page, LATTE, "Medium"); // 10
    await addToCart(page, LATTE, "Medium"); // 10
    await addToCart(page, SPANISH, "Small"); // 12
    await page.getByTestId("cart").getByPlaceholder("إضافة ملاحظة...").first().fill("ثلج زيادة");

    await openTable(page, "6"); // another table must stay open
    await addToCart(page, LATTE, "Small");

    await page.getByTestId("tab-4").click();
    const stockBefore = await dbRows(
      page,
      "SELECT stock FROM products WHERE name = ?",
      [LATTE]
    );

    await payActiveOrder(page);

    await expect(page.getByTestId("tab-4")).toHaveCount(0);
    await expect(page.getByTestId("tab-6")).toBeVisible();

    const sales = await dbRows(page, "SELECT * FROM sales");
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ table_label: "4", total: 32, subtotal: 32 });

    const items = await dbRows(
      page,
      "SELECT name, size, quantity, price, note FROM sale_items ORDER BY id"
    );
    expect(items).toEqual([
      { name: LATTE, size: "Medium", quantity: 2, price: 10, note: "ثلج زيادة" },
      { name: SPANISH, size: "Small", quantity: 1, price: 12, note: null },
    ]);

    // the table's open order is gone, the other one is untouched
    expect(
      (await dbRows(page, "SELECT label FROM open_orders")).map((r) => r.label)
    ).toEqual(["6"]);

    // stock went down by what was sold
    const stockAfter = await dbRows(page, "SELECT stock FROM products WHERE name = ?", [LATTE]);
    expect(Number(stockAfter[0].stock)).toBe(Number(stockBefore[0].stock) - 2);

    // it shows up in Orders with the table name
    await page.getByRole("link", { name: "الطلبات" }).click();
    await expect(page.getByText("#1 · طاولة 4")).toBeVisible();

    // and the table can be opened again for the next customers
    await page.getByRole("link", { name: "الكاشير" }).click();
    await openTable(page, "4");
  });

  test("cancelling a table deletes it without recording a sale", async ({
    page,
  }) => {
    await openTable(page, "7");
    await addToCart(page, LATTE, "Small");

    await page.getByRole("button", { name: "إلغاء طلب الطاولة" }).click();
    await page.getByRole("button", { name: "إلغاء الطلب" }).click();

    await expect(page.getByTestId("tab-7")).toHaveCount(0);
    expect(await dbRows(page, "SELECT id FROM open_orders")).toHaveLength(0);
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(0);
    // back on the quick order
    await expect(page.getByTestId("cart")).toContainText("الطلب الحالي");
  });

  test("the pay button is disabled for an empty order", async ({ page }) => {
    const pay = page.getByTestId("cart").getByRole("button", { name: /^دفع/ });
    await expect(pay).toBeDisabled();

    await openTable(page, "2");
    await expect(pay).toBeDisabled();

    await addToCart(page, LATTE, "Small");
    await expect(pay).toBeEnabled();
  });

  test("the quick order still works as before", async ({ page }) => {
    await addToCart(page, LATTE, "Small");
    await payActiveOrder(page);

    const sales = await dbRows(page, "SELECT total, table_label FROM sales");
    expect(sales).toEqual([{ total: 8, table_label: null }]);
    await expect(page.getByTestId("tab-quick")).not.toContainText("₪");
  });

  test("table orders are part of a backup and come back on restore", async ({
    page,
  }) => {
    await openTable(page, "11");
    await addToCart(page, SPANISH, "Large");
    await expect
      .poll(async () => (await dbRows(page, "SELECT items FROM open_orders")).length)
      .toBe(1);
    await expect
      .poll(async () => (await dbRows(page, "SELECT items FROM open_orders"))[0]?.items)
      .toContain(SPANISH);

    await page.getByRole("link", { name: "الإعدادات" }).click();
    await page.getByRole("button", { name: "نسخ احتياطي الآن" }).click();

    const backupPath = await page.evaluate(() => {
      const files = (globalThis as unknown as { __e2eFiles: Record<string, string> }).__e2eFiles;
      // the app also backs up on start-up (before this table existed)
      return Object.keys(files).find((f) => files[f].includes('"label":"11"'));
    });
    expect(backupPath).toBeTruthy();

    // lose the table, then restore the backup
    await page.getByRole("link", { name: "الكاشير" }).click();
    await page.getByTestId("tab-11").click();
    await page.getByRole("button", { name: "إلغاء طلب الطاولة" }).click();
    await page.getByRole("button", { name: "إلغاء الطلب" }).click();
    await expect(page.getByTestId("tab-11")).toHaveCount(0);

    await page.getByRole("link", { name: "الإعدادات" }).click();
    await page.evaluate((p) => {
      (globalThis as unknown as { __e2ePickFile: string }).__e2ePickFile = p!;
    }, backupPath);
    await page.getByRole("button", { name: "استعادة البيانات" }).click();
    await page.getByRole("button", { name: "استعادة", exact: true }).click();

    await page.waitForEvent("load"); // the app reloads itself after restoring
    await page.getByRole("link", { name: "الكاشير" }).click();
    await page.getByTestId("tab-11").click();
    await expect(page.getByTestId("cart")).toContainText(`${SPANISH} (Large)`);
  });
});

test("an existing shop database upgrades without losing anything", async ({
  page,
  context,
}) => {
  // the old sale is from 5 January: pretend it is a few days later
  await page.clock.install({ time: new Date("2026-01-10T09:00:00Z") });
  await plantLegacyDatabase(context);
  await loginAndOpenCashier(page);

  // old sale is intact and listed as a normal (no table) order
  await page.getByRole("link", { name: "الطلبات" }).click();
  // ...under its own day
  await expect(page.getByTestId("day-2026-01-05").getByTestId("order-1")).toContainText("#1");
  await page.getByRole("button", { name: "عرض" }).click();
  await expect(page.getByText("قهوة قديمة (Medium)")).toBeVisible();
  await expect(page.getByText("طاولة")).toHaveCount(0);

  // and tables work on top of it
  await page.getByRole("link", { name: "الكاشير" }).click();
  await openTable(page, "2");
  await addToCart(page, LATTE, "Small");
  await payActiveOrder(page);

  const sales = await dbRows(page, "SELECT id, table_label FROM sales ORDER BY id");
  expect(sales).toEqual([
    { id: 1, table_label: null },
    { id: 2, table_label: "2" },
  ]);
});
