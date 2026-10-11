import { escapeHtml } from "./html";
import { printHtml } from "./print";
// inlined as a data: URI, so the receipt needs no file access and the CSP allows it
import logoUrl from "../assets/receipt-logo.png?inline";

export type ReceiptOrder = {
  id: number;
  createdAt?: string;
  tableLabel?: string;
  items: {
    name: string;
    selectedSize?: string;
    price: number;
    quantity: number;
    note?: string;
  }[];
  subtotal?: number;
  discount?: number;
  total: number;
};

function buildReceiptHtml(order: ReceiptOrder) {
  const subtotal =
    order.subtotal ||
    order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = order.discount || 0;

  const receiptHTML = `
      <p>رقم الطلب: #${order.id}</p>
      ${
        order.tableLabel
          ? `<p>الطاولة: ${escapeHtml(order.tableLabel)}</p>`
          : ""
      }
      <p>${new Date(order.createdAt || Date.now()).toLocaleString()}</p>
      <hr />

      ${order.items
        .map(
          (item) => `
          <div class="item">
            <div class="row">
              <span>
                ${escapeHtml(item.name)}
                ${item.selectedSize ? ` (${escapeHtml(item.selectedSize)})` : ""}
                x${item.quantity}
              </span>
              <span>
                ₪${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>

            ${
              item.note
                ? `<div class="note">ملاحظة: ${escapeHtml(item.note)}</div>`
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
        <span>₪${order.total.toFixed(2)}</span>
      </div>
    `;

  return `
      <html>
        <head>
          <title>الطلب</title>
          <style>
            body { font-family: Arial; padding: 20px; color: black; direction: rtl; }
            .logo { display: block; margin: 0 auto 6px; width: 60%; max-width: 300px; height: auto; }
            h2 { text-align: center; font-size: 14px; color: #555; }
            .item { margin: 10px 0; border-bottom: 1px dashed #ccc; padding-bottom: 8px; }
            .row { display: flex; justify-content: space-between; }
            .note { font-size: 12px; color: gray; margin-top: 4px; }
            .total { margin-top: 20px; font-size: 20px; font-weight: bold; display: flex; justify-content: space-between; }
            .page-break { page-break-after: always; break-after: page; }
          </style>
        </head>

        <body>
          <img class="logo" src="${logoUrl}" alt="MOOD YARD" />
          <h2>(نسخة الزبون)</h2>
          ${receiptHTML}

          <div class="page-break"></div>

          <img class="logo" src="${logoUrl}" alt="MOOD YARD" />
          <h2>(نسخة الباريستا)</h2>
          ${receiptHTML}
        </body>
      </html>
    `;
}

/* Print the customer + barista copies of an order. Resolves once the print
   dialog is closed. */
export function printReceipt(order: ReceiptOrder) {
  return printHtml(buildReceiptHtml(order));
}
