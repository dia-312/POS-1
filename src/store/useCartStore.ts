import { create } from "zustand";

type Product = {
  id: number;
  name: string;
  category?: string;
  price: number;
  image: string;
};

type CartItem = Product & {
  quantity: number;
};

type CartStore = {
  cart: CartItem[];

  addToCart: (product: Product) => void;

  increaseQuantity: (id: number) => void;

  decreaseQuantity: (id: number) => void;

  removeFromCart: (id: number) => void;

  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set) => ({
  cart: [],

  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          ),
        };
      }

      return {
        cart: [
          ...state.cart,
          {
            ...product,
            quantity: 1,
          },
        ],
      };
    }),

  increaseQuantity: (id) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      ),
    })),

  decreaseQuantity: (id) =>
    set((state) => ({
      cart: state.cart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0),
    })),

  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),

  clearCart: () => set({ cart: [] }),
}));