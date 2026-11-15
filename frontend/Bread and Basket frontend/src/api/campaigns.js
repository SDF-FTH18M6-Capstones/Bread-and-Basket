import { request } from "./client";
import * as mockCampaigns from "../mocks/campaigns";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export async function listCampaigns(filters = {}) {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.filter) {
    params.set("filter", filters.filter);
  }

  const query = params.toString();
  const path = query ? `/campaigns?${query}` : "/campaigns";

  return USE_MOCKS ? mockCampaigns.listCampaigns(filters) : request(path);
}

export async function getCampaign(campaignId) {
  if (USE_MOCKS) {
    const campaigns = await mockCampaigns.listCampaigns();

    const campaign = campaigns.find(
      (item) => String(item.id) === String(campaignId),
    );

    if (!campaign) {
      throw new Error("Campaign not found.");
    }

    return campaign;
  }

  return request(`/campaigns/${encodeURIComponent(campaignId)}`);
}
