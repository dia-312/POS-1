import csv
import sqlite3
import json
import os
import sys

# Paths
csv_path = r'c:\Users\hp\OneDrive\Desktop\POS-1\products.csv'
db_path = os.path.expandvars(r'%APPDATA%\com.tauri.dev\pos-final.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    sys.exit(1)

if not os.path.exists(csv_path):
    print(f"CSV file not found at {csv_path}")
    sys.exit(1)

# Connect to SQLite
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Read CSV
with open(csv_path, mode='r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    
    # Skip the first garbage line and header line
    lines = list(reader)
    if len(lines) > 2:
        data_lines = lines[2:]
    else:
        print("CSV does not contain enough data lines")
        sys.exit(1)

    inserted_count = 0

    for row in data_lines:
        if len(row) < 3:
            continue
            
        category_raw = row[0].strip()
        # Capitalize the first letter for category
        category = category_raw.title() if category_raw else "Uncategorized"
        
        name = row[2].strip()
        if not name:
            continue
            
        small_price = row[3].strip() if len(row) > 3 else ""
        medium_price = row[4].strip() if len(row) > 4 else ""
        large_price = row[5].strip() if len(row) > 5 else ""

        sizes = []
        if small_price:
            sizes.append({"size": "Small", "price": float(small_price)})
        if medium_price:
            sizes.append({"size": "Medium", "price": float(medium_price)})
        if large_price:
            sizes.append({"size": "Large", "price": float(large_price)})

        # Primary price is the first size price or 0
        price = sizes[0]["price"] if sizes else 0.0
        stock = 100
        sizes_json = json.dumps(sizes)

        cursor.execute('''
            INSERT INTO products (name, price, stock, category, sizes)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, price, stock, category, sizes_json))
        
        inserted_count += 1

# Commit and close
conn.commit()
conn.close()

print(f"Successfully inserted {inserted_count} products!")
