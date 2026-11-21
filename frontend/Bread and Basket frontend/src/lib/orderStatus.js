// src/lib/orderStatus.js
export const ORDER_STATUS = {
  paid: {
    label: "Paid",
    note: "Waiting for the campaign to reach its minimum",
  },
  confirmed: {
    label: "Confirmed",
    note: "The campaign succeeded. Preparing starts soon",
  },
  preparing: {
    label: "Being prepared",
    note: "The seller is getting your order ready",
  },
  dispatched: { label: "On the way", note: "Your order is out for delivery" },
  ready_for_collection: {
    label: "Ready for collection",
    note: "Pick it up at your collection point",
  },
  completed: { label: "Completed", note: "You confirmed you received it" },
  cancelled: {
    label: "Cancelled",
    note: "You cancelled this order. A full refund was issued",
  },
  refunded: {
    label: "Refunded",
    note: "The campaign didn't reach its minimum. You were refunded in full",
  },
};

// Which statuses show on the Shop page, and which can be confirmed
export const IN_PROGRESS = ["preparing", "dispatched", "ready_for_collection"];
export const CAN_CONFIRM = ["dispatched", "ready_for_collection"];
