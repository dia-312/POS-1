import { useEffect, useState } from "react";

import {
  getProducts,
} from "../lib/database";

import { useCartStore } from "../store/useCartStore";

import toast from "react-hot-toast";

import CheckoutModal from "../components/ui/CheckoutModal";

import { useOrdersStore } from "../store/useOrdersStore";

import { createSale } from "../lib/database";

export default function Cashier() {

  const [search, setSearch] = useState("");

  const [products, setProducts] =
    useState<any[]>([]);

  const [checkoutOpen, setCheckoutOpen] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState("All");

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

  const filteredProducts = products.filter(
    (product) => {
      if (!product || !product.name || product.name.trim() === "") {
        return false;
      }

      const matchesSearch =
        product.name
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        product.category ===
          selectedCategory;

      return (
        matchesSearch &&
        matchesCategory
      );
    }
  );

  const total = cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {

    await createSale(total);

    const orderData = {
      id: Date.now(),
      items: cart,
      total,
      createdAt:
        new Date().toISOString(),
    };

    addOrder(orderData);

    /* PRINT RECEIPT */

    const receiptHTML = `
            <p>
              Order ID:
              #${orderData.id}
            </p>

            <p>
              ${new Date(
                orderData.createdAt
              ).toLocaleString()}
            </p>

            <hr />

            ${orderData.items
              .map(
                (item) => `
                  <div class="item">

                    <div class="row">
                      <span>
                        ${item.name}
                        ${item.selectedSize
                          ? ` (${item.selectedSize})`
                          : ""
                        }
                        x${item.quantity}
                      </span>

                      <span>
                        ₪${(
                          item.price *
                          item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>

                    ${
                      item.note
                        ? `
                          <div class="note">
                            Note:
                            ${item.note}
                          </div>
                        `
                        : ""
                    }

                  </div>
                `
              )
              .join("")}

            <div class="total">
              <span>Total</span>

              <span>
                ₪${orderData.total.toFixed(2)}
              </span>
            </div>
    `;

    const fullHtml = `
        <html>
          <head>
            <title>Receipt</title>

            <style>
              body {
                font-family: Arial;
                padding: 20px;
                color: black;
              }

              h1 {
                text-align: center;
                margin-bottom: 5px;
              }

              h2 {
                text-align: center;
                font-size: 14px;
                color: #555;
                margin-top: 0;
                margin-bottom: 20px;
              }

              .item {
                margin: 10px 0;
                border-bottom: 1px dashed #ccc;
                padding-bottom: 8px;
              }

              .row {
                display: flex;
                justify-content: space-between;
              }

              .note {
                font-size: 12px;
                color: gray;
                margin-top: 4px;
              }

              .total {
                margin-top: 20px;
                font-size: 20px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
              }

              .divider {
                border-top: 2px dashed black;
                margin: 40px 0;
              }

              @media print {
                .page-break {
                  page-break-after: always;
                }
              }
            </style>
          </head>

          <body>

            <!-- CUSTOMER COPY -->
            <h1>POS RECEIPT</h1>
            <h2>(Customer Copy)</h2>
            ${receiptHTML}

            <div class="divider page-break"></div>

            <!-- BARISTA COPY -->
            <h1>POS RECEIPT</h1>
            <h2>(Barista Copy)</h2>
            ${receiptHTML}

          </body>
        </html>
    `;

    const printWindow = document.createElement("iframe");
    printWindow.style.position = "fixed";
    printWindow.style.right = "0";
    printWindow.style.bottom = "0";
    printWindow.style.width = "0";
    printWindow.style.height = "0";
    printWindow.style.border = "0";
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(printWindow);
      }, 1000);
    }

    toast.success(
      "Order Created Successfully"
    );

    clearCart();

    setCheckoutOpen(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {

    const data =
      await getProducts();

    setProducts(data);
  };

  return (
    <div className="flex h-full gap-6">

      {/* PRODUCTS SECTION */}

      <div className="flex-1 flex flex-col">

        {/* HEADER */}

        <div className="mb-6">

          <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-4">
            Cashier
          </h1>

          {/* SEARCH */}

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="
              w-full
              bg-white dark:bg-stone-800
              border border-stone-200 dark:border-stone-700
              rounded-2xl
              px-5 py-4
              text-stone-900 dark:text-white
              outline-none
              text-lg
            "
          />

          {/* CATEGORIES */}

          <div className="flex gap-3 mt-4 flex-wrap">

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
                onClick={() =>
                  setSelectedCategory(cat)
                }
                className={`
                  px-5 py-2 rounded-xl
                  transition
                  font-medium
                  ${
                    selectedCategory === cat
                      ? "bg-amber-600 text-stone-900 dark:text-white"
                      : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:bg-stone-700"
                  }
                `}
              >
                {cat}
              </button>
            ))}

          </div>
        </div>

        {/* PRODUCTS GRID */}

        <div
          className="
            grid
            grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
            gap-4
            overflow-auto
            pr-2
          "
        >

          {filteredProducts.map((product) => {

            let sizes: any[] = [];

            try {

              sizes =
                typeof product.sizes === "string"
                  ? JSON.parse(product.sizes)
                  : product.sizes || [];

              sizes = sizes.filter(
                (s: any) =>
                  s &&
                  s.size &&
                  s.size.trim() !== ""
              );

            } catch {

              sizes = [];
            }

            return (

              <div
                key={product.id}
                className="
                  bg-white dark:bg-stone-800
                  rounded-2xl
                  border border-stone-200 dark:border-stone-700
                  hover:border-amber-500
                  transition
                  p-4
                  flex flex-col
                  h-full
                "
              >

                <div className="mb-4 flex-grow">
                  <h2 className="text-stone-900 dark:text-white text-base font-semibold leading-snug break-words">
                    {product.name}
                  </h2>
                  <p className="text-stone-500 dark:text-stone-400 text-xs mt-1">
                    {product.category}
                  </p>
                </div>

                {/* SIZES */}

                {sizes.length > 0 ? (

                  <div className="flex flex-col gap-2 mt-auto">

                    {sizes.map(
                      (
                        size: any,
                        index: number
                      ) => (

                        <button
                          key={index}
                          onClick={() =>
                            addToCart({
                              ...product,
                              selectedSize:
                                size.size,
                              price:
                                Number(size.price),
                            })
                          }
                          className="
                            w-full
                            bg-amber-600
                            hover:bg-amber-700
                            text-white
                            py-2
                            rounded-xl
                            flex
                            justify-between
                            items-center
                            px-4
                            transition
                          "
                        >

                          <span className="font-medium text-sm">
                            {size.size}
                          </span>

                          <span className="font-bold">
                            ₪{size.price}
                          </span>

                        </button>
                      )
                    )}

                  </div>

                ) : (

                  <button
                    onClick={() =>
                      addToCart({
                        ...product,
                        price: product.price || 0
                      })
                    }
                    className="
                      mt-auto
                      w-full
                      bg-amber-600
                      hover:bg-amber-700
                      text-white
                      py-2.5
                      rounded-xl
                      font-semibold
                      transition
                    "
                  >
                    Add To Cart
                  </button>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* CART SECTION */}

      <div
        className="
          w-[340px]
          bg-stone-50 dark:bg-stone-900
          border border-stone-200 dark:border-stone-800
          rounded-2xl
          p-5
          flex flex-col
        "
      >

        <div className="mb-5">

          <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
            Current Order
          </h2>

          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {cart.length} Items
          </p>

        </div>

        {/* CART ITEMS */}

        <div className="flex-1 overflow-auto space-y-3 pr-1">

          {cart.map((item) => (

            <div
              key={`${item.id}-${item.selectedSize}`}
              className="
                bg-white dark:bg-stone-800
                rounded-xl
                p-3
              "
            >

              <div className="flex justify-between">

                <div className="flex-1">

                  <h3 className="text-stone-900 dark:text-white font-medium">

                    {item.name}

                    {item.selectedSize && (
                      <span className="text-sm text-stone-500 dark:text-stone-400 block">
                        Size:
                        {" "}
                        {item.selectedSize}
                      </span>
                    )}

                  </h3>

                  {/* NOTE INPUT */}

                  <textarea
                    value={item.note || ""}
                    onChange={(e) =>
                      updateNote(
                        item.id,
                        item.selectedSize,
                        e.target.value
                      )
                    }
                    placeholder="Add note..."
                    className="
                      mt-2
                      w-full
                      bg-stone-100 dark:bg-stone-700
                      text-stone-900 dark:text-white
                      text-sm
                      rounded-lg
                      p-2
                      outline-none
                      resize-none
                    "
                  />

                  <div className="flex items-center gap-2 mt-3">

                    <button
                      onClick={() =>
                        decreaseQuantity(
                          item.id,
                          item.selectedSize
                        )
                      }
                      className="
                        w-7 h-7
                        rounded-lg
                        bg-stone-100 dark:bg-stone-700
                        text-stone-900 dark:text-white
                      "
                    >
                      -
                    </button>

                    <span className="text-stone-900 dark:text-white w-5 text-center">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        increaseQuantity(
                          item.id,
                          item.selectedSize
                        )
                      }
                      className="
                        w-7 h-7
                        rounded-lg
                        bg-stone-100 dark:bg-stone-700
                        text-stone-900 dark:text-white
                      "
                    >
                      +
                    </button>

                  </div>
                </div>

                <div className="text-right ml-4">

                  <p className="text-stone-900 dark:text-white font-bold">
                    ₪
                    {(
                      item.price *
                      item.quantity
                    ).toFixed(2)}
                  </p>

                  <button
                    onClick={() =>
                      removeFromCart(
                        item.id,
                        item.selectedSize
                      )
                    }
                    className="
                      text-red-400
                      text-sm
                      mt-3
                      hover:text-red-300
                    "
                  >
                    Remove
                  </button>

                </div>
              </div>
            </div>
          ))}

        </div>

        {/* TOTAL */}

        <div
          className="
            border-t border-stone-200 dark:border-stone-700
            pt-5 mt-5
          "
        >

          <div className="flex justify-between items-center mb-5">

            <span className="text-stone-600 dark:text-stone-300 text-lg">
              Total
            </span>

            <span className="text-3xl font-bold text-stone-900 dark:text-white">
              ₪{total.toFixed(2)}
            </span>

          </div>

          <button
            onClick={() =>
              setCheckoutOpen(true)
            }
            className="
              w-full
              bg-green-600
              hover:bg-green-700
              text-stone-900 dark:text-white
              py-4
              rounded-2xl
              text-lg
              font-bold
              transition
            "
          >
            Checkout
          </button>

        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() =>
          setCheckoutOpen(false)
        }
        onConfirm={handleCheckout}
        total={total}
      />

    </div>
  );
}