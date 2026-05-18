import { create } from "zustand";
import { getDashboardStats } from "../lib/database";

type DashboardStore = {
  revenue: number;
  orders: number;
  products: number;
  fetchStats: () => Promise<void>;
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  revenue: 0,
  orders: 0,
  products: 0,

  fetchStats: async () => {
    const stats = await getDashboardStats();

    set({
      revenue: stats.revenue,
      orders: stats.orders,
      products: stats.products,
    });
  },
}));