import sqlite3
import json
import os

db_path = os.path.expandvars(r'%APPDATA%\com.tauri.dev\pos-final.db')
out_path = r'c:\Users\hp\OneDrive\Desktop\POS-1\src\lib\defaultProducts.json'

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT name, stock, category, sizes, price FROM products")
rows = cursor.fetchall()

products = []
for row in rows:
    products.append({
        "name": row["name"],
        "stock": row["stock"],
        "category": row["category"],
        "sizes": json.loads(row["sizes"]) if row["sizes"] else [],
        "price": row["price"]
    })

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print(f"Dumped {len(products)} products to {out_path}")
