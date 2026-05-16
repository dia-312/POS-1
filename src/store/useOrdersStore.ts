import { create } from "zustand";
import { persist } from "zustand/middleware";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  items: OrderItem[];
  total: number;
  createdAt: string;
};

type OrdersStore = {
  orders: Order[];

  addOrder: (order: Order) => void;
};

export const useOrdersStore =
  create<OrdersStore>()(
    persist(
      (set) => ({
        orders: [],

        addOrder: (order) =>
          set((state) => ({
            orders: [
              ...state.orders,
              order,
            ],
          })),
      }),
      {
        name: "orders-storage",
      }
    )
  );