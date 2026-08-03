import Database from "@tauri-apps/plugin-sql";
import defaultProducts from "./defaultProducts.json";
import { hashSecret, verifySecret, isHashed } from "./crypto";

let db: any = null;

/* GET DATABASE */
async function getDB() {
  if (!db) {
    db = await Database.load("sqlite:pos-final.db");
  }
  return db;
}

/* INIT DATABASE */
export async function initDB() {
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
  const database = await getDB();

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
  const database = await getDB();

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
  const database = await getDB();

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
  const database = await getDB();

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
  const database = await getDB();

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
  const database = await getDB();

  await database.execute(`DELETE FROM products WHERE id=?`, [id]);
}

/* STOCK */
export async function decreaseStock(id: number, quantity: number) {
  const database = await getDB();

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

export async function createSale(
  items: SaleItemInput[],
  subtotal: number,
  discount: number,
  total: number
) {
  const database = await getDB();
  const createdAt = new Date().toISOString();

  await database.execute("BEGIN TRANSACTION");

  try {
    const result: any = await database.execute(
      `
        INSERT INTO sales (total, subtotal, discount, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [total, subtotal, discount, createdAt]
    );

    const saleId = result.lastInsertId;

    for (const item of items) {
      await database.execute(
        `
          INSERT INTO sale_items (sale_id, product_id, name, size, price, quantity, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          saleId,
          item.id,
          item.name,
          item.selectedSize || null,
          item.price,
          item.quantity,
          item.note || null,
        ]
      );
    }

    await database.execute("COMMIT");

    return { id: saleId, createdAt };
  } catch (err) {
    await database.execute("ROLLBACK");
    throw err;
  }
}

/* ORDERS (sales + their line items) */
export async function getOrders() {
  const database = await getDB();

  const sales: any = await database.select(
    `SELECT * FROM sales ORDER BY id DESC`
  );

  const items: any = await database.select(`SELECT * FROM sale_items`);

  return sales.map((sale: any) => ({
    id: sale.id,
    createdAt: sale.created_at,
    subtotal: sale.subtotal || 0,
    discount: sale.discount || 0,
    total: sale.total,
    items: items
      .filter((item: any) => item.sale_id === sale.id)
      .map((item: any) => ({
        id: item.product_id,
        name: item.name,
        selectedSize: item.size || undefined,
        price: item.price,
        quantity: item.quantity,
        note: item.note || undefined,
      })),
  }));
}

/* 🔥 FIX MISSING: SALES CHART */
export async function getSalesChart() {
  const database = await getDB();

  return await database.select(`
    SELECT DATE(created_at, 'localtime') as date, SUM(total) as total
    FROM sales
    GROUP BY DATE(created_at, 'localtime')
    ORDER BY DATE(created_at, 'localtime')
  `);
}

/* DASHBOARD */
export async function getDashboardStats() {
  const database = await getDB();
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
  const database = await getDB();

  return await database.select(`
    SELECT * FROM products
    WHERE stock <= 5
    ORDER BY stock ASC
  `);
}

/* MONTHLY REPORTS */
export async function getMonthlyReports() {
  const database = await getDB();

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
  const database = await getDB();
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
  const database = await getDB();

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
  const database = await getDB();

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
  const database = await getDB();

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
  const database = await getDB();

  await database.execute(`DELETE FROM users WHERE id=?`, [id]);
}

/* EXPENSES */
export async function addExpense(title: string, amount: number) {
  const database = await getDB();

  await database.execute(
    `
    INSERT INTO expenses (title, amount, created_at)
    VALUES (?, ?, ?)
  `,
    [title, amount, new Date().toISOString()]
  );
}

export async function getExpenses() {
  const database = await getDB();

  return await database.select(`
    SELECT * FROM expenses
    ORDER BY id DESC
  `);
}

export async function deleteExpense(id: number) {
  const database = await getDB();

  await database.execute(`DELETE FROM expenses WHERE id=?`, [id]);
}

export async function getTotalExpenses() {
  const database = await getDB();
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
  const database = await getDB();

  await database.execute(`DELETE FROM sale_items WHERE sale_id=?`, [id]);
  await database.execute(`DELETE FROM sales WHERE id=?`, [id]);
}

/* EXPORT / IMPORT BACKUP */
export async function exportDatabase() {
  const database = await getDB();

  const users = await database.select(`SELECT * FROM users`);
  const products = await database.select(`SELECT * FROM products`);
  const sales = await database.select(`SELECT * FROM sales`);
  const saleItems = await database.select(`SELECT * FROM sale_items`);
  const expenses = await database.select(`SELECT * FROM expenses`);

  return JSON.stringify({ users, products, sales, saleItems, expenses });
}

export async function importDatabase(jsonString: string) {
  const database = await getDB();
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
      `INSERT INTO sales (id, total, subtotal, discount, created_at) VALUES (?, ?, ?, ?, ?)`,
      [s.id, s.total, s.subtotal || 0, s.discount || 0, s.created_at]
    );
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