
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
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/campaigns", label: "Campaigns" },
    { to: "/admin/reports", label: "Reports" },
  ],
};

const ROLE_ALIASES = {
  buyer: "consumer",
  customer: "consumer",
  shopper: "consumer",
  vendor: "seller",
  baker: "seller",
};

export function getLinksForRole(role) {
  const key = ROLE_ALIASES[role?.toLowerCase()] ?? role?.toLowerCase();

  return NAV_LINKS[key] ?? [];
}
