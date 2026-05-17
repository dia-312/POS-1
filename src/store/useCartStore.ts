import { create } from "zustand";

type Product = {
  id: number;
  name: string;
  category?: string;
  price: number;
  image?: string;
  selectedSize?: string;
};

type CartItem = Product & {
  quantity: number;
  selectedSize?: string;
  note?: string;
};

type CartStore = {
  cart: CartItem[];

  addToCart: (
    product: Product
  ) => void;

  increaseQuantity: (
    id: number,
    selectedSize?: string
  ) => void;

  decreaseQuantity: (
    id: number,
    selectedSize?: string
  ) => void;

  removeFromCart: (
    id: number,
    selectedSize?: string
  ) => void;

  updateNote: (
    id: number,
    selectedSize: string | undefined,
    note: string
  ) => void;

  clearCart: () => void;
};

export const useCartStore =
  create<CartStore>((set) => ({
    cart: [],

    addToCart: (product) =>
      set((state) => {

        const existing =
          state.cart.find(
            (item) =>
              item.id === product.id &&
              item.selectedSize ===
                product.selectedSize
          );

        if (existing) {
          return {
            cart: state.cart.map(
              (item) =>
                item.id ===
                  product.id &&
                item.selectedSize ===
                  product.selectedSize
                  ? {
                      ...item,
                      quantity:
                        item.quantity + 1,
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
              note: "",
            },
          ],
        };
      }),

    increaseQuantity: (
      id,
      selectedSize
    ) =>
      set((state) => ({
        cart: state.cart.map(
          (item) =>
            item.id === id &&
            item.selectedSize ===
              selectedSize
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item
        ),
      })),

    decreaseQuantity: (
      id,
      selectedSize
    ) =>
      set((state) => ({
        cart: state.cart
          .map((item) =>
            item.id === id &&
            item.selectedSize ===
              selectedSize
              ? {
                  ...item,
                  quantity:
                    item.quantity - 1,
                }
              : item
          )
          .filter(
            (item) =>
              item.quantity > 0
          ),
      })),

    removeFromCart: (
      id,
      selectedSize
    ) =>
      set((state) => ({
        cart: state.cart.filter(
          (item) =>
            !(
              item.id === id &&
              item.selectedSize ===
                selectedSize
            )
        ),
      })),

    updateNote: (
      id,
      selectedSize,
      note
    ) =>
      set((state) => ({
        cart: state.cart.map(
          (item) =>
            item.id === id &&
            item.selectedSize ===
              selectedSize
              ? {
                  ...item,
                  note,
                }
              : item
        ),
      })),

    clearCart: () =>
      set({ cart: [] }),
  }));