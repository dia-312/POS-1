import Database from "@tauri-apps/plugin-sql";

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

  return await database.select(`
    SELECT *
    FROM sales
    ORDER BY id DESC
  `);
}

/* DASHBOARD */

export async function getDashboardStats() {
  const database = await getDB();

  const sales =
    await database.select(`
      SELECT
        SUM(total) as revenue,
        COUNT(*) as orders
      FROM sales
    `);

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

  const result =
    await database.select(`
      SELECT SUM(total) as profit
      FROM sales
    `);

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

  return await database.select(`
    SELECT *
    FROM expenses
    ORDER BY id DESC
  `);
}

export async function getTotalExpenses() {
  const database = await getDB();

  const result =
    await database.select(`
      SELECT SUM(amount) as total
      FROM expenses
    `);

  return result[0]?.total || 0;
}