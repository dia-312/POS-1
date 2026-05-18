import { useState } from "react";
import { useOrdersStore } from "../store/useOrdersStore";
import { deleteSale } from "../lib/database";

export default function Orders() {
  const { orders, setOrders } = useOrdersStore();

  const [selectedOrder, setSelectedOrder] =
    useState<number | null>(null);

  const currentOrder = orders.find(
    (order) => order.id === selectedOrder
  );

  const handleDelete = async (id: number) => {
    try {
      console.log("DELETE CLICKED:", id);

      // 1. delete from database
      await deleteSale(id);

      // 2. update zustand state immediately
      const updatedOrders = orders.filter(
        (o) => o.id !== id
      );

      setOrders(updatedOrders);

      // 3. IMPORTANT: delay dashboard refresh قليلاً
      setTimeout(() => {
        window.dispatchEvent(
          new Event("dashboard-refresh")
        );
      }, 100);

      // 4. clear selected order if deleted
      if (selectedOrder === id) {
        setSelectedOrder(null);
      }

      console.log("DELETE DONE");
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6 h-full">

      {/* ORDERS LIST */}
      <div className="col-span-2 bg-white p-6">

        <h1 className="text-2xl font-bold mb-4">
          Orders
        </h1>

        {orders.map((order) => (
          <div
            key={order.id}
            className="flex justify-between p-3 border mb-2"
          >
            <div>
              <p>#{order.id}</p>
              <p>{order.items.length} items</p>
              <p>₪{order.total}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSelectedOrder(order.id)
                }
                className="bg-amber-600 text-white px-3 py-1 rounded"
              >
                View
              </button>

              <button
                onClick={() =>
                  handleDelete(order.id)
                }
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILS */}
      <div className="p-6 bg-white">

        {currentOrder ? (
          <>
            <h2>Order #{currentOrder.id}</h2>

            <p>
              Total: ₪{currentOrder.total}
            </p>
          </>
        ) : (
          <p>Select order</p>
        )}

      </div>
    </div>
  );
}