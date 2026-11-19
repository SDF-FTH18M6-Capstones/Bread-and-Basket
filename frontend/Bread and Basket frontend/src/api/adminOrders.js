import { request } from "./client";

export function getCampaignOrders(campaignId) {
  return request(`/admin/campaigns/${encodeURIComponent(campaignId)}/orders`);
}

export function updateCampaignOrdersStatus(campaignId, status, note) {
  return request(
    `/admin/campaigns/${encodeURIComponent(campaignId)}/orders/status`,
    {
      method: "POST",
      body: {
        status,
        ...(note ? { note } : {}),
      },
    },
  );
}

export function updateAdminOrderStatus(orderId, status) {
  return request(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "POST",
    body: { status },
  });
}
