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
  price: number;
  stock: number;
};

export default function Products() {
  const [products, setProducts] = useState<
    Product[]
  >([]);
  const [category, setCategory] =
  useState("Drinks");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const [editingId, setEditingId] =
  useState<number | null>(null);

  async function loadProducts() {
  
  const result = await getProducts();

    setProducts(result);
  }

  async function handleAddProduct() {
  if (!name || !price || !stock) return;

  if (editingId) {
    await updateProduct(
      editingId,
      name,
      Number(price),
      Number(stock)
    );

    setEditingId(null);
  } else {
    await addProduct(
  name,
  Number(price),
  Number(stock),
  category
);
  }

  setName("");
  setPrice("");
  setStock("");
  setCategory("Drinks");
  loadProducts();
}

  async function handleDelete(id: number) {
    await deleteProduct(id);

    loadProducts();
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">
        Products
      </h1>

      {/* FORM */}

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Product Name"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
            placeholder="Price"
            type="number"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />

          <input
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
            placeholder="Stock"
            type="number"
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
          />

          <select
  value={category}
  onChange={(e) =>
    setCategory(e.target.value)
  }
  className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white"
>
  <option value="Drinks">
    Drinks
  </option>

  <option value="Food">
    Food
  </option>

  <option value="Snacks">
    Snacks
  </option>

  <option value="Desserts">
    Desserts
  </option>
</select>

        </div>

        <button
          onClick={handleAddProduct}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          {editingId ? "Update Product" : "Add Product"}
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="text-left p-4 text-slate-300">
                ID
              </th>

              <th className="text-left p-4 text-slate-300">
                Name
              </th>

              <th className="text-left p-4 text-slate-300">
                Price
              </th>

              <th className="text-left p-4 text-slate-300">
                Stock
              </th>

              <th className="text-left p-4 text-slate-300">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-slate-700"
              >
                <td className="p-4 text-white">
                  {product.id}
                </td>

                <td className="p-4 text-white">
                  {product.name}
                </td>

                <td className="p-4 text-white">
                  ${product.price}
                </td>

                <td className="p-4 text-white">
                  {product.stock}
                </td>

                <td className="p-4">

                  <button
                    onClick={() =>
                      handleDelete(product.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    Delete
                  </button>

                  <button
                   onClick={() => {
                   setEditingId(product.id);

                   setName(product.name);
                   setPrice(product.price.toString());
                   setStock(product.stock.toString());
                     }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg mr-2"
                        >
                         Edit
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