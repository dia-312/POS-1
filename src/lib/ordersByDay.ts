/* Groups orders by the LOCAL calendar day they were made on (newest first),
   so an order rung up at 00:30 belongs to the new day, not to the UTC one. */
type DatedOrder = { createdAt?: string; total: number };

export type DayGroup<T extends DatedOrder> = {
  key: string; // YYYY-MM-DD, local
  label: string; // e.g. "اليوم · الأحد 11 أكتوبر 2026"
  orders: T[];
  total: number;
};

// Arabic text with Latin digits, like the rest of the app
const LOCALE = "ar-u-nu-latn";

export const dayKeyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

function dayLabel(key: string, now: Date) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const text = date.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1
  );

  if (key === dayKeyOf(now)) return `اليوم · ${text}`;
  if (key === dayKeyOf(yesterday)) return `أمس · ${text}`;
  return text;
}

export function groupOrdersByDay<T extends DatedOrder>(
  orders: T[],
  now: Date = new Date()
): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();

  for (const order of orders) {
    const key = dayKeyOf(new Date(order.createdAt ?? now));
    let group = groups.get(key);

    if (!group) {
      group = { key, label: dayLabel(key, now), orders: [], total: 0 };
      groups.set(key, group);
    }

    group.orders.push(order);
    group.total += order.total;
  }

  // YYYY-MM-DD sorts correctly as text
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export const timeOf = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString(LOCALE, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
