import { assetUrl } from "../../api/client";

export function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "KSh 0";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelative(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const difference = date.getTime() - Date.now();
  const seconds = Math.round(difference / 1000);

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }

  return "Just now";
}

export function withArea(value) {
  if (!value) return "Location not provided";

  if (typeof value === "string") return value;

  if (typeof value !== "object") return "Location not provided";

  const parts = [
    value.address,
    value.area,
    value.estate,
    value.city,
    value.county,
  ].filter(Boolean);

  return parts.length
    ? [...new Set(parts)].join(", ")
    : "Location not provided";
}

export function imageUrl(path) {
  return assetUrl(path);
}

export const TONES = {
  neutral: "bg-stone-100 text-stone-700",
  info: "bg-blue-100 text-blue-800",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-800",
};

export const ORDER_STATUS = {
  pending_payment: {
    label: "Awaiting payment",
    tone: "warning",
    group: "active",
  },
  paid: {
    label: "Paid",
    tone: "info",
    group: "active",
  },
  confirmed: {
    label: "Confirmed",
    tone: "info",
    group: "active",
  },
  preparing: {
    label: "Preparing",
    tone: "warning",
    group: "active",
  },
  dispatched: {
    label: "On the way",
    tone: "info",
    group: "active",
  },
  ready_for_collection: {
    label: "Ready for collection",
    tone: "info",
    group: "active",
  },
  completed: {
    label: "Completed",
    tone: "success",
    group: "completed",
  },
  cancelled: {
    label: "Cancelled",
    tone: "danger",
    group: "closed",
  },
  refunded: {
    label: "Refunded",
    tone: "success",
    group: "closed",
  },
  failed: {
    label: "Payment failed",
    tone: "danger",
    group: "closed",
  },
};

export function statusOf(status) {
  const key = String(status || "").toLowerCase();

  return (
    ORDER_STATUS[key] || {
      label: key
        ? key
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
        : "Unknown",
      tone: "neutral",
      group: "active",
    }
  );
}

export const HISTORY_TEXT = {
  pending_payment: "Waiting for payment",
  paid: "Payment received",
  confirmed: "Order confirmed",
  preparing: "Order is being prepared",
  dispatched: "Order dispatched",
  ready_for_collection: "Ready for collection",
  completed: "Order completed",
  cancelled: "Order cancelled",
  refunded: "Refund processed",
  failed: "Payment failed",
};

export const CATEGORY_ICON = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  grains: "Rice and grains",
  rice: "Rice and grains",
  flour: "Flour",
  cooking_oil: "Cooking oil",
  sugar: "Sugar",
  pulses: "Pulses",
  dairy: "Dairy and eggs",
  eggs: "Dairy and eggs",
};

export const REFUND_REASON = {
  customer_cancelled: "Order cancelled by customer",
  seller_cancelled: "Order cancelled by seller",
  campaign_failed: "Campaign did not reach its minimum",
  payment_failed: "Payment failed",
  item_unavailable: "Item unavailable",
  order_cancelled: "Order cancelled",
  other: "Other",
};

export function progressSteps(order) {
  const delivery =
    order?.fulfilment_type === "delivery" ||
    order?.fulfilment === "delivery" ||
    order?.delivery_method === "delivery";

  return [
    { key: "confirmed", label: "Confirmed" },
    { key: "preparing", label: "Preparing" },
    delivery
      ? { key: "dispatched", label: "On the way" }
      : { key: "ready_for_collection", label: "Ready" },
    {
      key: "completed",
      label: delivery ? "Delivered" : "Collected",
    },
  ];
}
