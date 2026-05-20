import csv
import json
import os
import sqlite3

# Paths
csv_path = r'c:\Users\hp\OneDrive\Desktop\POS-1\products.csv'
json_path = r'c:\Users\hp\OneDrive\Desktop\POS-1\src\lib\defaultProducts.json'
db_path = os.path.expandvars(r'%APPDATA%\com.moodyard.pos\pos-final.db')

category_map = {
    "ايس": "Ice",
    "طبيعي": "Natural",
    "سموذي": "Smoothie",
    "ميلك شيك": "Milkeshake",
    "موهيتو": "Mojito",
    "مهيتو": "Mojito",
    "هوت": "Hot",
    "كوكتيل": "Cocktail",
    "صحي": "Healthy"
}

def main():
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return

    products = []
    
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        lines = list(reader)
        
        # Skip row 0 (title/garbage) and row 1 (headers)
        data_rows = lines[2:] if len(lines) > 2 else []
        
        for idx, row in enumerate(data_rows):
            if len(row) < 3:
                continue
                
            raw_cat = row[0].strip()
            if not raw_cat:
                continue
                
            category = category_map.get(raw_cat)
            if not category:
                # Try fallback by prefix/substring matching
                for k, v in category_map.items():
                    if k in raw_cat or raw_cat in k:
                        category = v
                        break
                if not category:
                    category = "Ice" # fallback default
            
            name = row[2].strip()
            if not name:
                continue
                
            # Parse prices
            sizes = []
            
            def clean_price(val):
                val = val.strip()
                if not val:
                    return None
                try:
                    return float(val)
                except ValueError:
                    return None
            
            small_p = clean_price(row[3]) if len(row) > 3 else None
            medium_p = clean_price(row[4]) if len(row) > 4 else None
            large_p = clean_price(row[5]) if len(row) > 5 else None
            
            if small_p is not None:
                sizes.append({"size": "Small", "price": small_p})
            if medium_p is not None:
                sizes.append({"size": "Medium", "price": medium_p})
            if large_p is not None:
                sizes.append({"size": "Large", "price": large_p})
                
            # Skip if no prices/sizes are specified
            if not sizes:
                print(f"Skipping product at index {idx} because it has no price/size specified.")
                continue
                
            first_price = sizes[0]["price"]
            
            products.append({
                "name": name,
                "stock": 100,
                "category": category,
                "sizes": sizes,
                "price": first_price
            })
            
    # 1. Write to defaultProducts.json
    with open(json_path, 'w', encoding='utf-8') as jf:
        json.dump(products, jf, ensure_ascii=False, indent=2)
    print(f"Saved {len(products)} products to defaultProducts.json")
    
    # 2. Update active SQLite databases
    db_paths = [
        os.path.expandvars(r'%APPDATA%\com.moodyard.pos\pos-final.db'),
        os.path.expandvars(r'%APPDATA%\com.tauri.dev\pos-final.db')
    ]
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"Found database at {db_path}. Updating...")
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                
                # Clear existing products
                cursor.execute("DELETE FROM products")
                
                # Insert new products
                inserted = 0
                for prod in products:
                    cursor.execute('''
                        INSERT INTO products (name, price, stock, category, sizes)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        prod["name"],
                        prod["price"],
                        prod["stock"],
                        prod["category"],
                        json.dumps(prod["sizes"], ensure_ascii=False)
                    ))
                    inserted += 1
                    
                conn.commit()
                conn.close()
                print(f"Successfully cleared and populated {inserted} products in {db_path}!")
            except Exception as e:
                print(f"Failed to update database directly: {e}")
        else:
            print(f"Database not found at {db_path}.")

if __name__ == '__main__':
    main()
