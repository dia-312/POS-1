import { useEffect, useState } from "react";
import { getProducts, createSale } from "../lib/database";
import { useCartStore } from "../store/useCartStore";
import toast from "react-hot-toast";
import CheckoutModal from "../components/ui/CheckoutModal";
import { useOrdersStore } from "../store/useOrdersStore";

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
      product.category === selectedCategory;

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
      <p>Order ID: #${orderData.id}</p>
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
                ? `<div class="note">Note: ${item.note}</div>`
                : ""
            }
          </div>
        `
        )
        .join("")}

      <hr />

      <p>Subtotal: ₪${subtotal.toFixed(2)}</p>
      <p>Discount: ${discount}%</p>

      <div class="total">
        <span>Total</span>
        <span>₪${orderData.total.toFixed(2)}</span>
      </div>
    `;

    const fullHtml = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: Arial; padding: 20px; color: black; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; color: #555; }
            .item { margin: 10px 0; border-bottom: 1px dashed #ccc; padding-bottom: 8px; }
            .row { display: flex; justify-content: space-between; }
            .note { font-size: 12px; color: gray; margin-top: 4px; }
            .total { margin-top: 20px; font-size: 20px; font-weight: bold; display: flex; justify-content: space-between; }
            .divider { border-top: 2px dashed black; margin: 40px 0; }
          </style>
        </head>

        <body>
          <h1>POS RECEIPT</h1>
          <h2>(Customer Copy)</h2>
          ${receiptHTML}

          <div class="divider"></div>

          <h1>POS RECEIPT</h1>
          <h2>(Barista Copy)</h2>
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

    toast.success("Order Created Successfully");

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

        <h1 className="text-3xl font-bold mb-4">Cashier</h1>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border rounded-2xl px-5 py-4 mb-4"
        />

        {/* DISCOUNT BUTTONS */}
        <div className="flex gap-2 mb-4">
          {[0, 10, 30, 50].map((d) => (
            <button
              key={d}
              onClick={() => setDiscount(d)}
              className={`px-4 py-2 rounded-xl ${
                discount === d
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {d === 0 ? "No Discount" : `${d}%`}
            </button>
          ))}

          <input
            type="number"
            placeholder="%"
            className="border px-2 rounded"
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>

        {/* CATEGORIES */}
        <div className="flex gap-3 flex-wrap mb-4">
          {[
            "All",
            "Ice",
            "Natural",
            "Smoothie",
            "Milkeshake",
            "Mojito",
            "Hot",
            "Cocktail",
            "Healthy",
            "Smoke",
            "Snacks",
            "Desserts",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl ${
                selectedCategory === cat
                  ? "bg-amber-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {cat}
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
              <div key={product.id} className="border p-3 rounded-xl">
                <h2 className="font-bold">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.category}</p>

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
                    Add To Cart
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CART */}
      <div className="w-[340px] border p-4 rounded-xl">

        <h2 className="text-xl font-bold mb-2">Current Order</h2>

        {cart.map((item) => (
          <div key={`${item.id}-${item.selectedSize}`} className="mb-3">

            <p>
              {item.name} {item.selectedSize && `(${item.selectedSize})`}
            </p>

            <textarea
              value={item.note || ""}
              onChange={(e) =>
                updateNote(item.id, item.selectedSize, e.target.value)
              }
            />

            <div className="flex gap-2">
              <button onClick={() => decreaseQuantity(item.id, item.selectedSize)}>
                -
              </button>

              <span>{item.quantity}</span>

              <button onClick={() => increaseQuantity(item.id, item.selectedSize)}>
                +
              </button>
            </div>

            <button
              onClick={() => removeFromCart(item.id, item.selectedSize)}
              className="text-red-500"
            >
              Remove
            </button>
          </div>
        ))}

        {/* ✅ DISCOUNT SUMMARY MOVED HERE */}
        <div className="mt-4 p-3 border rounded-xl bg-gray-50">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>₪{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm text-red-600">
            <span>Discount ({discount}%):</span>
            <span>-₪{(subtotal * (discount / 100)).toFixed(2)}</span>
          </div>

          <hr className="my-2" />

          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>₪{total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => setCheckoutOpen(true)}
          className="w-full bg-green-600 text-white py-3 mt-4 rounded-xl"
        >
          Checkout
        </button>

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