import { Link } from 'react-router-dom';
import { endpoints, routes } from './adapters';
import { campaignsReadyToClose, campaignsReadyToFulfil, pendingCount } from './selectors';
import { Card, Empty, LoadError, Loading } from './ui';
import { useDashboardData } from './useDashboardData';
export function AdminDashboard({ client, now = new Date() }) {
  const state = useDashboardData(client, {
    sellers: endpoints.adminSellers,
    products: endpoints.adminProducts,
    campaigns: endpoints.adminCampaigns,
  });
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError retry={state.retry} />;
  const sellers = state.data.sellers;
  const products = state.data.products;
  const campaigns = state.data.campaigns;
  const toClose = campaignsReadyToClose(campaigns, now);
  const toFulfil = campaignsReadyToFulfil(campaigns);
  return (
    <div className="home">
      <h1>Admin dashboard</h1>

      <Card title="Sellers awaiting approval" count={pendingCount(sellers)} to={routes.adminSellers} />
      <Card title="Products awaiting approval" count={pendingCount(products)} to={routes.adminProducts} />

      <Card title="Ready to close" count={toClose.length} to={routes.adminCampaignsToClose}>
        {toClose.length === 0 ? (
          <Empty>No active campaigns past their deadline.</Empty>
        ) : (
          <CampaignList items={toClose} />
        )}
      </Card>

      <Card title="Ready to fulfil" count={toFulfil.length} to={routes.adminCampaignsToFulfil}>
        {toFulfil.length === 0 ? (
          <Empty>No successful campaigns waiting.</Empty>
        ) : (
          <CampaignList items={toFulfil} />
        )}
      </Card>
    </div>
  );
}
function CampaignList({ items }) {
  return (
    <ul>
      {items.map((c) => (
        <li key={c.id}>
          <Link to={routes.adminCampaign(c.id)}>{c.productName}</Link>
        </li>
      ))}
    </ul>
  );
}