import { request } from "./client";

export async function getSellerProducts() {
  return request("/seller/products");
}

export async function submitSellerProduct(product) {
  return request("/seller/products", {
    method: "POST",
    body: product,
  });
}

export async function confirmStock(campaignId) {
  return request(`/seller/campaigns/${campaignId}/confirm-stock`, {
    method: "POST",
  });
}
