// One place to define every role's bar.

export const NAV_LINKS = {
  guest: [
    { to: "/", label: "Home", icon: "🏠" },
  ],
  consumer: [
    { to: "/", label: "Home", icon: "🏠" },
    { to: "/shop", label: "Shop", icon: "🧺" },
    { to: "/orders", label: "Orders", icon: "📦" },
    { to: "/profile", label: "Profile", icon: "👤" },
  ],
  seller: [
    { to: "/seller", label: "Dashboard", icon: "📊" },
    { to: "/seller/campaigns", label: "My Campaigns", icon: "🧺" },
    { to: "/seller/orders", label: "Orders", icon: "📦" },
    { to: "/profile", label: "Profile", icon: "👤" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "📊" },
    { to: "/admin/users", label: "Users", icon: "👥" },
    { to: "/admin/campaigns", label: "Campaigns", icon: "🧺" },
    { to: "/admin/reports", label: "Reports", icon: "📈" },
  ],
};

// Other names the backend might use for the same role
const ROLE_ALIASES = {
  buyer: "consumer",
  customer: "consumer",
  shopper: "consumer",
  vendor: "seller",
  baker: "seller",
};

export function getLinksForRole(role) {
  const key = ROLE_ALIASES[role?.toLowerCase()] ?? role?.toLowerCase();
  return NAV_LINKS[key] ?? NAV_LINKS.guest;
}