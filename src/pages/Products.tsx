import { useEffect, useState } from "react";

import {
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
} from "../lib/database";

type Product = {
  id: number;
  name: string;
  stock: number;
  category: string;

  sizes: {
    size: string;
    price: number;
  }[];
};

export default function Products() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [category, setCategory] =
    useState("Ice");

  const [name, setName] = useState("");

  const [stock, setStock] =
    useState("");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [sizes, setSizes] = useState([
    {
      size: "",
      price: "",
    },
  ]);

  async function loadProducts() {
    const result = await getProducts();

    setProducts(result);
  }

  async function handleAddProduct() {
    if (!name || !stock) return;

    const formattedSizes = sizes.map(
      (item) => ({
        size: item.size,
        price: Number(item.price),
      })
    );

    if (editingId) {
      await updateProduct(
        editingId,
        name,
        Number(stock),
        category,
        formattedSizes
      );

      setEditingId(null);
    } else {
      await addProduct(
        name,
        Number(stock),
        category,
        formattedSizes
      );
    }

    setName("");
    setStock("");
    setCategory("Ice");

    setSizes([
      {
        size: "",
        price: "",
      },
    ]);

    loadProducts();
  }

  async function handleDelete(
    id: number
  ) {
    await deleteProduct(id);

    loadProducts();
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-6">
        المنتجات
      </h1>

      {/* FORM */}

      <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 mb-6">
        <div className="grid grid-cols-1 gap-4">
          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="اسم المنتج"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <input
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
            placeholder="الكمية في المخزن"
            type="number"
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
          >
            <option value="Ice">بارد</option>
            <option value="Natural">طبيعي</option>
            <option value="Smoothie">سموذي</option>
            <option value="Milkeshake">ميلك شيك</option>
            <option value="Mojito">موهيتو</option>
            <option value="Hot">ساخن</option>
            <option value="Cocktail">كوكتيل</option>
            <option value="Healthy">صحي</option>
            <option value="Smoke">سموك</option>
            <option value="Snacks">سناكس</option>
            <option value="Desserts">حلويات</option>
          </select>

          {/* SIZES */}

          <div className="space-y-3">
            <h3 className="text-stone-900 dark:text-white font-semibold">
              الأحجام والأسعار
            </h3>

            {sizes.map((item, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <input
                    placeholder="الحجم (مثال: كبير، وسط)"
                    value={item.size}
                    onChange={(e) => {
                      const updated = [...sizes];
                      updated[index].size = e.target.value;
                      setSizes(updated);
                    }}
                    className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
                  />

                  <input
                    type="number"
                    placeholder="السعر"
                    value={item.price}
                    onChange={(e) => {
                      const updated = [...sizes];
                      updated[index].price = e.target.value;
                      setSizes(updated);
                    }}
                    className="w-40 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-stone-900 dark:text-white"
                  />

                  {sizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = sizes.filter((_, i) => i !== index);
                        setSizes(updated);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-colors flex items-center justify-center"
                      title="إزالة الحجم"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  )}
                </div>
              ))}

            <button
              type="button"
              onClick={() =>
                setSizes([
                  ...sizes,
                  {
                    size: "",
                    price: "",
                  },
                ])
              }
              className="bg-amber-600 hover:bg-amber-700 text-stone-900 dark:text-white px-4 py-2 rounded-lg"
            >
              إضافة حجم
            </button>
          </div>
        </div>

        <button
          onClick={handleAddProduct}
          className="mt-6 bg-amber-600 hover:bg-amber-700 text-stone-900 dark:text-white px-6 py-3 rounded-lg"
        >
          {editingId
            ? "تحديث المنتج"
            : "إضافة منتج"}
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 dark:bg-stone-900">
            <tr>
              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                المعرف
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                الاسم
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                الأحجام والأسعار
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                المخزون
              </th>

              <th className="text-start p-4 text-stone-600 dark:text-stone-300">
                العمليات
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-stone-200 dark:border-stone-700"
              >
                <td className="p-4 text-stone-900 dark:text-white">
                  {product.id}
                </td>

                <td className="p-4 text-stone-900 dark:text-white">
                  {product.name}
                </td>

                <td className="p-4 text-stone-900 dark:text-white">
                  <div className="space-y-1">
                    {product.sizes?.map(
                      (
                        size,
                        index
                      ) => (
                        <div
                          key={index}
                        >
                          {
                            size.size
                          }{" "}
                          - ₪
                          {
                            size.price
                          }
                        </div>
                      )
                    )}
                  </div>
                </td>

                <td className="p-4 text-stone-900 dark:text-white">
                  {product.stock}
                </td>

                <td className="p-4 flex gap-2">
                  <button
                    onClick={() =>
                      handleDelete(
                        product.id
                      )
                    }
                    className="bg-red-600 hover:bg-red-700 text-stone-900 dark:text-white px-4 py-2 rounded-lg"
                  >
                    حذف
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(
                        product.id
                      );

                      setName(
                        product.name
                      );

                      setStock(
                        product.stock.toString()
                      );

                      setCategory(
                        product.category
                      );

                      setSizes(
                        product.sizes.map(
                          (s) => ({
                            size: s.size,
                            price:
                              s.price.toString(),
                          })
                        )
                      );
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-stone-900 dark:text-white px-4 py-2 rounded-lg"
                  >
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}