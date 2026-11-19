// ---------- Wholesaler ----------
export const PRODUCT_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];
export function productCountsByStatus(products) {
  const counts = Object.fromEntries(PRODUCT_STATUSES.map((s) => [s, 0]));
  for (const p of products) counts[p.status] = (counts[p.status] ?? 0) + 1;
  return counts;
}
export function rejectedProducts(products) {
  return products.filter((p) => p.status === 'REJECTED');
}
export function fulfillingCampaigns(campaigns) {
  return campaigns.filter((c) => c.status === 'FULFILLING');
}
export function totalUnitsToSupply(campaigns) {
  return fulfillingCampaigns(campaigns).reduce((sum, c) => sum + c.unitsCommitted, 0);
}
// ---------- Admin ----------
export function pendingCount(items) {
  return items.filter((i) => i.status === 'PENDING').length;
}
/** Active campaigns whose deadline has passed: the admin should close them. */
export function campaignsReadyToClose(campaigns, now = new Date()) {
  return campaigns.filter((c) => c.status === 'ACTIVE' && new Date(c.deadline).getTime() <= now.getTime());
}
/** Successful campaigns: the admin should start fulfilment. */
export function campaignsReadyToFulfil(campaigns) {
  return campaigns.filter((c) => c.status === 'SUCCESSFUL');
}