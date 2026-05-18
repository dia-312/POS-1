import { useEffect, useState } from "react";

import {
  getDashboardStats,
  getSalesChart,
  getLowStockProducts,
  getTotalExpenses,
} from "../lib/database";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
  });

  const [lowStock, setLowStock] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  async function loadDashboard() {
    const statsData = await getDashboardStats();
    const chart = await getSalesChart();
    const low = await getLowStockProducts();
    const expenses = await getTotalExpenses();

    setChartData(chart);
    setLowStock(low);

    setStats({
      revenue: statsData.revenue - expenses,
      orders: statsData.orders,
      products: statsData.products,
    });
  }

  useEffect(() => {
    loadDashboard();

    // 👇 مهم جداً: يسمع أي حذف/تغيير ويعيد تحميل الداشبورد
    const handler = () => {
      loadDashboard();
    };

    window.addEventListener("dashboard-refresh", handler);

    return () => {
      window.removeEventListener("dashboard-refresh", handler);
    };
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-6">
        Dashboard
      </h1>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
          <p className="text-stone-500 dark:text-stone-400 mb-2">
            Revenue
          </p>
          <h2 className="text-4xl font-bold text-stone-900 dark:text-white">
            ₪{stats.revenue.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
          <p className="text-stone-500 dark:text-stone-400 mb-2">
            Orders
          </p>
          <h2 className="text-4xl font-bold text-stone-900 dark:text-white">
            {stats.orders}
          </h2>
        </div>

        <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
          <p className="text-stone-500 dark:text-stone-400 mb-2">
            Products
          </p>
          <h2 className="text-4xl font-bold text-stone-900 dark:text-white">
            {stats.products}
          </h2>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-6">
          Sales Analytics
        </h2>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
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
          Low Stock Alerts
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
                  Product ID: {product.id}
                </p>
              </div>

              <div className="text-red-400 font-bold text-xl">
                {product.stock} Left
              </div>
            </div>
          ))}

          {lowStock.length === 0 && (
            <p className="text-stone-500 dark:text-stone-400">
              No Low Stock Alerts
            </p>
          )}
        </div>
      </div>
    </div>
  );
}