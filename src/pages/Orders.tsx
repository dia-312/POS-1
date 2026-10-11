import { useEffect, useState } from "react";
import { deleteSale, getOrders, hasOrdersBefore } from "../lib/database";
import { groupOrdersByDay, timeOf } from "../lib/ordersByDay";
import { printReceipt, type ReceiptOrder } from "../lib/receipt";
import { useAuthStore } from "../store/useAuthStore";
import ConfirmModal from "../components/ui/ConfirmModal";
import toast from "react-hot-toast";

const DAYS_PER_PAGE = 30;

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const { user } = useAuthStore();

  const [selectedOrder, setSelectedOrder] =
    useState<number | null>(null);

  const [deleteTargetId, setDeleteTargetId] =
    useState<number | null>(null);

  const currentOrder = orders.find(
    (order) => order.id === selectedOrder
  );

  /* How far back the list reaches. Older days are loaded on request so the
     page stays fast after years of sales. */
  const [daysBack, setDaysBack] = useState(DAYS_PER_PAGE);
  const [showAll, setShowAll] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const loadOrders = async (days = daysBack) => {
    if (showAll) {
      setOrders(await getOrders());
      setHasOlder(false);
      return;
    }

    const today = new Date();
    const since = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (days - 1)
    ).toISOString();

    const [data, older] = await Promise.all([
      getOrders(since),
      hasOrdersBefore(since),
    ]);

    setOrders(data);
    setHasOlder(older);
  };

  useEffect(() => {
    loadOrders(daysBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysBack, showAll]);

  const dayGroups = groupOrdersByDay(orders);

  // the newest day is open by default, older ones are folded
  const isDayOpen = (key: string, index: number) =>
    openDays[key] ?? index === 0;

  const handleDelete = async (id: number) => {
    if (user?.role !== "admin") {
      toast.error("غير مصرح: يسمح للمسؤولين فقط بحذف الطلبات.");
      return;
    }

    try {
      // 1. delete from database
      await deleteSale(id);

      // 2. reload orders from the database
      await loadOrders();

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
    } catch (err) {
      toast.error("فشل حذف الطلب");
      console.error("DELETE ERROR:", err);
    }
  };

  const handlePrint = (orderData: ReceiptOrder) => {
    printReceipt(orderData).catch((err) => {
      console.error("PRINT ERROR:", err);
      toast.error("تعذرت الطباعة");
    });
  };

  return (
    <div className="grid grid-cols-3 gap-6 h-full">

      {/* ORDERS LIST */}
      <div className="col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-stone-900 dark:text-stone-50 shadow-sm overflow-y-auto">

        <h1 className="text-2xl font-bold mb-4">
          الطلبات
        </h1>

        {dayGroups.length === 0 && (
          <p className="text-stone-500 dark:text-stone-400">
            لا توجد طلبات في هذه الفترة
          </p>
        )}

        {dayGroups.map((group, index) => {
          const open = isDayOpen(group.key, index);

          return (
            <section
              key={group.key}
              data-testid={`day-${group.key}`}
              className="mb-4"
            >
              <button
                onClick={() =>
                  setOpenDays((days) => ({ ...days, [group.key]: !open }))
                }
                aria-expanded={open}
                className="w-full flex justify-between items-center gap-4 px-4 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-start"
              >
                <span className="font-bold">
                  <span className="inline-block w-5 text-stone-500">
                    {open ? "▾" : "◂"}
                  </span>
                  {group.label}
                </span>

                <span className="text-sm text-stone-600 dark:text-stone-300 whitespace-nowrap">
                  {group.orders.length} طلبات · ₪{group.total.toFixed(2)}
                </span>
              </button>

              {open &&
                group.orders.map((order) => (
                  <div
                    key={order.id}
                    data-testid={`order-${order.id}`}
                    className={`flex justify-between items-center p-4 border rounded-xl mt-2 bg-stone-50 dark:bg-stone-800/50 hover:border-amber-500/50 transition-colors ${
                      order.id === selectedOrder
                        ? "border-amber-500"
                        : "border-stone-200 dark:border-stone-800"
                    }`}
                  >
                    <div>
                      <p>
                        #{order.id}
                        {order.tableLabel && ` · طاولة ${order.tableLabel}`}
                        <span className="text-stone-500 dark:text-stone-400">
                          {" "}
                          · {timeOf(order.createdAt)}
                        </span>
                      </p>
                      <p>{order.items.length} منتجات</p>
                      <p>₪{order.total}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOrder(order.id)}
                        className="bg-amber-600 text-white px-3 py-1 rounded"
                      >
                        عرض
                      </button>

                      {user?.role === "admin" && (
                        <button
                          onClick={() => setDeleteTargetId(order.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </section>
          );
        })}

        {hasOlder && (
          <div className="flex gap-3">
            <button
              onClick={() => setDaysBack((days) => days + DAYS_PER_PAGE)}
              className="flex-1 py-3 rounded-xl border border-dashed border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              عرض طلبات أقدم
            </button>

            <button
              onClick={() => setShowAll(true)}
              className="flex-1 py-3 rounded-xl border border-dashed border-stone-400 text-stone-600 dark:text-stone-300 hover:bg-stone-500/10 transition-colors"
            >
              عرض كل الطلبات
            </button>
          </div>
        )}
      </div>

      {/* DETAILS */}
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-900 dark:text-stone-50 shadow-sm flex flex-col">

        {currentOrder ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              طلب رقم #{currentOrder.id}
              {currentOrder.tableLabel && ` · طاولة ${currentOrder.tableLabel}`}
            </h2>

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

      <ConfirmModal
        open={deleteTargetId !== null}
        title="حذف الطلب"
        message={`هل أنت متأكد من حذف الطلب #${deleteTargetId}؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId !== null) handleDelete(deleteTargetId);
          setDeleteTargetId(null);
        }}
      />
    </div>
  );
}