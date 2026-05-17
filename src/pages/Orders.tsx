import { useState } from "react";
import { useOrdersStore } from "../store/useOrdersStore";

export default function Orders() {

  const { orders } = useOrdersStore();

  const [selectedOrder, setSelectedOrder] =
    useState<number | null>(null);

  const currentOrder = orders.find(
    (order) => order.id === selectedOrder
  );

  const printReceipt = (order: any) => {

    const receiptContent = `
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
              font-size: 22px;
              font-weight: bold;
            }

          </style>

        </head>

        <body>

          <h1>POS RECEIPT</h1>

          <p>
            <strong>Order ID:</strong>
            #${order.id}
          </p>

          <p>
            <strong>Date:</strong>

            ${new Date(
              order.createdAt
            ).toLocaleString()}
          </p>

          <hr />

          ${order.items
            .map(
              (item: any) => `
                <div class="item">

                  <div class="row">

                    <span>
                      ${item.name}

                      ${
                        item.selectedSize
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

          <hr />

          <div class="total">
            Total:
            ₪${order.total.toFixed(2)}
          </div>

        </body>

      </html>
    `;

    const printWindow =
      document.createElement("iframe");

    printWindow.style.position =
      "fixed";

    printWindow.style.right = "0";

    printWindow.style.bottom = "0";

    printWindow.style.width = "0";

    printWindow.style.height = "0";

    printWindow.style.border = "0";

    document.body.appendChild(
      printWindow
    );

    const doc =
      printWindow.contentWindow?.document;

    if (!doc) return;

    doc.open();

    doc.write(receiptContent);

    doc.close();

    printWindow.contentWindow?.focus();

    printWindow.contentWindow?.print();

    setTimeout(() => {

      document.body.removeChild(
        printWindow
      );

    }, 1000);
  };

  return (

    <div className="grid grid-cols-3 gap-6 h-full">

      {/* ORDERS TABLE */}

      <div className="col-span-2 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">

        <div className="p-6 border-b border-slate-700">

          <h1 className="text-3xl font-bold text-white">
            Orders
          </h1>

        </div>

        <div className="overflow-auto max-h-[80vh]">

          <table className="w-full">

            <thead className="bg-slate-900">

              <tr>

                <th className="text-left p-4 text-slate-300">
                  Order ID
                </th>

                <th className="text-left p-4 text-slate-300">
                  Date
                </th>

                <th className="text-left p-4 text-slate-300">
                  Items
                </th>

                <th className="text-left p-4 text-slate-300">
                  Total
                </th>

                <th className="text-left p-4 text-slate-300">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {orders.map((order) => (

                <tr
                  key={order.id}
                  className="border-b border-slate-700 hover:bg-slate-700 transition"
                >

                  <td className="p-4 text-white">
                    #{order.id}
                  </td>

                  <td className="p-4 text-slate-300">

                    {new Date(
                      order.createdAt
                    ).toLocaleString()}

                  </td>

                  <td className="p-4 text-slate-300">
                    {order.items.length}
                  </td>

                  <td className="p-4 text-white font-semibold">
                    ₪{order.total.toFixed(2)}
                  </td>

                  <td className="p-4">

                    <button
                      onClick={() =>
                        setSelectedOrder(order.id)
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      View
                    </button>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          {orders.length === 0 && (

            <div className="p-10 text-center text-slate-400">
              No Orders Yet
            </div>

          )}

        </div>
      </div>

      {/* RECEIPT */}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 overflow-auto">

        <h2 className="text-3xl font-bold text-white mb-6">
          Receipt
        </h2>

        {!currentOrder && (

          <div className="text-slate-400">
            Select Order
          </div>

        )}

        {currentOrder && (

          <div>

            <div className="mb-6">

              <p className="text-slate-400 text-sm">
                Order ID
              </p>

              <p className="text-white text-lg font-semibold">
                #{currentOrder.id}
              </p>

            </div>

            <div className="mb-6">

              <p className="text-slate-400 text-sm">
                Date
              </p>

              <p className="text-white">

                {new Date(
                  currentOrder.createdAt
                ).toLocaleString()}

              </p>

            </div>

            <div className="space-y-4 mb-6">

              {currentOrder.items.map(
  (item: any, index: number) => (

    <div
      key={`${item.id}-${item.selectedSize || "default"}-${index}`}
      className="flex justify-between items-start"
    >

                  <div>

                    <p className="text-white font-medium">

                      {item.name}

                      {item.selectedSize && (
                        <span className="text-slate-400 text-sm ml-2">
                          ({item.selectedSize})
                        </span>
                      )}

                    </p>

                    {item.note && (

                      <p className="text-yellow-400 text-xs mt-1">
                        Note:
                        {" "}
                        {item.note}
                      </p>

                    )}

                    <p className="text-slate-400 text-sm">

                      {item.quantity}
                      {" "}x ₪
                      {item.price}

                    </p>

                  </div>

                  <p className="text-white font-semibold">

                    ₪
                    {(
                      item.quantity *
                      item.price
                    ).toFixed(2)}

                  </p>

                </div>
              ))}

            </div>

            <div className="border-t border-slate-700 pt-4 flex justify-between text-2xl font-bold text-white">

              <span>Total</span>

              <span>
                ₪{currentOrder.total.toFixed(2)}
              </span>

            </div>

            <button
              onClick={() =>
                printReceipt(currentOrder)
              }
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
            >
              Print Receipt
            </button>

          </div>
        )}

      </div>

    </div>
  );
}