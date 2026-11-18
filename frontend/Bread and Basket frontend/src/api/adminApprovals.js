import { request } from "./client";

// Fetch sellers awaiting approval.
export function getPendingSellers() {
  return request("/admin/sellers?status=pending");
}

// Approve a seller.
export function approveSeller(sellerId) {
  return request(`/admin/sellers/${sellerId}/approve`, {
    method: "POST",
  });
}

// Reject a seller with a reason.
export function rejectSeller(sellerId, reason) {
  return request(`/admin/sellers/${sellerId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

// Fetch products awaiting approval.
export function getPendingProducts() {
  return request("/admin/products?status=pending");
}

// Approve a product.
export function approveProduct(productId) {
  return request(`/admin/products/${productId}/approve`, {
    method: "POST",
  });
}

// Reject a product with a reason.
export function rejectProduct(productId, reason) {
  return request(`/admin/products/${productId}/reject`, {
    method: "POST",
    body: { reason },
  });
}
