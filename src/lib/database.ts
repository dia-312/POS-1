import Database from "@tauri-apps/plugin-sql";
import defaultProducts from "./defaultProducts.json";
import { hashSecret, verifySecret, isHashed } from "./crypto";

/* VITE_DB_NAME lets a test or verification run use a throwaway database
   instead of the shop's real one. */
const DB_NAME = import.meta.env.VITE_DB_NAME ?? "pos-final.db";

let db: any = null;

/* GET DATABASE (raw handle — used by initDB itself) */
async function getDB() {
  if (!db) {
    db = await Database.load(`sqlite:${DB_NAME}`);
  }
  return db;
}

/* GET DATABASE ONCE TABLES EXIST
   Every data function goes through this so a page that mounts before
   initDB() has finished (e.g. on a fresh database) waits instead of
   failing with "no such table". */
async function getReadyDB() {
  await initDB();
  return getDB();
}

/* INIT DATABASE
   Single-flight: React StrictMode (and any double call) must not run the
   create/seed/default-admin steps twice concurrently. */
let initPromise: Promise<void> | null = null;

export function initDB(): Promise<void> {
  if (!initPromise) {
    initPromise = runInitDB().catch((err) => {
      initPromise = null; // allow a retry after a failed init
      throw err;
    });
  }
  return initPromise;
}

async function runInitDB() {
  const database = await getDB();

  /* USERS */
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT
    )
  `);

  /* PRODUCTS */
  await database.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      stock INTEGER NOT NULL,
      category TEXT,
      sizes TEXT,
      price REAL DEFAULT 0
    )
  `);

  try {
    await database.execute(`ALTER TABLE products ADD COLUMN sizes TEXT`);
  } catch {}

  try {
    await database.execute(`ALTER TABLE products ADD COLUMN price REAL DEFAULT 0`);
  } catch {}

  /* SALES */
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  try {
    await database.execute(`ALTER TABLE sales ADD COLUMN subtotal REAL DEFAULT 0`);
  } catch {}

  try {
    await database.execute(`ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0`);
  } catch {}

  try {
    await database.execute(`ALTER TABLE sales ADD COLUMN table_label TEXT`);
  } catch {
    // column already exists
  }

  /* OPEN ORDERS (table tabs that are still being served, not yet paid) */
  await database.execute(`
    CREATE TABLE IF NOT EXISTS open_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      items TEXT NOT NULL DEFAULT '[]',
      discount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  /* SALE ITEMS */
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      name TEXT NOT NULL,
      size TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      note TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    )
  `);

  /* EXPENSES */
  await database.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  /* MIGRATE LEGACY PLAINTEXT CREDENTIALS */
  const allUsers: any = await database.select(
    `SELECT id, password, pin FROM users`
  );

  for (const u of allUsers) {
    const needsPasswordHash = u.password && !isHashed(u.password);
    const needsPinHash = u.pin && !isHashed(u.pin);

    if (needsPasswordHash || needsPinHash) {
      const newPassword = needsPasswordHash
        ? await hashSecret(u.password)
        : u.password;

      const newPin = needsPinHash ? await hashSecret(u.pin) : u.pin;

      await database.execute(
        `UPDATE users SET password = ?, pin = ? WHERE id = ?`,
        [newPassword, newPin, u.id]
      );
    }
  }

  /* DEFAULT ADMIN */
  const admins = await database.select(`
    SELECT * FROM users WHERE role = 'admin'
  `);

  if (admins.length === 0) {
    await database.execute(
      `INSERT INTO users (username, password, role, pin) VALUES (?, ?, ?, ?)`,
      ["admin", await hashSecret("1234"), "admin", await hashSecret("1111")]
    );
  }

  /* SEED PRODUCTS */
  try {
    const count: any = await database.select(
      `SELECT COUNT(*) as count FROM products`
    );

    if (count[0].count === 0) {
      for (const prod of defaultProducts) {
        const firstPrice =
          prod.sizes?.length > 0 ? Number(prod.sizes[0].price) : 0;

        await database.execute(
          `
          INSERT INTO products (name, price, stock, category, sizes)
          VALUES (?, ?, ?, ?, ?)
        `,
          [
            prod.name,
            firstPrice,
            prod.stock,
            prod.category,
            JSON.stringify(prod.sizes),
          ]
        );
      }
    }
  } catch (err) {
    console.error("Seed error:", err);
  }

  await migrateLegacyLocalOrders();
}

/* MIGRATE ORDER DETAILS PREVIOUSLY STORED ONLY IN localStorage */
async function migrateLegacyLocalOrders() {
  const database = await getDB();

  const ordersStorage = localStorage.getItem("orders-storage");
  if (!ordersStorage) return;

  let parsed: any;
  try {
    parsed = JSON.parse(ordersStorage);
  } catch {
    return;
  }

  const orders = parsed?.state?.orders || [];
  if (orders.length === 0) {
    localStorage.removeItem("orders-storage");
    return;
  }

  for (const order of orders) {
    const saleRow: any = await database.select(
      `SELECT id FROM sales WHERE id = ?`,
      [order.id]
    );

    if (saleRow.length === 0) continue;

    const existingItems: any = await database.select(
      `SELECT COUNT(*) as count FROM sale_items WHERE sale_id = ?`,
      [order.id]
    );

    if (existingItems[0]?.count > 0) continue;

    await database.execute(
      `UPDATE sales SET subtotal = ?, discount = ? WHERE id = ?`,
      [order.subtotal || 0, order.discount || 0, order.id]
    );

    for (const item of order.items || []) {
      await database.execute(
        `
        INSERT INTO sale_items (sale_id, product_id, name, size, price, quantity, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          order.id,
          item.id,
          item.name,
          item.selectedSize || null,
          item.price,
          item.quantity,
          item.note || null,
        ]
      );
    }
  }

  localStorage.removeItem("orders-storage");
}

/* LOGIN */
export async function loginUser(username: string, password: string) {
  const database = await getReadyDB();

  const result: any = await database.select(
    `
    SELECT * FROM users
    WHERE username = ?
  `,
    [username]
  );

  const user = result[0];
  if (!user) return null;

  const valid = await verifySecret(password, user.password);
  return valid ? user : null;
}

export async function loginWithPin(pin: string) {
  const database = await getReadyDB();

  const users: any = await database.select(`SELECT * FROM users`);

  for (const user of users) {
    if (await verifySecret(pin, user.pin)) {
      return user;
    }
  }

  return null;
}

/* PRODUCTS */
export async function getProducts() {
  const database = await getReadyDB();

  const products: any = await database.select(`
    SELECT * FROM products ORDER BY id DESC
  `);

  return products.map((p: any) => ({
    ...p,
    sizes: p.sizes ? JSON.parse(p.sizes) : [],
  }));
}

export async function addProduct(
  name: string,
  stock: number,
  category: string,
  sizes: any[]
) {
  const database = await getReadyDB();

  const firstPrice =
    sizes.length > 0 ? Number(sizes[0].price) : 0;

  await database.execute(
    `
    INSERT INTO products (name, price, stock, category, sizes)
    VALUES (?, ?, ?, ?, ?)
  `,
    [name, firstPrice, stock, category, JSON.stringify(sizes)]
  );
}

export async function updateProduct(
  id: number,
  name: string,
  stock: number,
  category: string,
  sizes: any[]
) {
  const database = await getReadyDB();

  const firstPrice =
    sizes.length > 0 ? Number(sizes[0].price) : 0;

  await database.execute(
    `
    UPDATE products
    SET name=?, price=?, stock=?, category=?, sizes=?
    WHERE id=?
  `,
    [name, firstPrice, stock, category, JSON.stringify(sizes), id]
  );
}

export async function deleteProduct(id: number) {
  const database = await getReadyDB();

  await database.execute(`DELETE FROM products WHERE id=?`, [id]);
}

/* STOCK */
export async function decreaseStock(id: number, quantity: number) {
  const database = await getReadyDB();

  await database.execute(
    `UPDATE products SET stock = stock - ? WHERE id=?`,
    [quantity, id]
  );
}

/* DATE */
function getTodayBounds() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = today.toISOString();

  const end = new Date(today);
  end.setDate(end.getDate() + 1);

  return {
    start,
    end: end.toISOString(),
  };
}

/* SALES */
type SaleItemInput = {
  id: number;
  name: string;
  selectedSize?: string;
  price: number;
  quantity: number;
  note?: string;
};

/* No BEGIN/COMMIT here on purpose. tauri-plugin-sql runs every execute()
   on whichever pooled connection is free, so a transaction spread over
   several calls breaks ("cannot start a transaction within a transaction",
   "database is locked", "no transaction is active") and leaves a connection
   stuck mid-transaction. Instead every step is ONE statement (all the items
   go in a single INSERT, so they are saved together or not at all), and a
   sale whose items could not be saved is deleted again. */
export async function createSale(
  items: SaleItemInput[],
  subtotal: number,
  discount: number,
  total: number,
  tableLabel?: string,
  openOrderId?: number
) {
  const database = await getReadyDB();
  const createdAt = new Date().toISOString();

  const result: any = await database.execute(
    `
      INSERT INTO sales (total, subtotal, discount, created_at, table_label)
      VALUES (?, ?, ?, ?, ?)
    `,
    [total, subtotal, discount, createdAt, tableLabel || null]
  );

  const saleId = result.lastInsertId;

  if (items.length > 0) {
    try {
      await database.execute(
        `
          INSERT INTO sale_items (sale_id, product_id, name, size, price, quantity, note)
          VALUES ${items.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ")}
        `,
        items.flatMap((item) => [
          saleId,
          item.id,
          item.name,
          item.selectedSize || null,
          item.price,
          item.quantity,
          item.note || null,
        ])
      );
    } catch (err) {
      // never leave a sale without its items behind
      await database
        .execute(`DELETE FROM sales WHERE id = ?`, [saleId])
        .catch((cleanupErr: unknown) =>
          console.error("COULD NOT REMOVE INCOMPLETE SALE:", cleanupErr)
        );
      throw err;
    }
  }

  // The sale is complete from here on. Closing the table's open order is
  // retried, and if it still fails the caller is told instead of throwing —
  // throwing would make the cashier sell the same order again.
  let tableClosed = true;

  if (openOrderId !== undefined) {
    tableClosed = false;

    for (let attempt = 0; attempt < 3 && !tableClosed; attempt++) {
      try {
        await database.execute(`DELETE FROM open_orders WHERE id = ?`, [
          openOrderId,
        ]);
        tableClosed = true;
      } catch (err) {
        console.error("COULD NOT CLOSE TABLE ORDER:", err);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  return { id: saleId, createdAt, tableClosed };
}

/* OPEN ORDERS (one per table, edited until the bill is paid) */
export async function getOpenOrders() {
  const database = await getReadyDB();

  const rows = (await database.select(
    `SELECT * FROM open_orders ORDER BY id ASC`
  )) as {
    id: number;
    label: string;
    items: string;
    discount: number | null;
  }[];

  return rows.map((row) => {
    let items: SaleItemInput[] = [];
    try {
      items = JSON.parse(row.items);
    } catch {
      // unreadable items: show the table empty rather than failing the page
    }

    return {
      id: row.id,
      label: row.label,
      items,
      discount: row.discount || 0,
    };
  });
}

export async function createOpenOrder(label: string) {
  const database = await getReadyDB();
  const now = new Date().toISOString();

  const result = (await database.execute(
    `
      INSERT INTO open_orders (label, items, discount, created_at, updated_at)
      VALUES (?, '[]', 0, ?, ?)
    `,
    [label, now, now]
  )) as { lastInsertId: number };

  return result.lastInsertId;
}

export async function saveOpenOrder(
  id: number,
  items: SaleItemInput[],
  discount: number
) {
  const database = await getReadyDB();

  await database.execute(
    `UPDATE open_orders SET items = ?, discount = ?, updated_at = ? WHERE id = ?`,
    [JSON.stringify(items), discount, new Date().toISOString(), id]
  );
}

export async function deleteOpenOrder(id: number) {
  const database = await getReadyDB();

  await database.execute(`DELETE FROM open_orders WHERE id = ?`, [id]);
}

/* ORDERS (sales + their line items)
   `sinceIso` limits the list to orders created at or after that instant, so
   the page does not load years of history at once. */
export async function getOrders(sinceIso?: string) {
  const database = await getReadyDB();

  const where = sinceIso ? `WHERE created_at >= ?` : "";
  const params = sinceIso ? [sinceIso] : [];

  const sales: any = await database.select(
    `SELECT * FROM sales ${where} ORDER BY id DESC`,
    params
  );

  const items: any = await database.select(
    `SELECT * FROM sale_items${
      sinceIso
        ? " WHERE sale_id IN (SELECT id FROM sales WHERE created_at >= ?)"
        : ""
    }`,
    params
  );

  // group the lines by sale once instead of scanning them for every sale
  const itemsBySale = new Map<number, any[]>();
  for (const item of items) {
    const list = itemsBySale.get(item.sale_id);
    if (list) list.push(item);
    else itemsBySale.set(item.sale_id, [item]);
  }

  return sales.map((sale: any) => ({
    id: sale.id,
    createdAt: sale.created_at,
    subtotal: sale.subtotal || 0,
    discount: sale.discount || 0,
    total: sale.total,
    tableLabel: sale.table_label || undefined,
    items: (itemsBySale.get(sale.id) ?? []).map((item: any) => ({
      id: item.product_id,
      name: item.name,
      selectedSize: item.size || undefined,
      price: item.price,
      quantity: item.quantity,
      note: item.note || undefined,
    })),
  }));
}

export async function hasOrdersBefore(beforeIso: string) {
  const database = await getReadyDB();

  const rows = (await database.select(
    `SELECT 1 FROM sales WHERE created_at < ? LIMIT 1`,
    [beforeIso]
  )) as unknown[];

  return rows.length > 0;
}

/* 🔥 FIX MISSING: SALES CHART */
export async function getSalesChart() {
  const database = await getReadyDB();

  return await database.select(`
    SELECT DATE(created_at, 'localtime') as date, SUM(total) as total
    FROM sales
    GROUP BY DATE(created_at, 'localtime')
    ORDER BY DATE(created_at, 'localtime')
  `);
}

/* DASHBOARD — the current calendar month (starts over on the 1st), with
   today's figures alongside. Bounds are local midnights turned into the same
   ISO strings the rows are stored with. Days are bucketed in JS rather than
   with SQLite's localtime so every engine agrees on where a day starts. */
function getMonthBounds(now: Date) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

const localDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export async function getDashboardOverview(now: Date = new Date()) {
  const database = await getReadyDB();
  const month = getMonthBounds(now);
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  const sales = (await database.select(
    `SELECT total, created_at FROM sales WHERE created_at >= ? AND created_at < ?`,
    [month.start, month.end]
  )) as { total: number; created_at: string }[];

  const expenses = (await database.select(
    `SELECT amount, created_at FROM expenses WHERE created_at >= ? AND created_at < ?`,
    [month.start, month.end]
  )) as { amount: number; created_at: string }[];

  const products = (await database.select(
    `SELECT COUNT(*) as products FROM products`
  )) as { products: number }[];

  const figures = () => ({ revenue: 0, orders: 0, expenses: 0 });
  const monthly = figures();
  const today = figures();
  const byDay = new Map<string, number>();

  for (const sale of sales) {
    monthly.revenue += sale.total;
    monthly.orders += 1;

    if (sale.created_at >= todayStart) {
      today.revenue += sale.total;
      today.orders += 1;
    }

    const key = localDayKey(new Date(sale.created_at));
    byDay.set(key, (byDay.get(key) ?? 0) + sale.total);
  }

  for (const expense of expenses) {
    monthly.expenses += expense.amount;
    if (expense.created_at >= todayStart) today.expenses += expense.amount;
  }

  // one point per day from the 1st to today, zeros included
  const chart: { day: number; date: string; total: number }[] = [];
  for (let day = 1; day <= now.getDate(); day++) {
    const key = localDayKey(new Date(now.getFullYear(), now.getMonth(), day));
    chart.push({ day, date: key, total: byDay.get(key) ?? 0 });
  }

  return {
    month: monthly,
    today,
    products: products[0]?.products || 0,
    chart,
  };
}

/* DASHBOARD */
export async function getDashboardStats() {
  const database = await getReadyDB();
  const { start, end } = getTodayBounds();

  const sales: any = await database.select(
    `
    SELECT SUM(total) as revenue, COUNT(*) as orders
    FROM sales
    WHERE created_at >= ? AND created_at < ?
  `,
    [start, end]
  );

  const products: any = await database.select(`
    SELECT COUNT(*) as products FROM products
  `);

  return {
    revenue: sales[0]?.revenue || 0,
    orders: sales[0]?.orders || 0,
    products: products[0]?.products || 0,
  };
}

export async function getLowStockProducts() {
  const database = await getReadyDB();

  return await database.select(`
    SELECT * FROM products
    WHERE stock <= 5
    ORDER BY stock ASC
  `);
}

/* MONTHLY REPORTS */
export async function getMonthlyReports() {
  const database = await getReadyDB();

  const sales: any = await database.select(`
    SELECT strftime('%Y-%m', created_at, 'localtime') as month,
           SUM(total) as revenue,
           COUNT(*) as orders
    FROM sales
    GROUP BY month
    ORDER BY month DESC
  `);

  const expenses: any = await database.select(`
    SELECT strftime('%Y-%m', created_at, 'localtime') as month,
           SUM(amount) as expenses
    FROM expenses
    GROUP BY month
  `);

  const map: any = {};

  sales.forEach((s: any) => {
    map[s.month] = {
      month: s.month,
      revenue: s.revenue || 0,
      orders: s.orders || 0,
      expenses: 0,
      profit: s.revenue || 0,
    };
  });

  expenses.forEach((e: any) => {
    if (!map[e.month]) {
      map[e.month] = {
        month: e.month,
        revenue: 0,
        orders: 0,
        expenses: e.expenses || 0,
        profit: -(e.expenses || 0),
      };
    } else {
      map[e.month].expenses = e.expenses || 0;
      map[e.month].profit =
        map[e.month].revenue - e.expenses;
    }
  });

  return Object.values(map);
}

/* TOTAL PROFIT */
export async function getTotalProfit() {
  const database = await getReadyDB();
  const { start, end } = getTodayBounds();

  const result: any = await database.select(
    `
    SELECT SUM(total) as profit
    FROM sales
    WHERE created_at >= ? AND created_at < ?
  `,
    [start, end]
  );

  return result[0]?.profit || 0;
}

/* USERS */
export async function getUsers() {
  const database = await getReadyDB();

  return await database.select(`
    SELECT * FROM users ORDER BY id DESC
  `);
}

export async function addUser(
  username: string,
  password: string,
  role: string,
  pin: string
) {
  const database = await getReadyDB();

  const hashedPassword = await hashSecret(password);
  const hashedPin = await hashSecret(pin);

  await database.execute(
    `
    INSERT INTO users (username, password, role, pin)
    VALUES (?, ?, ?, ?)
  `,
    [username, hashedPassword, role, hashedPin]
  );
}

export async function updateUser(
  id: number,
  username: string,
  role: string,
  password?: string,
  pin?: string
) {
  const database = await getReadyDB();

  await database.execute(
    `UPDATE users SET username = ?, role = ? WHERE id = ?`,
    [username, role, id]
  );

  if (password) {
    const hashedPassword = await hashSecret(password);
    await database.execute(`UPDATE users SET password = ? WHERE id = ?`, [
      hashedPassword,
      id,
    ]);
  }

  if (pin) {
    const hashedPin = await hashSecret(pin);
    await database.execute(`UPDATE users SET pin = ? WHERE id = ?`, [
      hashedPin,
      id,
    ]);
  }
}

export async function deleteUser(id: number) {
  const database = await getReadyDB();

  await database.execute(`DELETE FROM users WHERE id=?`, [id]);
}

/* EXPENSES */
export async function addExpense(title: string, amount: number) {
  const database = await getReadyDB();

  await database.execute(
    `
    INSERT INTO expenses (title, amount, created_at)
    VALUES (?, ?, ?)
  `,
    [title, amount, new Date().toISOString()]
  );
}

export async function getExpenses() {
  const database = await getReadyDB();

  return await database.select(`
    SELECT * FROM expenses
    ORDER BY id DESC
  `);
}

export async function deleteExpense(id: number) {
  const database = await getReadyDB();

  await database.execute(`DELETE FROM expenses WHERE id=?`, [id]);
}

export async function getTotalExpenses() {
  const database = await getReadyDB();
  const { start, end } = getTodayBounds();

  const result: any = await database.select(
    `
    SELECT SUM(amount) as total
    FROM expenses
    WHERE created_at >= ? AND created_at < ?
  `,
    [start, end]
  );

  return result[0]?.total || 0;
}

/* DELETE SALE */
export async function deleteSale(id: number) {
  const database = await getReadyDB();

  await database.execute(`DELETE FROM sale_items WHERE sale_id=?`, [id]);
  await database.execute(`DELETE FROM sales WHERE id=?`, [id]);
}

/* EXPORT / IMPORT BACKUP */
export async function exportDatabase() {
  const database = await getReadyDB();

  const users = await database.select(`SELECT * FROM users`);
  const products = await database.select(`SELECT * FROM products`);
  const sales = await database.select(`SELECT * FROM sales`);
  const saleItems = await database.select(`SELECT * FROM sale_items`);
  const expenses = await database.select(`SELECT * FROM expenses`);
  const openOrders = await database.select(`SELECT * FROM open_orders`);

  return JSON.stringify({
    users,
    products,
    sales,
    saleItems,
    expenses,
    openOrders,
  });
}

export async function importDatabase(jsonString: string) {
  const database = await getReadyDB();
  const data = JSON.parse(jsonString);

  if (!data.users || !data.products || !data.sales || !data.expenses) {
    throw new Error("Invalid backup file format");
  }

  // Clear existing data
  await database.execute(`DELETE FROM sale_items`);
  await database.execute(`DELETE FROM users`);
  await database.execute(`DELETE FROM products`);
  await database.execute(`DELETE FROM sales`);
  await database.execute(`DELETE FROM expenses`);
  await database.execute(`DELETE FROM open_orders`);

  // Insert users
  for (const u of data.users) {
    await database.execute(
      `INSERT INTO users (id, username, password, role, pin) VALUES (?, ?, ?, ?, ?)`,
      [u.id, u.username, u.password, u.role, u.pin]
    );
  }

  // Insert products
  for (const p of data.products) {
    await database.execute(
      `INSERT INTO products (id, name, stock, category, sizes, price) VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.stock, p.category, p.sizes, p.price]
    );
  }

  // Insert sales
  for (const s of data.sales) {
    await database.execute(
      `INSERT INTO sales (id, total, subtotal, discount, created_at, table_label) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.total,
        s.subtotal || 0,
        s.discount || 0,
        s.created_at,
        s.table_label || null,
      ]
    );
  }

  // Insert open table orders (absent from backups made before this feature)
  if (Array.isArray(data.openOrders)) {
    for (const o of data.openOrders) {
      await database.execute(
        `INSERT INTO open_orders (id, label, items, discount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [o.id, o.label, o.items, o.discount || 0, o.created_at, o.updated_at]
      );
    }
  }

  // Insert sale items (backups created after order-details migration)
  if (Array.isArray(data.saleItems)) {
    for (const item of data.saleItems) {
      await database.execute(
        `
        INSERT INTO sale_items (id, sale_id, product_id, name, size, price, quantity, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          item.id,
          item.sale_id,
          item.product_id,
          item.name,
          item.size,
          item.price,
          item.quantity,
          item.note,
        ]
      );
    }
  }

  // Insert expenses
  for (const e of data.expenses) {
    await database.execute(
      `INSERT INTO expenses (id, title, amount, created_at) VALUES (?, ?, ?, ?)`,
      [e.id, e.title, e.amount, e.created_at]
    );
  }

  // Legacy backups stored order line items in localStorage instead of the
  // database — restore that blob so the startup migration can pick it up.
  if (data.ordersState) {
    localStorage.setItem("orders-storage", JSON.stringify(data.ordersState));
  }
}