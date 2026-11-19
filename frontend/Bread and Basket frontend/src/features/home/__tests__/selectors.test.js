import {
  campaignsReadyToClose,
  campaignsReadyToFulfil,
  fulfillingCampaigns,
  pendingCount,
  productCountsByStatus,
  rejectedProducts,
  totalUnitsToSupply,
} from '../selectors';
const product = (id, status, rejectionReason) => ({
  id,
  name: `P${id}`,
  status,
  rejectionReason,
});
const campaign = (id, status, deadline, unitsCommitted = 0) => ({
  id,
  productName: `C${id}`,
  status,
  deadline,
  unitsCommitted,
});
describe('seller selectors', () => {
  const products = [
    product('1', 'APPROVED'),
    product('2', 'PENDING'),
    product('3', 'REJECTED', 'Blurry photo'),
    product('4', 'APPROVED'),
  ];
  it('counts products by status, including zeros', () => {
    expect(productCountsByStatus(products)).toEqual({ DRAFT: 0, PENDING: 1, APPROVED: 2, REJECTED: 1 });
    expect(productCountsByStatus([])).toEqual({ DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 });
  });
  it('lists rejected products with their reason', () => {
    expect(rejectedProducts(products)).toEqual([product('3', 'REJECTED', 'Blurry photo')]);
  });
  it('lists fulfilling campaigns and sums units to supply', () => {
    const cs = [
      campaign('a', 'FULFILLING', '2026-01-01', 40),
      campaign('b', 'ACTIVE', '2026-12-01', 99),
      campaign('c', 'FULFILLING', '2026-01-01', 10),
    ];
    expect(fulfillingCampaigns(cs).map((c) => c.id)).toEqual(['a', 'c']);
    expect(totalUnitsToSupply(cs)).toBe(50);
  });
});
describe('admin selectors', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  it('counts pending sellers and products', () => {
    const sellers = [
      { id: '1', businessName: 'A', status: 'PENDING' },
      { id: '2', businessName: 'B', status: 'APPROVED' },
      { id: '3', businessName: 'C', status: 'PENDING' },
    ];
    expect(pendingCount(sellers)).toBe(2);
    expect(pendingCount([product('1', 'PENDING'), product('2', 'REJECTED')])).toBe(1);
  });
  it('ready to close = active and past deadline (deadline exactly now counts)', () => {
    const cs = [
      campaign('past', 'ACTIVE', '2026-11-18T12:00:00Z'),
      campaign('exact', 'ACTIVE', '2026-11-19T12:00:00Z'),
      campaign('future', 'ACTIVE', '2026-11-20T12:00:00Z'),
      campaign('pastButSuccessful', 'SUCCESSFUL', '2026-11-01T00:00:00Z'),
    ];
    expect(campaignsReadyToClose(cs, now).map((c) => c.id)).toEqual(['past', 'exact']);
  });
  it('ready to fulfil = successful', () => {
    const cs = [
      campaign('s', 'SUCCESSFUL', '2026-11-01'),
      campaign('f', 'FAILED', '2026-11-01'),
      campaign('x', 'FULFILLING', '2026-11-01'),
    ];
    expect(campaignsReadyToFulfil(cs).map((c) => c.id)).toEqual(['s']);
  });
});