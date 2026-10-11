import { create } from "zustand";
import toast from "react-hot-toast";
import {
  getOpenOrders,
  createOpenOrder,
  saveOpenOrder,
  deleteOpenOrder,
} from "../lib/database";

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

/* A draft is one order being built: the quick (take-away) order, or the
   open order of a table. Table drafts have an id and live in the database. */
export type Draft = {
  id: number | null;
  label: string;
  items: CartItem[];
  discount: number;
};

type CartStore = {
  quick: Draft;
  tables: Draft[];
  /* null = the quick order is the one being edited */
  activeId: number | null;
  tablesLoaded: boolean;

  loadOpenOrders: () => Promise<void>;
  openTable: (label: string) => Promise<void>;
  selectOrder: (id: number | null) => void;
  /* drop a table's draft locally (after it was paid) */
  removeTable: (id: number) => void;
  /* delete a table's open order without selling it */
  cancelTable: (id: number) => Promise<void>;

  setDiscount: (discount: number) => void;

  addToCart: (product: Product) => void;
  increaseQuantity: (id: number, selectedSize?: string) => void;
  decreaseQuantity: (id: number, selectedSize?: string) => void;
  removeFromCart: (id: number, selectedSize?: string) => void;
  updateNote: (id: number, selectedSize: string | undefined, note: string) => void;
  clearCart: () => void;
};

const QUICK_LABEL = "طلب سريع";

const emptyQuick = (): Draft => ({
  id: null,
  label: QUICK_LABEL,
  items: [],
  discount: 0,
});

/* The draft currently being edited. */
export const selectActive = (state: CartStore): Draft =>
  state.activeId === null
    ? state.quick
    : state.tables.find((t) => t.id === state.activeId) ?? state.quick;

const sameLine = (item: CartItem, id: number, selectedSize?: string) =>
  item.id === id && item.selectedSize === selectedSize;

/* Saves are chained so they reach the database in the order they were made
   (a slow older write must never overwrite a newer one). */
let writeChain: Promise<void> = Promise.resolve();

function queueSave(draft: Draft) {
  if (draft.id === null) return;

  const id = draft.id;
  // Only what an order line needs — not the whole product row.
  const items = draft.items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    selectedSize: item.selectedSize,
    price: item.price,
    quantity: item.quantity,
    note: item.note,
  }));
  const discount = draft.discount;

  writeChain = writeChain
    .then(() => saveOpenOrder(id, items, discount))
    .catch((err) => {
      console.error("SAVE OPEN ORDER ERROR:", err);
      toast.error("تعذر حفظ الطلب، تأكد من التطبيق");
    });
}

export const useCartStore = create<CartStore>((set, get) => {
  /* Apply a change to the active draft and persist it if it is a table. */
  const mutate = (change: (draft: Draft) => Draft) => {
    set((state) => {
      if (state.activeId === null) return { quick: change(state.quick) };

      return {
        tables: state.tables.map((t) =>
          t.id === state.activeId ? change(t) : t
        ),
      };
    });

    queueSave(selectActive(get()));
  };

  const mutateItems = (change: (items: CartItem[]) => CartItem[]) =>
    mutate((draft) => ({ ...draft, items: change(draft.items) }));

  return {
    quick: emptyQuick(),
    tables: [],
    activeId: null,
    tablesLoaded: false,

    loadOpenOrders: async () => {
      // Already in memory for this session — don't clobber unsaved edits.
      if (get().tablesLoaded) return;

      const rows = await getOpenOrders();

      set((state) => ({
        tables: rows,
        tablesLoaded: true,
        activeId: rows.some((r) => r.id === state.activeId)
          ? state.activeId
          : null,
      }));
    },

    openTable: async (label) => {
      const clean = label.trim();

      if (!clean) throw new Error("اكتب اسم أو رقم الطاولة");

      if (get().tables.some((t) => t.label === clean)) {
        throw new Error("هذه الطاولة لديها طلب مفتوح بالفعل");
      }

      const id = await createOpenOrder(clean);

      set((state) => ({
        tables: [
          ...state.tables,
          { id, label: clean, items: [], discount: 0 },
        ],
        activeId: id,
      }));
    },

    selectOrder: (id) => set({ activeId: id }),

    removeTable: (id) =>
      set((state) => ({
        tables: state.tables.filter((t) => t.id !== id),
        activeId: state.activeId === id ? null : state.activeId,
      })),

    cancelTable: async (id) => {
      // Wait for pending saves so none lands after the delete.
      await writeChain;
      await deleteOpenOrder(id);
      get().removeTable(id);
    },

    setDiscount: (discount) => mutate((draft) => ({ ...draft, discount })),

    addToCart: (product) =>
      mutateItems((items) => {
        if (items.some((item) => sameLine(item, product.id, product.selectedSize))) {
          return items.map((item) =>
            sameLine(item, product.id, product.selectedSize)
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        return [...items, { ...product, quantity: 1, note: "" }];
      }),

    increaseQuantity: (id, selectedSize) =>
      mutateItems((items) =>
        items.map((item) =>
          sameLine(item, id, selectedSize)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      ),

    decreaseQuantity: (id, selectedSize) =>
      mutateItems((items) =>
        items
          .map((item) =>
            sameLine(item, id, selectedSize)
              ? { ...item, quantity: item.quantity - 1 }
              : item
          )
          .filter((item) => item.quantity > 0)
      ),

    removeFromCart: (id, selectedSize) =>
      mutateItems((items) =>
        items.filter((item) => !sameLine(item, id, selectedSize))
      ),

    updateNote: (id, selectedSize, note) =>
      mutateItems((items) =>
        items.map((item) =>
          sameLine(item, id, selectedSize) ? { ...item, note } : item
        )
      ),

    /* Empties the quick order after a sale. (A paid table is removed with
       removeTable instead.) */
    clearCart: () => set({ quick: emptyQuick() }),
  };
});
