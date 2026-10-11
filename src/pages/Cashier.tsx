import { useEffect, useRef, useState } from "react";
import { getProducts, createSale, decreaseStock } from "../lib/database";
import { printReceipt } from "../lib/receipt";
import { useCartStore, selectActive } from "../store/useCartStore";
import toast from "react-hot-toast";
import CheckoutModal from "../components/ui/CheckoutModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import NewTableModal from "../components/ui/NewTableModal";

const CATEGORIES = [
  { id: "All", name: "الكل" },
  { id: "Ice", name: "بارد" },
  { id: "Natural", name: "طبيعي" },
  { id: "Smoothie", name: "سموذي" },
  { id: "Milkeshake", name: "ميلك شيك" },
  { id: "Mojito", name: "موهيتو" },
  { id: "Hot", name: "ساخن" },
  { id: "Cocktail", name: "كوكتيل" },
  { id: "Healthy", name: "صحي" },
  { id: "Smoke", name: "سموك" },
  { id: "Snacks", name: "سناكس" },
  { id: "Desserts", name: "حلويات" },
];

export default function Cashier() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [newTableOpen, setNewTableOpen] = useState(false);
  const [cancelTableOpen, setCancelTableOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const checkoutLock = useRef(false);

  const {
    quick,
    tables,
    activeId,
    loadOpenOrders,
    openTable,
    selectOrder,
    removeTable,
    cancelTable,
    setDiscount,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    updateNote,
    clearCart,
  } = useCartStore();

  const active = useCartStore(selectActive);
  const cart = active.items;
  const discount = active.discount;
  const isTable = active.id !== null;

  const draftTotal = (draft: typeof active) =>
    draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0) *
    (1 - draft.discount / 100);

  const filteredProducts = products.filter((product) => {
    if (!product || !product.name || product.name.trim() === "") return false;

    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      (product.category && product.category.trim().toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const handleCheckout = async () => {
    // Synchronous guard: state would still read "not paying" for a second
    // click that arrives before React re-renders.
    if (checkoutLock.current || cart.length === 0) return;

    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      const availableStock = product?.stock ?? 0;
      const requested = cart
        .filter((c) => c.id === item.id)
        .reduce((sum, c) => sum + c.quantity, 0);

      if (requested > availableStock) {
        toast.error(`الكمية المطلوبة من "${item.name}" أكبر من المخزون المتوفر (${availableStock})`);
        return;
      }
    }

    checkoutLock.current = true;
    setPaying(true);

    let orderData;
    try {
      const sale = await createSale(
        cart,
        subtotal,
        discount,
        total,
        isTable ? active.label : undefined,
        isTable ? (active.id as number) : undefined
      );

      // The sale is saved. From here nothing may stop the order from being
      // finished and printed, so stock problems are reported, not thrown.
      try {
        for (const item of cart) {
          await decreaseStock(item.id, item.quantity);
        }
        await loadProducts();
      } catch (stockErr) {
        console.error("STOCK UPDATE ERROR:", stockErr);
        toast.error("تم حفظ الطلب لكن تعذر تحديث المخزون");
      }

      if (!sale.tableClosed) {
        toast.error(
          "تم حفظ الطلب لكن تعذر إغلاق الطاولة. ألغِ طلب الطاولة يدوياً حتى لا يتكرر"
        );
      }

      orderData = {
        id: sale.id,
        items: cart,
        subtotal,
        discount,
        total,
        createdAt: sale.createdAt,
        tableLabel: isTable ? active.label : undefined,
      };
    } catch (err) {
      console.error("CHECKOUT ERROR:", err);
      toast.error("فشل إتمام الطلب");
      checkoutLock.current = false;
      setPaying(false);
      return;
    }

    // The order is saved: finish it on screen BEFORE printing. The print
    // dialog freezes the page while it is open, so anything left for after
    // it would stay stale (open payment window, full cart) in the meantime.
    // The sale already closed the table's open order in the database.
    if (isTable) removeTable(active.id as number);
    else clearCart();

    setCheckoutOpen(false);
    toast.success("تم إنشاء الطلب بنجاح");

    // Print from a later task so the screen repaints first. The lock is held
    // until then so no click can sell the same cart twice.
    setTimeout(() => {
      checkoutLock.current = false;
      setPaying(false);

      printReceipt(orderData).catch((err) => {
        console.error("PRINT ERROR:", err);
        toast.error(
          "تعذرت الطباعة. الطلب محفوظ، يمكنك إعادة الطباعة من صفحة الطلبات"
        );
      });
    }, 150);
  };

  const handleCancelTable = async () => {
    if (active.id === null) return;

    try {
      await cancelTable(active.id);
      toast.success("تم إلغاء الطلب");
    } catch (err) {
      console.error("CANCEL TABLE ERROR:", err);
      toast.error("فشل إلغاء الطلب");
    }
  };

  useEffect(() => {
    loadProducts();

    loadOpenOrders().catch((err) => {
      console.error("LOAD OPEN ORDERS ERROR:", err);
      toast.error("تعذر تحميل طلبات الطاولات");
    });
  }, [loadOpenOrders]);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  return (
    <div className="flex h-full gap-6">

      {/* PRODUCTS */}
      <div className="flex-1 flex flex-col">

        <h1 className="text-3xl font-bold mb-4 text-stone-900 dark:text-stone-50">الكاشير</h1>

        {/* OPEN ORDERS: quick order + one tab per table */}
        <div data-testid="order-tabs" className="flex gap-2 mb-4 overflow-x-auto pb-1 shrink-0">
          {[quick, ...tables].map((draft) => {
            const selected = draft.id === activeId;
            const count = draft.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <button
                key={draft.id ?? "quick"}
                data-testid={draft.id === null ? "tab-quick" : `tab-${draft.label}`}
                onClick={() => selectOrder(draft.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm transition-colors text-start ${
                  selected
                    ? "bg-amber-600 text-white"
                    : "bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700"
                }`}
              >
                <span className="font-bold">
                  {draft.id === null ? draft.label : `طاولة ${draft.label}`}
                </span>
                {count > 0 && (
                  <span className="block text-xs opacity-80">
                    {count} قطع · ₪{draftTotal(draft).toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setNewTableOpen(true)}
            className="shrink-0 px-4 py-2 rounded-xl border border-dashed border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            + طاولة جديدة
          </button>
        </div>

        <input
          type="text"
          placeholder="ابحث عن منتجات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl px-5 py-4 mb-4 text-stone-900 dark:text-stone-50 focus:outline-none focus:border-amber-500"
        />

        {/* DISCOUNT BUTTONS */}
        <div className="flex gap-2 mb-4">
          {[0, 10, 30, 50].map((d) => (
            <button
              key={d}
              onClick={() => setDiscount(d)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                discount === d
                  ? "bg-green-600 text-white"
                  : "bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              {d === 0 ? "بدون خصم" : `%${d} خصم`}
            </button>
          ))}

          <input
            type="number"
            placeholder="%"
            min={0}
            max={100}
            key={activeId ?? "quick"}
            defaultValue={[0, 10, 30, 50].includes(discount) ? "" : discount}
            className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 px-3 py-2 rounded-xl w-24 focus:outline-none focus:border-amber-500"
            onChange={(e) => {
              const value = Number(e.target.value);
              setDiscount(Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, value)));
            }}
          />
        </div>

        {/* CATEGORIES */}
        <div className="flex gap-3 flex-wrap mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                selectedCategory === cat.id
                  ? "bg-amber-600 text-white"
                  : "bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* PRODUCTS */}
        <div data-testid="products" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto">
          {filteredProducts.map((product) => {
            let sizes: any[] = [];

            try {
              sizes =
                typeof product.sizes === "string"
                  ? JSON.parse(product.sizes)
                  : product.sizes || [];
            } catch {
              sizes = [];
            }

            return (
              <div key={product.id} className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 rounded-xl hover:border-amber-500/50 transition-colors">
                <h2 className="font-bold text-stone-900 dark:text-stone-50">{product.name}</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">{product.category}</p>

                {sizes.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {sizes.map((size: any, i: number) => (
                      <button
                        key={i}
                        onClick={() =>
                          addToCart({
                            ...product,
                            selectedSize: size.size,
                            price: Number(size.price),
                          })
                        }
                        className="w-full bg-amber-600 text-white py-2 rounded"
                      >
                        {size.size} - ₪{size.price}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      addToCart({
                        ...product,
                        price: product.price || 0,
                      })
                    }
                    className="mt-2 w-full bg-amber-600 text-white py-2 rounded"
                  >
                    إضافة للسلة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CART */}
      <div data-testid="cart" className="w-[340px] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 rounded-2xl flex flex-col">

        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-50">
          {isTable ? `طاولة ${active.label}` : "الطلب الحالي"}
        </h2>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-2">
          {cart.map((item) => (
            <div key={`${item.id}-${item.selectedSize}`} className="bg-stone-50 dark:bg-stone-800/30 p-3 rounded-xl border border-stone-100 dark:border-stone-800">

              <div className="flex justify-between items-start">
                <div className="pr-2">
                  <p className="font-semibold text-stone-900 dark:text-stone-50 leading-tight">
                    {item.name} {item.selectedSize && `(${item.selectedSize})`}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    ₪{item.price.toFixed(2)} للقطعة
                  </p>
                </div>
                <span className="font-semibold text-stone-950 dark:text-stone-50 whitespace-nowrap">
                  ₪{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>

              <textarea
                placeholder="إضافة ملاحظة..."
                className="w-full mt-1 p-2 text-sm border border-stone-200 dark:border-stone-800 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-50 focus:outline-none focus:border-amber-500 resize-none h-12"
                value={item.note || ""}
                onChange={(e) =>
                  updateNote(item.id, item.selectedSize, e.target.value)
                }
              />

              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-3 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
                  <button onClick={() => decreaseQuantity(item.id, item.selectedSize)} className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-white transition-colors hover:bg-stone-50 dark:hover:bg-stone-600">
                    -
                  </button>
                  <span className="w-5 text-center text-stone-900 dark:text-stone-50 font-medium">{item.quantity}</span>
                  <button onClick={() => increaseQuantity(item.id, item.selectedSize)} className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-white transition-colors hover:bg-stone-50 dark:hover:bg-stone-600">
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id, item.selectedSize)}
                  className="text-red-500 text-sm hover:underline font-medium"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ DISCOUNT SUMMARY MOVED HERE */}
        <div className="mt-auto pt-4">
          <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-800/50">
            <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400 mb-1">
              <span>المجموع الفرعي:</span>
              <span>₪{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm text-red-600 dark:text-red-400 mb-2">
              <span>الخصم ({discount}%):</span>
              <span>-₪{(subtotal * (discount / 100)).toFixed(2)}</span>
            </div>

            <hr className="my-2 border-stone-200 dark:border-stone-700" />

            <div className="flex justify-between font-bold text-lg text-stone-900 dark:text-stone-50">
              <span>الإجمالي:</span>
              <span>₪{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0 || paying}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 text-white py-4 mt-4 rounded-xl font-bold transition-colors text-lg"
          >
            {isTable ? "دفع وإغلاق الطاولة" : "دفع وتأكيد"}
          </button>

          {isTable && (
            <button
              onClick={() => setCancelTableOpen(true)}
              className="w-full text-red-500 text-sm hover:underline font-medium mt-3"
            >
              إلغاء طلب الطاولة
            </button>
          )}
        </div>

      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleCheckout}
        total={total}
      />

      <NewTableModal
        open={newTableOpen}
        onClose={() => setNewTableOpen(false)}
        onCreate={openTable}
      />

      <ConfirmModal
        open={cancelTableOpen}
        title="إلغاء طلب الطاولة"
        message={`هل أنت متأكد من إلغاء طلب طاولة ${active.label}؟ سيتم حذف كل ما فيه دون تسجيل أي بيع.`}
        confirmLabel="إلغاء الطلب"
        cancelLabel="رجوع"
        onClose={() => setCancelTableOpen(false)}
        onConfirm={() => {
          setCancelTableOpen(false);
          handleCancelTable();
        }}
      />

    </div>
  );
}