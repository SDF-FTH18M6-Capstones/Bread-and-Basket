export const NAV_LINKS = {
  consumer: [
    { to: "/shop", label: "Shop" },
    { to: "/browse", label: "Browse" },
    { to: "/orders", label: "Orders" },
    { to: "/profile", label: "Profile" },
  ],

  seller: [{ to: "/seller", label: "Products" }],

  admin: [
    { label: "Dashboard", enabled: false },
    { to: "/admin", label: "Approvals", enabled: true },
    { label: "Campaigns", enabled: false },
    { label: "Orders & payments", enabled: false },
    { label: "Notifications", enabled: false },
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
