import { useState } from "react";
import { useOrdersStore } from "../store/useOrdersStore";
import { deleteSale } from "../lib/database";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

export default function Orders() {
  const { orders, setOrders } = useOrdersStore();
  const { user } = useAuthStore();

  const [selectedOrder, setSelectedOrder] =
    useState<number | null>(null);

  const currentOrder = orders.find(
    (order) => order.id === selectedOrder
  );

  const handleDelete = async (id: number) => {
    if (user?.role !== "admin") {
      toast.error("غير مصرح: يسمح للمسؤولين فقط بحذف الطلبات.");
      return;
    }

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

      toast.success("تم حذف الطلب بنجاح");
      console.log("DELETE DONE");
    } catch (err) {
      toast.error("فشل حذف الطلب");
      console.error("DELETE ERROR:", err);
    }
  };

  const handlePrint = (orderData: any) => {
    const subtotal = orderData.subtotal || orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const discount = orderData.discount || 0;

    const receiptHTML = `
      <p>رقم الطلب: #${orderData.id}</p>
      <p>${new Date(orderData.createdAt || Date.now()).toLocaleString()}</p>
      <hr />

      ${orderData.items
        .map(
          (item: any) => `
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
  };

  return (
    <div className="grid grid-cols-3 gap-6 h-full">

      {/* ORDERS LIST */}
      <div className="col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-stone-900 dark:text-stone-50 shadow-sm">

        <h1 className="text-2xl font-bold mb-4">
          الطلبات
        </h1>

        {orders.map((order) => (
          <div
            key={order.id}
            className="flex justify-between items-center p-4 border border-stone-200 dark:border-stone-800 rounded-xl mb-3 bg-stone-50 dark:bg-stone-800/50 hover:border-amber-500/50 transition-colors"
          >
            <div>
              <p>#{order.id}</p>
              <p>{order.items.length} منتجات</p>
              <p>₪{order.total}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setSelectedOrder(order.id)
                }
                className="bg-amber-600 text-white px-3 py-1 rounded"
              >
                عرض
              </button>

              {user?.role === "admin" && (
                <button
                  onClick={() =>
                    handleDelete(order.id)
                  }
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* DETAILS */}
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-50 shadow-sm flex flex-col">

        {currentOrder ? (
          <>
            <h2 className="text-xl font-bold mb-4">طلب رقم #{currentOrder.id}</h2>

            <div className="space-y-2 mb-4">
              {currentOrder.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between border-b border-stone-200 dark:border-stone-800 pb-3 mb-2 last:border-0">
                  <div>
                    <p className="font-semibold">{item.name} {item.selectedSize ? `(${item.selectedSize})` : ""}</p>
                    {item.note && <p className="text-sm text-gray-500">ملاحظة: {item.note}</p>}
                    <p className="text-sm">x{item.quantity}</p>
                  </div>
                  <p>₪{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 dark:border-stone-800 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm text-stone-600 dark:text-stone-400">
                <span>المجموع الفرعي:</span>
                <span>₪{(currentOrder.subtotal || currentOrder.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>الخصم:</span>
                <span>{currentOrder.discount || 0}%</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2">
                <span>الإجمالي:</span>
                <span>₪{currentOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => handlePrint(currentOrder)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 mt-6 rounded-xl font-bold transition-colors"
            >
              طباعة الفاتورة
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-stone-500 dark:text-stone-400">
            <p>اختر طلباً لعرض التفاصيل</p>
          </div>
        )}

      </div>
    </div>
  );
}