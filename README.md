# 📦 POS System

Modern Desktop Point-of-Sale (POS) System built with React, TypeScript, Vite, Tauri, and SQLite.

Developed by **Diaa Arar** © 2026 — All Rights Reserved.

---

# ✨ Overview

POS System is a modern desktop/web application designed for cafés, restaurants, and small businesses to manage sales, products, expenses, and reports efficiently.

The application is built using:

- React + TypeScript
- Vite
- Tauri
- SQLite
- TailwindCSS

It runs as a fast desktop application on Windows/macOS/Linux while keeping all data stored locally.

---

# 🚀 Features

## 🔐 Authentication
- Login / Logout system
- Protected routes
- Admin & Staff roles
- Local authentication storage

## 📊 Dashboard
- Daily sales overview
- Revenue statistics
- Inventory summaries

## 🛒 Cashier System
- Add products to cart
- Checkout workflow
- Receipt printing support
- Fast product search

## 📦 Products Management
- Create / Edit / Delete products
- Product images
- Inventory tracking
- Categories & pricing

## 📑 Orders Management
- View all orders
- Change order status
- Completed / Pending / Cancelled orders

## 💸 Expenses Tracking
- Add expenses
- Financial tracking
- Expense reports

## 📈 Reports
- Sales reports
- Expenses reports
- Export CSV/PDF

## 👥 Users Management
- Manage staff accounts
- Role permissions

## ⚙️ Settings
- Theme switching
- Application settings
- About / Developer page

## 🧪 Testing
- End-to-End tests using Playwright

---

# 🛠️ Technologies Used

| Category | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | TailwindCSS |
| Desktop App | Tauri |
| Database | SQLite |
| Routing | React Router DOM |
| State Management | Zustand / Context API |
| Testing | Playwright |

---

# 📂 Project Structure

```bash
POS-1/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── routes/
│   ├── hooks/
│   ├── store/
│   ├── lib/
│   └── assets/
│
├── src-tauri/
│   ├── Cargo.toml
│   └── src/
│
├── public/
├── README.md
├── DEVELOPER.md
├── LICENSE_INFO.txt
└── package.json
```

---

# ⚡ Installation

## Requirements

- Node.js >= 18
- npm
- Git
- Rust Toolchain (for Tauri builds)

---

## Clone Repository

```bash
git clone https://github.com/your-repository/pos-system.git

cd pos-system
```

---

## Install Dependencies

```bash
npm install
```

---

## Run Development Server

```bash
npm run dev
```

Vite server will start on:

```bash
http://localhost:5173
```

---

# 🖥️ Tauri Desktop Development

## Run Desktop App

```bash
npm run tauri dev
```

## Build Production App

```bash
npm run tauri build
```

Build files will be generated inside:

```bash
src-tauri/target/release/
```

---

# 🧪 Run Tests

```bash
npm run test:e2e
```

---

# 📄 License

This project is proprietary software.

Unauthorized copying, modification, redistribution, reverse engineering, or resale is prohibited without explicit permission from the developer.

See:
- `DEVELOPER.md`
- `LICENSE_INFO.txt`

for full information.

---

# 👨‍💻 Developer

### Diaa Arar

📧 Email: diaararx@gmail.com

📱 Phone: +972568207267

---

# 🔮 Future Improvements

- Multi-branch inventory support
- Online payment integration
- Kitchen printing support
- Cloud synchronization
- Multi-store management

---

# ⭐ Notes

- Built with modern UI/UX principles
- Fully RTL-ready
- Designed for performance and simplicity
- Local-first architecture (offline capable)

---

# 📌 Version

Current Version: **1.0.0**

© 2026 Diaa Arar — All Rights Reserved.
