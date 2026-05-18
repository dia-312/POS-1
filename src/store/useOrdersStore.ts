import { create } from "zustand";
import { persist } from "zustand/middleware";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  selectedSize?: string;
};

type Order = {
  id: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
};

type OrdersStore = {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  removeOrder: (id: number) => void;
};

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set) => ({
      orders: [],

      setOrders: (orders) => set({ orders }),

      addOrder: (order) =>
        set((state) => ({
          orders: [...state.orders, order],
        })),

      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== id),
        })),
    }),
    {
      name: "orders-storage",
    }
  )
);