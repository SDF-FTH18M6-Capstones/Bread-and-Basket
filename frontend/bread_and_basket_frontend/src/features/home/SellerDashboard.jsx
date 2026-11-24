import { Link } from 'react-router-dom';
import { endpoints, routes } from './adapters';
import {
  PRODUCT_STATUSES,
  fulfillingCampaigns,
  productCountsByStatus,
  rejectedProducts,
  totalUnitsToSupply,
} from './selectors';
import { Card, Empty, LoadError, Loading } from './ui';
import { useDashboardData } from './useDashboardData';
const STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
export function SellerDashboard({ client }) {
  const state = useDashboardData(client, {
    products: endpoints.sellerProducts,
    campaigns: endpoints.sellerCampaigns,
  });
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <LoadError retry={state.retry} />;
  const products = state.data.products;
  const campaigns = state.data.campaigns;
  const counts = productCountsByStatus(products);
  const rejected = rejectedProducts(products);
  const fulfilling = fulfillingCampaigns(campaigns);
  return (
    <div className="home">
      <h1>Your dashboard</h1>

      <Card title="Products" count={products.length} to={routes.sellerProducts}>
        <dl className="home-stats">
          {PRODUCT_STATUSES.map((s) => (
            <div key={s}>
              <dt>{STATUS_LABEL[s]}</dt>
              <dd>{counts[s]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Rejected products" count={rejected.length}>
        {rejected.length === 0 ? (
          <Empty>No rejected products.</Empty>
        ) : (
          <ul>
            {rejected.map((p) => (
              <li key={p.id}>
                <Link to={routes.sellerProduct(p.id)}>{p.name}</Link>
                <p className="home-reason">{p.rejectionReason?.trim() || 'No reason given.'}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Campaigns to fulfil" count={fulfilling.length}>
        {fulfilling.length === 0 ? (
          <Empty>No campaigns waiting on you.</Empty>
        ) : (
          <>
            <p>{totalUnitsToSupply(campaigns)} units to supply in total</p>
            <ul>
              {fulfilling.map((c) => (
                <li key={c.id}>
                  <Link to={routes.sellerCampaign(c.id)}>{c.productName}</Link>: {c.unitsCommitted} units
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}