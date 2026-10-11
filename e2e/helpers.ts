import { expect, type BrowserContext, type Page } from "@playwright/test";
import initSqlJs from "sql.js";

type Row = Record<string, unknown>;

/* Run a SELECT against the app's real (WASM) SQLite database. */
export async function dbRows(
  page: Page,
  sql: string,
  params: unknown[] = []
): Promise<Row[]> {
  return page.evaluate(
    ([query, args]) =>
      (
        globalThis as unknown as {
          __e2eSelect: (q: string, a: unknown[]) => Promise<Row[]>;
        }
      ).__e2eSelect(query as string, args as unknown[]),
    [sql, params] as const
  );
}

/* Log in as the default admin and land on the cashier page. */
export async function loginAndOpenCashier(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("اسم المستخدم").fill("admin");
  await page.getByPlaceholder("كلمة المرور").fill("1234");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await page.getByRole("link", { name: "الكاشير" }).click();
  await expect(page.getByTestId("products")).toBeVisible();
}

/* Add one unit of a product (by exact name and size) to the active order. */
export async function addToCart(page: Page, product: string, size: string) {
  const card = page
    .getByTestId("products")
    .locator("> div")
    .filter({ has: page.getByRole("heading", { name: product, exact: true }) });

  await card.getByRole("button", { name: new RegExp(`^${size}`) }).click();
}

export async function openTable(page: Page, label: string) {
  await page.getByRole("button", { name: "+ طاولة جديدة" }).click();
  await page.getByPlaceholder("رقم أو اسم الطاولة").fill(label);
  await page.getByRole("button", { name: "فتح", exact: true }).click();
  await expect(page.getByTestId(`tab-${label}`)).toBeVisible();
}

export async function payActiveOrder(page: Page) {
  await page
    .getByTestId("cart")
    .getByRole("button", { name: /^دفع/ })
    .click();
  await page.getByRole("button", { name: "تأكيد", exact: true }).click();
}

/* Build a database file as the PREVIOUS app version created it (no
   table_label column, no open_orders table) and plant it so the app
   starts on it — i.e. what a real shop's existing data looks like. */
export async function plantLegacyDatabase(context: BrowserContext) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, pin TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, stock INTEGER NOT NULL, category TEXT, sizes TEXT, price REAL DEFAULT 0);
    CREATE TABLE sales (id INTEGER PRIMARY KEY AUTOINCREMENT, total REAL NOT NULL, created_at TEXT NOT NULL, subtotal REAL DEFAULT 0, discount REAL DEFAULT 0);
    CREATE TABLE sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, product_id INTEGER, name TEXT NOT NULL, size TEXT, price REAL NOT NULL, quantity INTEGER NOT NULL, note TEXT, FOREIGN KEY (sale_id) REFERENCES sales(id));
    CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, amount REAL NOT NULL, created_at TEXT NOT NULL);
    INSERT INTO sales (id, total, subtotal, discount, created_at) VALUES (1, 18, 20, 10, '2026-01-05T10:00:00.000Z');
    INSERT INTO sale_items (sale_id, product_id, name, size, price, quantity, note) VALUES (1, 1, 'قهوة قديمة', 'Medium', 10, 2, NULL);
  `);

  const bytes = db.export();
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary);

  // addInitScript re-runs on every load, so only plant it once.
  await context.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    ["e2e-sqlite:sqlite:pos-final.db", encoded] as const
  );
}

/* Make window.print() behave like the desktop app's WebView2 does: it does
   not return while the print dialog is open (here: 1.5 s, during which the
   whole page is frozen), then `afterprint` fires. Every call records what
   the screen looked like at that moment in window.__printLog.
   mode "throw" makes print() fail instead. */
export async function stubPrinting(
  page: Page,
  mode: "freeze" | "throw" = "freeze"
) {
  await page.addInitScript((printMode) => {
    const w = globalThis as unknown as {
      __printLog: { modalOpen: boolean; cartText: string; frames: number; logoLoaded: boolean }[];
    };
    w.__printLog = [];

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "contentWindow"
    )!;
    const patched = new WeakSet<object>();

    Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
      get() {
        const win = descriptor.get!.call(this) as Window | null;

        if (win && !patched.has(win)) {
          patched.add(win);
          win.print = () => {
            w.__printLog.push({
              modalOpen: document.body.innerText.includes("تأكيد الدفع"),
              cartText:
                document.querySelector('[data-testid="cart"]')?.textContent ?? "",
              frames: document.querySelectorAll("iframe").length,
              logoLoaded: Array.from(win.document.images).some(
                (image) => image.complete && image.naturalWidth > 0
              ),
            });

            if (printMode === "throw") throw new Error("no printer");

            const end = Date.now() + 1500;
            while (Date.now() < end) {
              /* the page is frozen while the dialog is open */
            }
            win.dispatchEvent(new Event("afterprint"));
          };
        }

        return win;
      },
    });
  }, mode);
}

export async function printLog(page: Page) {
  return page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __printLog: { modalOpen: boolean; cartText: string; frames: number; logoLoaded: boolean }[];
        }
      ).__printLog
  );
}
