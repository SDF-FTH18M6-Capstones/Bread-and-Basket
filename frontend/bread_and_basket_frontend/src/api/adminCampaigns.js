import { request } from "./client";

// Fetch all admin campaigns, optionally filtered by status.
export function getAdminCampaigns(status = "") {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  const query = params.toString();
  const path = query ? `/admin/campaigns?${query}` : "/admin/campaigns";

  return request(path);
}

// Fetch approved products that can be used to create campaigns.
export function getApprovedProducts() {
  return request("/admin/products?status=approved");
}

// Create a new campaign draft.
export function createCampaign(data) {
  return request("/admin/campaigns", {
    method: "POST",
    body: data,
  });
}

// Update an existing draft campaign.
export function updateCampaign(campaignId, data) {
  return request(`/admin/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "PATCH",
    body: data,
  });
}

// Activate a draft campaign.
export function activateCampaign(campaignId) {
  return request(
    `/admin/campaigns/${encodeURIComponent(campaignId)}/activate`,
    {
      method: "POST",
    },
  );
}

// Cancel a draft or eligible active campaign.
export function cancelCampaign(campaignId) {
  return request(`/admin/campaigns/${encodeURIComponent(campaignId)}/cancel`, {
    method: "POST",
  });
}

// Close an active campaign and retrieve its outcome.
export function closeCampaign(campaignId) {
  return request(`/admin/campaigns/${encodeURIComponent(campaignId)}/close`, {
    method: "POST",
  });
}
