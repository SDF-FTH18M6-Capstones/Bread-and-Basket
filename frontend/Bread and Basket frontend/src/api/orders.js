
import { request, ApiError } from "./client";

/**
 * GET /orders
 * Returns the logged-in consumer's orders.
 */
export async function fetchMyOrders({ signal } = {}) {
  const data = await request("/orders", { signal });

  if (!Array.isArray(data)) {
    throw new ApiError(
      "The server sent an unexpected orders response.",
      500,
    );
  }

  return data;
}

/**
 * GET /orders/{id}
 * Returns one order with payment and history details.
 */
export function fetchOrder(orderId, { signal } = {}) {
  return request(`/orders/${encodeURIComponent(orderId)}`, {
    signal,
  });
}

/**
 * POST /orders/{id}/cancel
 * Cancels an order and returns the updated order.
 */
export function cancelOrder(orderId) {
  return request(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
  });
}

/**
 * POST /orders/{id}/confirm-receipt
 * Confirms receipt and returns the updated order.
 */
export function confirmReceipt(orderId) {
  return request(`/orders/${encodeURIComponent(orderId)}/confirm-receipt`, {
    method: "POST",
  });
}

/**
 * Checks whether an order is still within its cancellation window.
 */
export function canCancelNow(order) {
  if (!order || !order.can_cancel || !order.cancellation_cutoff) {
    return false;
  }

  const cutoff = new Date(order.cancellation_cutoff);

  return (
    !Number.isNaN(cutoff.getTime()) &&
    cutoff.getTime() > Date.now()
  );
}

/**
 * Checks whether the consumer can confirm receipt.
 */
export function canConfirmReceipt(order) {
  if (!order) return false;

  return ["dispatched", "ready_for_collection"].includes(
    String(order.status || "").toLowerCase(),
  );
}

/**
 * Removes detail-only properties from an order.
 * Used when updating an item in the Orders list.
 */
export function toSummary(order) {
  const {
    unit_price,
    platform_charge,
    logistics_charge,
    payment,
    history,
    ...summary
  } = order;

  return summary;
}
