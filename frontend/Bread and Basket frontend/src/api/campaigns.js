import { request } from "./client";
import * as mockCampaigns from "../mocks/campaigns";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export function listCampaigns() {
  return USE_MOCKS ? mockCampaigns.listCampaigns() : request("/campaigns");
}
