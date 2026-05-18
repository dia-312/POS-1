import { useEffect, useState } from "react";
import { getMonthlyReports } from "../lib/database";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const data = await getMonthlyReports();
    setReports(data);
  };

  // Reversing data for the chart so it goes from oldest to newest left-to-right
  const chartData = [...reports].reverse().map(r => ({
    month: r.month,
    profit: r.profit,
    revenue: r.revenue
  }));

  const allTimeRevenue = reports.reduce((acc, curr) => acc + curr.revenue, 0);
  const allTimeExpenses = reports.reduce((acc, curr) => acc + curr.expenses, 0);
  const allTimeProfit = reports.reduce((acc, curr) => acc + curr.profit, 0);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white">
          Monthly Reports
        </h1>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-stone-100 dark:bg-stone-700 rounded-xl text-amber-600 dark:text-amber-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">All-Time Revenue</p>
            <h3 className="text-2xl font-bold text-stone-900 dark:text-white">₪{allTimeRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-stone-100 dark:bg-stone-700 rounded-xl text-red-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
          </div>
          <div>
            <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">All-Time Expenses</p>
            <h3 className="text-2xl font-bold text-stone-900 dark:text-white">₪{allTimeExpenses.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-stone-100 dark:bg-stone-700 rounded-xl text-emerald-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div>
            <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Net Profit</p>
            <h3 className="text-2xl font-bold text-stone-900 dark:text-white">₪{allTimeProfit.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* CHART & TABLE AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* CHART */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm flex flex-col">
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6">Profit Trend</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.2} />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', borderColor: '#444', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Profit" />
                <Line type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} opacity={0.5} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-6 shadow-sm flex flex-col overflow-hidden">
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6">Monthly Breakdown</h2>
          
          <div className="flex-1 overflow-auto pr-2">
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.month} className="p-4 border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 rounded-xl hover:border-amber-500 transition">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-stone-900 dark:text-white text-lg">{report.month}</h3>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2 py-1 rounded-md font-medium">
                      {report.orders} Orders
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-stone-500 dark:text-stone-400">Revenue</p>
                      <p className="font-semibold text-stone-900 dark:text-white">₪{report.revenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500 dark:text-stone-400">Expenses</p>
                      <p className="font-semibold text-red-500">₪{report.expenses.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 mt-1 pt-2 border-t border-stone-200 dark:border-stone-700">
                      <div className="flex justify-between items-center">
                        <p className="text-stone-500 dark:text-stone-400 font-medium">Profit</p>
                        <p className={`font-bold text-lg ${report.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ₪{report.profit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div className="text-center py-10 text-stone-500 dark:text-stone-400">
                  No monthly data available yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
