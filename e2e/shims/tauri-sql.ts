/* Browser stand-in for @tauri-apps/plugin-sql, used only by `vite --mode e2e`.
   It runs a real SQLite engine (sql.js, WASM), so the app's actual SQL is
   exercised. The database is saved to localStorage after every committed
   write, so reloading the page behaves like restarting the desktop app.

   Two behaviours of the real plugin are reproduced on purpose:
   - Explicit transactions are rejected. The real plugin runs every call on
     whichever pooled connection is free, so BEGIN ... COMMIT across calls
     fails there ("cannot start a transaction within a transaction",
     "database is locked", ...) — code that relies on them must not pass here.
   - A test can make statements fail: push { pattern, times } onto
     window.__e2eFail and the next `times` statements containing `pattern`
     throw "database is locked". */
import initSqlJs, { type Database as SqlDatabase, type SqlValue } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

const STORAGE_PREFIX = "e2e-sqlite:";

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

const connections = new Map<string, Promise<E2EDatabase>>();

type Fault = { pattern: string; times: number };

const TRANSACTION_STATEMENT = /^\s*(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i;

function failIfInjected(sql: string) {
  const faults = (globalThis as unknown as { __e2eFail?: Fault[] }).__e2eFail;
  const fault = faults?.find((f) => f.times > 0 && sql.includes(f.pattern));

  if (fault) {
    fault.times--;
    throw new Error("error returned from database: (code: 5) database is locked");
  }
}

class E2EDatabase {
  private db: SqlDatabase;
  private storageKey: string;

  private constructor(db: SqlDatabase, storageKey: string) {
    this.db = db;
    this.storageKey = storageKey;
  }

  static load(path: string): Promise<E2EDatabase> {
    let connection = connections.get(path);

    if (!connection) {
      connection = (async () => {
        const SQL = await initSqlJs({ locateFile: () => wasmUrl });
        const key = STORAGE_PREFIX + path;
        const saved = localStorage.getItem(key);
        const db = new SQL.Database(saved ? fromBase64(saved) : undefined);
        const instance = new E2EDatabase(db, key);

        // Lets a test query the database directly.
        (globalThis as Record<string, unknown>).__e2eSelect = (
          sql: string,
          params: unknown[] = []
        ) => instance.select(sql, params);

        return instance;
      })();

      connections.set(path, connection);
    }

    return connection;
  }

  private persist() {
    localStorage.setItem(this.storageKey, toBase64(this.db.export()));
  }

  async execute(sql: string, params: unknown[] = []) {
    if (TRANSACTION_STATEMENT.test(sql)) {
      throw new Error(
        "explicit transactions are not supported by tauri-plugin-sql (pooled connections)"
      );
    }
    failIfInjected(sql);

    this.db.run(sql, params.map((p) => (p === undefined ? null : p)) as SqlValue[]);

    const rowsAffected = this.db.getRowsModified();
    const lastInsertId = Number(
      this.db.exec("SELECT last_insert_rowid()")[0].values[0][0]
    );

    this.persist();

    return { rowsAffected, lastInsertId };
  }

  async select(sql: string, params: unknown[] = []) {
    const statement = this.db.prepare(sql);
    const rows: Record<string, SqlValue>[] = [];

    try {
      statement.bind(
        params.map((p) => (p === undefined ? null : p)) as SqlValue[]
      );
      while (statement.step()) rows.push(statement.getAsObject());
    } finally {
      statement.free();
    }

    return rows;
  }

  async close() {
    return true;
  }
}

export default E2EDatabase;
