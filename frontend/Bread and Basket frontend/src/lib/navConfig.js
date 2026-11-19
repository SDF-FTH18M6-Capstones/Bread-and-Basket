
export const NAV_LINKS = {
  consumer: [
    { to: "/shop", label: "Shop" },
    { to: "/browse", label: "Browse" },
    { to: "/orders", label: "Orders" },
    { to: "/profile", label: "Profile" },
  ],

  seller: [
    { to: "/seller", label: "Dashboard" },
    { to: "/seller/products", label: "Products" },
    { to: "/seller/campaigns", label: "Campaign Orders" },
    { to: "/seller/payouts", label: "Payouts" },
  ],

  admin: [
    { label: "Dashboard", enabled: false },
    { to: "/admin", label: "Approvals", enabled: true },
    { to: "/admin/campaigns", label: "Campaigns", enabled: true },
    { label: "Orders & payments", enabled: false },
    { label: "Notifications", enabled: false },
  ],
};

// Other names the backend might use for the same role.
const ROLE_ALIASES = {
  buyer: "consumer",
  customer: "consumer",
  shopper: "consumer",
  vendor: "seller",
  baker: "seller",
};

export function getLinksForRole(role) {
  const normalizedRole = role?.toLowerCase();
  const key = ROLE_ALIASES[normalizedRole] ?? normalizedRole;

  return NAV_LINKS[key] ?? [];
}
