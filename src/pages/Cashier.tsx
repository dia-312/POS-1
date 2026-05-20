import { useEffect, useState } from "react";
import { getProducts, createSale } from "../lib/database";
import { useCartStore } from "../store/useCartStore";
import toast from "react-hot-toast";
import CheckoutModal from "../components/ui/CheckoutModal";
import { useOrdersStore } from "../store/useOrdersStore";

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

  const [discount, setDiscount] = useState<number>(0);

  const {
    cart,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    updateNote,
    clearCart,
  } = useCartStore();

  const { addOrder } = useOrdersStore();

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
    const saleId = await createSale(total);

    const orderData = {
      id: saleId,
      items: cart,
      subtotal,
      discount,
      total,
      createdAt: new Date().toISOString(),
    };

    addOrder(orderData);

    const receiptHTML = `
      <p>رقم الطلب: #${orderData.id}</p>
      <p>${new Date(orderData.createdAt).toLocaleString()}</p>
      <hr />

      ${orderData.items
        .map(
          (item) => `
          <div class="item">
            <div class="row">
              <span>
                ${item.name}
                ${item.selectedSize ? ` (${item.selectedSize})` : ""}
                x${item.quantity}
              </span>
              <span>
                ₪${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>

            ${
              item.note
                ? `<div class="note">ملاحظة: ${item.note}</div>`
                : ""
            }
          </div>
        `
        )
        .join("")}

      <hr />

      <p>المجموع الفرعي: ₪${subtotal.toFixed(2)}</p>
      <p>الخصم: ${discount}%</p>

      <div class="total">
        <span>الإجمالي</span>
        <span>₪${orderData.total.toFixed(2)}</span>
      </div>
    `;

    const fullHtml = `
      <html>
        <head>
          <title>الطلب</title>
          <style>
            body { font-family: Arial; padding: 20px; color: black; direction: rtl; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; color: #555; }
            .item { margin: 10px 0; border-bottom: 1px dashed #ccc; padding-bottom: 8px; }
            .row { display: flex; justify-content: space-between; }
            .note { font-size: 12px; color: gray; margin-top: 4px; }
            .total { margin-top: 20px; font-size: 20px; font-weight: bold; display: flex; justify-content: space-between; }
            .page-break { page-break-after: always; break-after: page; }
          </style>
        </head>

        <body>
          <h1>MOOD YARD</h1>
          <h2>(نسخة الزبون)</h2>
          ${receiptHTML}

          <div class="page-break"></div>

          <h1>MOOD YARD</h1>
          <h2>(نسخة الباريستا)</h2>
          ${receiptHTML}
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }

    toast.success("تم إنشاء الطلب بنجاح");

    clearCart();
    setDiscount(0);
    setCheckoutOpen(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  return (
    <div className="flex h-full gap-6">

      {/* PRODUCTS */}
      <div className="flex-1 flex flex-col">

        <h1 className="text-3xl font-bold mb-4 text-stone-900 dark:text-stone-50">الكاشير</h1>

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
            className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 px-3 py-2 rounded-xl w-24 focus:outline-none focus:border-amber-500"
            onChange={(e) => setDiscount(Number(e.target.value))}
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
        <div className="grid grid-cols-4 gap-4 overflow-auto">
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
      <div className="w-[340px] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 rounded-2xl flex flex-col">

        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-50">الطلب الحالي</h2>

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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 mt-4 rounded-xl font-bold transition-colors text-lg"
          >
            دفع وتأكيد
          </button>
        </div>

      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleCheckout}
        total={total}
      />

    </div>
  );
}