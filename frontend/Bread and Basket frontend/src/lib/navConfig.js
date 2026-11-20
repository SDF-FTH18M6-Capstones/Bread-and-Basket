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
    {
      to: "/admin",
      label: "Dashboard",
      desktopLabel: "Dashboard",
      mobileLabel: "Dashboard",
      enabled: true,
    },
    {
      to: "/admin/approvals",
      label: "Approvals",
      desktopLabel: "Approvals",
      mobileLabel: "Approvals",
      enabled: true,
    },
    {
      to: "/admin/campaigns",
      label: "Campaigns",
      desktopLabel: "Campaigns",
      mobileLabel: "Campaigns",
      enabled: true,
    },
    {
      to: "/admin/orders",
      label: "Payments",
      desktopLabel: "Orders & payments",
      mobileLabel: "Payments",
      enabled: true,
    },
    {
      label: "Alerts",
      desktopLabel: "Notifications",
      mobileLabel: "Alerts",
      enabled: false,
    },
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
  const normalizedRole = role?.toLowerCase();
  const key = ROLE_ALIASES[normalizedRole] ?? normalizedRole;

  return NAV_LINKS[key] ?? [];
}
