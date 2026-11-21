// Icons are stored as components (no quotes, no < />).
// In the nav: const Icon = link.icon; then <Icon size={22} />.
// Older lucide-react versions call these Home, BarChart3 and CheckSquare.
import {
  House,
  LayoutGrid,
  Receipt,
  User,
  ChartColumn,
  Package,
  Truck,
  Wallet,
  SquareCheck,
  Megaphone,
} from "lucide-react";

export const NAV_LINKS = {
  consumer: [
    { to: "/shop", label: "Shop", icon: House },
    { to: "/browse", label: "Browse", icon: LayoutGrid },
    { to: "/orders", label: "Orders", icon: Receipt },
    { to: "/profile", label: "Profile", icon: User },
  ],

  seller: [
    { to: "/seller", label: "Dashboard", icon: ChartColumn, end: true },
    { to: "/seller/products", label: "Products", icon: Package },
    { to: "/seller/campaigns", label: "Orders", icon: Truck },
    { to: "/seller/payouts", label: "Earnings", icon: Wallet },
    { to: "/seller/profile", label: "Profile", icon: User },
  ],

  admin: [
    {
      to: "/admin",
      label: "Dashboard",
      desktopLabel: "Dashboard",
      mobileLabel: "Dashboard",
      enabled: true,
      icon: ChartColumn,
      end: true,
    },
    {
      to: "/admin/approvals",
      label: "Approvals",
      desktopLabel: "Approvals",
      mobileLabel: "Approvals",
      enabled: true,
      icon: SquareCheck,
    },
    {
      to: "/admin/campaigns",
      label: "Campaigns",
      desktopLabel: "Campaigns",
      mobileLabel: "Campaigns",
      enabled: true,
      icon: Megaphone,
    },
    {
      to: "/admin/orders",
      label: "Payments",
      desktopLabel: "Orders & payments",
      mobileLabel: "Payments",
      enabled: true,
      icon: Wallet,
    },

    {
      to: "/admin/profile",
      label: "Profile",
      desktopLabel: "Profile",
      mobileLabel: "Profile",
      enabled: true,
      icon: User,
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
