import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { endpoints, routes } from '../adapters';
import { HomePage } from '../HomePage';
function fakeClient(data, failOnce = []) {
  const calls = [];
  const failing = new Set(failOnce);
  return {
    calls,
    async get(path) {
      calls.push(path);
      if (failing.delete(path)) throw new Error('boom');
      return data[path] ?? [];
    },
  };
}
const renderHome = (role, client) =>
  render(
    <MemoryRouter>
      <HomePage role={role} client={client} consumerFallback={<p>consumer home</p>} />
    </MemoryRouter>,
  );
describe('SellerDashboard', () => {
  const client = () =>
    fakeClient({
      [endpoints.sellerProducts]: [
        { id: '1', name: 'Maize flour 2kg', status: 'APPROVED' },
        { id: '2', name: 'Cooking oil 5L', status: 'REJECTED', rejectionReason: 'Price missing' },
        { id: '3', name: 'Rice 1kg', status: 'PENDING' },
      ],
      [endpoints.sellerCampaigns]: [
        {
          id: 'c1',
          productName: 'Maize flour 2kg',
          status: 'FULFILLING',
          deadline: '2026-11-01',
          unitsCommitted: 120,
        },
        { id: 'c2', productName: 'Rice 1kg', status: 'ACTIVE', deadline: '2026-12-01', unitsCommitted: 30 },
      ],
    });
  it('shows status counts, rejected reasons and units to supply', async () => {
    const c = client();
    renderHome('WHOLESALER', c);
    const products = await screen.findByRole('region', { name: 'Products' });
    expect(within(products).getByText('Approved').nextSibling?.textContent).toBe('1');
    expect(within(products).getByText('Draft').nextSibling?.textContent).toBe('0');
    const rejected = screen.getByRole('region', { name: 'Rejected products' });
    expect(within(rejected).getByText('Price missing')).toBeTruthy();
    expect(within(rejected).getByRole('link', { name: 'Cooking oil 5L' }).getAttribute('href')).toBe(
      routes.sellerProduct('2'),
    );
    const fulfil = screen.getByRole('region', { name: 'Campaigns to fulfil' });
    expect(within(fulfil).getByText('120 units to supply in total')).toBeTruthy();
    expect(within(fulfil).queryByText('Rice 1kg')).toBeNull();
    expect(c.calls.sort()).toEqual([endpoints.sellerCampaigns, endpoints.sellerProducts].sort());
  });
  it('shows an error with Retry when a request fails, then recovers', async () => {
    const c = fakeClient({ [endpoints.sellerProducts]: [], [endpoints.sellerCampaigns]: [] }, [
      endpoints.sellerCampaigns,
    ]);
    renderHome('WHOLESALER', c);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No rejected products.')).toBeTruthy();
  });
});
describe('AdminDashboard', () => {
  it('shows pending counts and campaigns to close/fulfil, each linking to its screen', async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const c = fakeClient({
      [endpoints.adminSellers]: [
        { id: 's1', businessName: 'A', status: 'PENDING' },
        { id: 's2', businessName: 'B', status: 'APPROVED' },
      ],
      [endpoints.adminProducts]: [
        { id: 'p1', name: 'X', status: 'PENDING' },
        { id: 'p2', name: 'Y', status: 'PENDING' },
      ],
      [endpoints.adminCampaigns]: [
        { id: 'c1', productName: 'Sugar 2kg', status: 'ACTIVE', deadline: past, unitsCommitted: 0 },
        { id: 'c2', productName: 'Beans 1kg', status: 'ACTIVE', deadline: future, unitsCommitted: 0 },
        { id: 'c3', productName: 'Tea 500g', status: 'SUCCESSFUL', deadline: past, unitsCommitted: 0 },
      ],
    });
    renderHome('ADMIN', c);
    const sellers = await screen.findByRole('region', { name: 'Sellers awaiting approval' });
    expect(within(sellers).getByRole('link').textContent).toContain('1');
    expect(within(sellers).getByRole('link').getAttribute('href')).toBe(routes.adminSellers);
    const products = screen.getByRole('region', { name: 'Products awaiting approval' });
    expect(within(products).getByRole('link').textContent).toContain('2');
    const toClose = screen.getByRole('region', { name: 'Ready to close' });
    expect(within(toClose).getByRole('link', { name: 'Sugar 2kg' }).getAttribute('href')).toBe(
      routes.adminCampaign('c1'),
    );
    expect(within(toClose).queryByText('Beans 1kg')).toBeNull();
    const toFulfil = screen.getByRole('region', { name: 'Ready to fulfil' });
    expect(within(toFulfil).getByRole('link', { name: 'Tea 500g' })).toBeTruthy();
  });
});
it('renders the consumer fallback and fetches nothing for consumers', () => {
  const c = fakeClient({});
  renderHome('CONSUMER', c);
  expect(screen.getByText('consumer home')).toBeTruthy();
  expect(c.calls).toEqual([]);
});