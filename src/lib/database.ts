import Database from "@tauri-apps/plugin-sql";
import defaultProducts from "./defaultProducts.json";

let db: any = null;

/* GET DATABASE */

async function getDB() {
  if (!db) {
    db = await Database.load(
      "sqlite:pos-final.db"
    );
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
    sizes TEXT
  )
`);

try {
  await database.execute(`
    ALTER TABLE products
    ADD COLUMN sizes TEXT
  `);
} catch {}

try {
  await database.execute(`
    ALTER TABLE products
    ADD COLUMN price REAL DEFAULT 0
  `);
} catch {}

  /* SALES */

  await database.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      created_at TEXT NOT NULL
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

  /* CREATE DEFAULT ADMIN */

  const admins = await database.select(`
    SELECT *
    FROM users
    WHERE role = 'admin'
  `);

  if (admins.length === 0) {
    await database.execute(
      `
        INSERT INTO users (
          username,
          password,
          role,
          pin
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        "admin",
        "1234",
        "admin",
        "1111",
      ]
    );
  }

  /* SEED DEFAULT PRODUCTS */
  try {
    const productsCount: any = await database.select(`
      SELECT COUNT(*) as count FROM products
    `);

    if (productsCount[0].count === 0) {
      for (const prod of defaultProducts) {
        // We use raw SQL to avoid depending on addProduct being initialized,
        // or we can just call addProduct since it's hoisted/exported.
        const firstPrice = prod.sizes.length > 0 ? Number(prod.sizes[0].price) : 0;
        await database.execute(
          `
            INSERT INTO products (
              name,
              price,
              stock,
              category,
              sizes
            )
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
  } catch (error) {
    console.error("Failed to seed products:", error);
  }
}

/* LOGIN */

export async function loginUser(
  username: string,
  password: string
) {
  const database = await getDB();

  const result =
    await database.select(
      `
        SELECT *
        FROM users
        WHERE username = ?
        AND password = ?
      `,
      [username, password]
    );

  return result[0] || null;
}

export async function loginWithPin(
  pin: string
) {
  const database = await getDB();

  const result =
    await database.select(
      `
        SELECT *
        FROM users
        WHERE pin = ?
      `,
      [pin]
    );

  return result[0] || null;
}

/* PRODUCTS */

export async function getProducts() {
  const database = await getDB();

  const products =
    await database.select(`
      SELECT *
      FROM products
      ORDER BY id DESC
    `);

  return products.map((product: any) => ({
    ...product,
    sizes: product.sizes
      ? JSON.parse(product.sizes)
      : [],
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
    sizes.length > 0
      ? Number(sizes[0].price)
      : 0;

  await database.execute(
    `
      INSERT INTO products (
        name,
        price,
        stock,
        category,
        sizes
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      name,
      firstPrice,
      stock,
      category,
      JSON.stringify(sizes),
    ]
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

  // احسب اول سعر من الاحجام
  const firstPrice =
    sizes.length > 0
      ? Number(sizes[0].price)
      : 0;

  await database.execute(
    `
      UPDATE products
      SET
        name = ?,
        price = ?,
        stock = ?,
        category = ?,
        sizes = ?
      WHERE id = ?
    `,
    [
      name,
      firstPrice,
      stock,
      category,
      JSON.stringify(sizes),
      id,
    ]
  );
}

export async function deleteProduct(
  id: number
) {
  const database = await getDB();

  await database.execute(
    `
      DELETE FROM products
      WHERE id = ?
    `,
    [id]
  );
}

/* STOCK */

export async function decreaseStock(
  id: number,
  quantity: number
) {
  const database = await getDB();

  await database.execute(
    `
      UPDATE products
      SET stock = stock - ?
      WHERE id = ?
    `,
    [quantity, id]
  );
}

/* DATE HELPER */
function getTodayBounds() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.toISOString();
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const end = tomorrow.toISOString();
  
  return { start, end };
}

/* SALES */

export async function createSale(
  total: number
) {
  const database = await getDB();

  await database.execute(
    `
      INSERT INTO sales (
        total,
        created_at
      )
      VALUES (?, ?)
    `,
    [total, new Date().toISOString()]
  );
}

export async function getTodaySales() {
  const database = await getDB();
  const { start, end } = getTodayBounds();

  return await database.select(`
    SELECT *
    FROM sales
    WHERE created_at >= ? AND created_at < ?
    ORDER BY id DESC
  `, [start, end]);
}

/* DASHBOARD */

export async function getDashboardStats() {
  const database = await getDB();
  const { start, end } = getTodayBounds();

  const sales: any =
    await database.select(`
      SELECT
        SUM(total) as revenue,
        COUNT(*) as orders
      FROM sales
      WHERE created_at >= ? AND created_at < ?
    `, [start, end]);

  const products =
    await database.select(`
      SELECT COUNT(*) as products
      FROM products
    `);

  return {
    revenue: sales[0]?.revenue || 0,
    orders: sales[0]?.orders || 0,
    products:
      products[0]?.products || 0,
  };
}

export async function getSalesChart() {
  const database = await getDB();

  return await database.select(`
    SELECT
      DATE(created_at) as date,
      SUM(total) as total
    FROM sales
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `);
}

export async function getMonthlyReports() {
  const database = await getDB();

  const sales = await database.select(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      SUM(total) as revenue,
      COUNT(*) as orders
    FROM sales
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
  `);

  const expenses = await database.select(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      SUM(amount) as expenses
    FROM expenses
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
  `);

  const reportMap: Record<string, any> = {};

  sales.forEach((s: any) => {
    reportMap[s.month] = {
      month: s.month,
      revenue: s.revenue || 0,
      orders: s.orders || 0,
      expenses: 0,
      profit: s.revenue || 0
    };
  });

  expenses.forEach((e: any) => {
    if (!reportMap[e.month]) {
      reportMap[e.month] = {
        month: e.month,
        revenue: 0,
        orders: 0,
        expenses: e.expenses || 0,
        profit: -(e.expenses || 0)
      };
    } else {
      reportMap[e.month].expenses = e.expenses || 0;
      reportMap[e.month].profit = reportMap[e.month].revenue - (e.expenses || 0);
    }
  });

  return Object.values(reportMap).sort((a: any, b: any) => b.month.localeCompare(a.month));
}

export async function getLowStockProducts() {
  const database = await getDB();

  return await database.select(`
    SELECT *
    FROM products
    WHERE stock <= 5
    ORDER BY stock ASC
  `);
}

export async function getTotalProfit() {
  const database = await getDB();
  const { start, end } = getTodayBounds();

  const result: any =
    await database.select(`
      SELECT SUM(total) as profit
      FROM sales
      WHERE created_at >= ? AND created_at < ?
    `, [start, end]);

  return result[0]?.profit || 0;
}

/* USERS */

export async function getUsers() {
  const database = await getDB();

  return await database.select(`
    SELECT *
    FROM users
    ORDER BY id DESC
  `);
}

export async function addUser(
  username: string,
  password: string,
  role: string,
  pin: string
) {
  const database = await getDB();

  await database.execute(
    `
      INSERT INTO users (
        username,
        password,
        role,
        pin
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      username,
      password,
      role,
      pin,
    ]
  );
}

export async function deleteUser(
  id: number
) {
  const database = await getDB();

  const user =
    await database.select(
      `
        SELECT *
        FROM users
        WHERE id = ?
      `,
      [id]
    );

  if (user[0]?.role === "admin") {
    const admins =
      await database.select(`
        SELECT *
        FROM users
        WHERE role = 'admin'
      `);

    if (admins.length <= 1) {
      throw new Error(
        "Cannot delete last admin"
      );
    }
  }

  await database.execute(
    `
      DELETE FROM users
      WHERE id = ?
    `,
    [id]
  );
}

/* EXPENSES */

export async function addExpense(
  title: string,
  amount: number
) {
  const database = await getDB();

  await database.execute(
    `
      INSERT INTO expenses (
        title,
        amount,
        created_at
      )
      VALUES (?, ?, ?)
    `,
    [
      title,
      amount,
      new Date().toISOString(),
    ]
  );
}

export async function getExpenses() {
  const database = await getDB();
  const { start, end } = getTodayBounds();

  return await database.select(`
    SELECT *
    FROM expenses
    WHERE created_at >= ? AND created_at < ?
    ORDER BY id DESC
  `, [start, end]);
}

export async function getTotalExpenses() {
  const database = await getDB();
  const { start, end } = getTodayBounds();

  const result: any =
    await database.select(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE created_at >= ? AND created_at < ?
    `, [start, end]);

  return result[0]?.total || 0;
}