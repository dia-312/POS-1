import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboardOverview, getLowStockProducts } from "../lib/database";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Figures = { revenue: number; orders: number; expenses: number };

type Overview = Awaited<ReturnType<typeof getDashboardOverview>>;

type LowStockProduct = { id: number; name: string; stock: number };

const EMPTY_FIGURES: Figures = { revenue: 0, orders: 0, expenses: 0 };

// Arabic text with Latin digits, like the rest of the app
const monthTitle = (date: Date) =>
  date.toLocaleDateString("ar-u-nu-latn", { month: "long", year: "numeric" });

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

const net = (figures: Figures) => figures.revenue - figures.expenses;

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview>({
    month: EMPTY_FIGURES,
    today: EMPTY_FIGURES,
    products: 0,
    chart: [],
  });
  const [shownMonth, setShownMonth] = useState(() => new Date());
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  // The month the numbers on screen belong to; the dashboard starts over
  // when the calendar month changes, even if the app was left open.
  const loadedMonth = useRef(monthKey(new Date()));

  const loadDashboard = useCallback(async () => {
    const now = new Date();
    const [data, low] = await Promise.all([
      getDashboardOverview(now),
      getLowStockProducts(),
    ]);

    loadedMonth.current = monthKey(now);
    setShownMonth(now);
    setOverview(data);
    setLowStock(low as LowStockProduct[]);
  }, []);

  useEffect(() => {
    loadDashboard();

    // 👇 مهم جداً: يسمع أي حذف/تغيير ويعيد تحميل الداشبورد
    const handler = () => {
      loadDashboard();
    };

    // new month (or day) while the app stays open: reload from scratch
    const checkMonth = () => {
      if (monthKey(new Date()) !== loadedMonth.current) loadDashboard();
    };

    window.addEventListener("dashboard-refresh", handler);
    window.addEventListener("focus", checkMonth);
    const timer = window.setInterval(checkMonth, 30_000);

    return () => {
      window.removeEventListener("dashboard-refresh", handler);
      window.removeEventListener("focus", checkMonth);
      window.clearInterval(timer);
    };
  }, [loadDashboard]);

  const { month, today } = overview;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
          لوحة التحكم
        </h1>

        <p
          data-testid="dashboard-month"
          className="text-lg text-stone-500 dark:text-stone-400"
        >
          {monthTitle(shownMonth)}
        </p>
      </div>

      {/* STATS (this month, today underneath) */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
          <p className="text-stone-500 dark:text-stone-400 mb-2">
            صافي إيرادات الشهر
          </p>
          <h2
            data-testid="month-net"
            className="text-4xl font-bold text-stone-900 dark:text-white"
          >
            ₪{net(month).toFixed(2)}
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">
            إيرادات ₪{month.revenue.toFixed(2)} · مصاريف ₪
            {month.expenses.toFixed(2)}
          </p>
          <p
            data-testid="today-net"
            className="text-sm text-stone-600 dark:text-stone-300 mt-1"
          >
            اليوم: ₪{net(today).toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
          <p className="text-stone-500 dark:text-stone-400 mb-2">
            طلبات الشهر
          </p>
          <h2
            data-testid="month-orders"
            className="text-4xl font-bold text-stone-900 dark:text-white"
          >
            {month.orders}
          </h2>
          <p
            data-testid="today-orders"
            className="text-sm text-stone-600 dark:text-stone-300 mt-3"
          >
            اليوم: {today.orders}
          </p>
        </div>

        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
          <p className="text-stone-500 dark:text-stone-400 mb-2">
            المنتجات
          </p>
          <h2 className="text-4xl font-bold text-stone-900 dark:text-white">
            {overview.products}
          </h2>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-6">
          مبيعات الشهر (يومياً)
        </h2>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overview.chart}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                labelFormatter={(day) => `يوم ${day}`}
                formatter={(value) => [`₪${Number(value).toFixed(2)}`, "المبيعات"]}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOW STOCK */}
      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6 mt-6">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-6">
          تنبيهات نقص المخزون
        </h2>

        <div className="space-y-4">
          {lowStock.map((product) => (
            <div
              key={product.id}
              className="bg-stone-50 dark:bg-stone-900 p-4 rounded-xl flex justify-between"
            >
              <div>
                <p className="text-stone-900 dark:text-white font-semibold">
                  {product.name}
                </p>
                <p className="text-stone-500 dark:text-stone-400">
                  معرف المنتج: {product.id}
                </p>
              </div>

              <div className="text-red-400 font-bold text-xl">
                متبقي {product.stock}
              </div>
            </div>
          ))}

          {lowStock.length === 0 && (
            <p className="text-stone-500 dark:text-stone-400">
              لا توجد تنبيهات لنقص المخزون
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
