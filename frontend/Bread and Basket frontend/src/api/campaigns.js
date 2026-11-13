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
