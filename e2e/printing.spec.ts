import { test, expect } from "@playwright/test";
import {
  addToCart,
  dbRows,
  loginAndOpenCashier,
  openTable,
  printLog,
  stubPrinting,
} from "./helpers";

const LATTE = "ايس لاتيه";

test.describe("printing at checkout", () => {
  test("a print dialog that freezes the page cannot leave a stale payment window or double-sell", async ({
    page,
  }) => {
    await stubPrinting(page, "freeze");
    await loginAndOpenCashier(page);

    await openTable(page, "3");
    await addToCart(page, LATTE, "Medium");

    await page.getByTestId("cart").getByRole("button", { name: /^دفع/ }).click();
    // an impatient triple click on "confirm"
    await page.getByRole("button", { name: "تأكيد", exact: true }).click({ clickCount: 3 });

    // printing happened once, and by then the order was already finished on screen
    await expect.poll(async () => (await printLog(page)).length).toBe(1);
    const [atPrint] = await printLog(page);
    expect(atPrint.modalOpen).toBe(false);
    // the shop logo is on the page and fully loaded by the time it prints
    expect(atPrint.logoLoaded).toBe(true);
    await expect(page.getByTestId("tab-3")).toHaveCount(0);

    // exactly one sale, not three
    await page.waitForTimeout(2200); // let the 1.5 s "dialog" finish
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(1);
    expect(await printLog(page)).toHaveLength(1);

    // the hidden print frame is removed once printing is over
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  test("clicks queued while the dialog is open do not sell the order again", async ({
    page,
  }) => {
    await stubPrinting(page, "freeze");
    await loginAndOpenCashier(page);
    await addToCart(page, LATTE, "Small"); // quick order

    await page.getByTestId("cart").getByRole("button", { name: /^دفع/ }).click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();

    // hammer the pay buttons while the page is frozen by the dialog
    await expect.poll(async () => (await printLog(page)).length).toBe(1);
    for (let i = 0; i < 3; i++) {
      await page
        .getByTestId("cart")
        .getByRole("button", { name: /^دفع/ })
        .click({ force: true, timeout: 5000 })
        .catch(() => {});
    }
    await page.waitForTimeout(2200);

    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(1);
  });

  test("if printing fails the order is still saved, the screen is clean, and the cashier is told", async ({
    page,
  }) => {
    await stubPrinting(page, "throw");
    await loginAndOpenCashier(page);
    await addToCart(page, LATTE, "Small");

    await page.getByTestId("cart").getByRole("button", { name: /^دفع/ }).click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();

    await expect(page.getByText("تعذرت الطباعة")).toBeVisible();
    expect(await dbRows(page, "SELECT id FROM sales")).toHaveLength(1);
    await expect(page.getByText("تأكيد الدفع")).toHaveCount(0);
    await expect(page.getByTestId("tab-quick")).not.toContainText("₪");
    await expect(page.locator("iframe")).toHaveCount(0); // no frame left behind

    // and the next customer can be served right away
    await addToCart(page, LATTE, "Large");
    await expect(page.getByTestId("cart").getByRole("button", { name: /^دفع/ })).toBeEnabled();
  });

  test("an order can be reprinted from the Orders page", async ({ page }) => {
    await stubPrinting(page, "throw");
    await loginAndOpenCashier(page);
    await addToCart(page, LATTE, "Small");
    await page.getByTestId("cart").getByRole("button", { name: /^دفع/ }).click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await expect(page.getByText("تعذرت الطباعة")).toBeVisible();

    await page.getByRole("link", { name: "الطلبات" }).click();
    await page.getByRole("button", { name: "عرض" }).click();
    await page.getByRole("button", { name: "طباعة الفاتورة" }).click();

    await expect.poll(async () => (await printLog(page)).length).toBe(2);
  });
});
