/**
 * The ONLY file that encodes assumptions about the rest of the app.
 * Check against BB.11–BB.14 before merging.
 */
// ---------- Shapes we expect from the API ----------
// Product:  { id, name, status: 'DRAFT'|'PENDING'|'APPROVED'|'REJECTED', rejectionReason? }
// Campaign: { id, productName, status: 'ACTIVE'|'SUCCESSFUL'|'FAILED'|'FULFILLING'|'CLOSED',
//             deadline (ISO date string), unitsCommitted }
// Seller:   { id, businessName, status: 'PENDING'|'APPROVED'|'REJECTED' }

// ---------- Endpoints (relative to VITE_API_URL, e.g. http://localhost:5000/api) ----------
export const endpoints = {
  sellerProducts: '/seller/products',
  sellerCampaigns: '/seller/campaigns',
  adminSellers: '/admin/sellers',
  adminProducts: '/admin/products',
  adminCampaigns: '/admin/campaigns',
};

// ---------- Screens the home cards link to ----------
export const routes = {
  sellerProducts: '/seller/products',
  sellerProduct: (id) => `/seller/products/${id}`,
  sellerCampaign: (id) => `/seller/campaigns/${id}`,
  adminSellers: '/admin/sellers?status=PENDING',
  adminProducts: '/admin/products?status=PENDING',
  adminCampaignsToClose: '/admin/campaigns?view=ready-to-close',
  adminCampaignsToFulfil: '/admin/campaigns?view=ready-to-fulfil',
  adminCampaign: (id) => `/admin/campaigns/${id}`,
};

// ---------- API client ----------
const API_URL = (import.meta.env?.VITE_API_URL ?? '').replace(/\/$/, '');

function getToken() {
  try {
    for (const key of ['access_token', 'accessToken', 'token', 'jwt', 'authToken']) {
      const v = localStorage.getItem(key) ?? sessionStorage.getItem(key);
      if (v) return v.replace(/^"|"$/g, '');
    }
  } catch {
    /* storage not available */
  }
  return null;
}

/** Accepts a plain array or common wrappers like { items }, { data }, { results }. */
function toList(body) {
  if (Array.isArray(body)) return body;
  for (const key of ['items', 'data', 'results', 'products', 'campaigns', 'sellers']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

export const fetchClient = {
  async get(path) {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return toList(await res.json());
  },
};
