import { fetchClient } from './adapters';
import { AdminDashboard } from './AdminDashboard';
import { SellerDashboard } from './SellerDashboard';
/**
 * Accepts "seller"/"wholesaler" and "admin" in any letter case.
 * Everyone else gets `consumerFallback`.
 */
export function HomePage({ role, client = fetchClient, consumerFallback = null }) {
  const r = String(role ?? '').toLowerCase();
  if (r === 'seller' || r === 'wholesaler') return <SellerDashboard client={client} />;
  if (r === 'admin') return <AdminDashboard client={client} />;
  return <>{consumerFallback}</>;
}