import { NavLink, Outlet } from "react-router-dom";
import { LogOut, ShoppingBasket } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/navigation/Navbar";
import BottomTabs from "./components/navigation/BottomTabs";
import { getLinksForRole } from "./lib/navConfig";

// Per-role sidebar settings. `show` = from which width the sidebar replaces the top bar
const SIDEBAR = {
  seller: {
    home: "/seller",
    subtitle: "Wholesaler Centre",
    show: "lg:flex",
    dark: false,
  },
  admin: {
    home: "/admin",
    subtitle: "Platform admin",
    show: "min-[900px]:flex",
    dark: true,
  },
};

function Sidebar({ role, user, logout }) {
  const { home, subtitle, show, dark } = SIDEBAR[role];
  const links = getLinksForRole(role).filter((link) => link.enabled !== false);

  return (
    <aside
      className={`sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start ${show} ${
        dark
          ? "bg-forest-deep text-white"
          : "border-r border-line bg-white text-ink"
      }`}
    >
      {/* Brand */}
      <NavLink
        to={home}
        className="flex items-center gap-3 px-6 py-6 no-underline"
      >
        <span
          className={`flex size-10 items-center justify-center rounded-full ${
            dark ? "bg-lime text-forest" : "bg-forest text-lime"
          }`}
        >
          <ShoppingBasket size={20} aria-hidden="true" />
        </span>
        <span className="flex flex-col leading-tight">
          <span
            className={`text-lg font-extrabold ${dark ? "text-white" : "text-forest"}`}
          >
            Bread &amp; Basket
          </span>
          <span className={`text-xs ${dark ? "text-lime" : "text-muted"}`}>
            {subtitle}
          </span>
        </span>
      </NavLink>

      {/* Links */}
      <nav
        aria-label={`${role} navigation`}
        className="flex flex-col gap-1 px-3 pt-2"
      >
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold no-underline transition ${
                  isActive
                    ? dark
                      ? "bg-lime text-forest"
                      : "bg-lime-soft text-forest"
                    : dark
                      ? "text-white/80 hover:bg-white/10"
                      : "text-ink-2 hover:bg-grey-soft"
                }`
              }
            >
              {Icon && <Icon size={19} aria-hidden="true" />}
              <span className="truncate">
                {link.desktopLabel ?? link.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Account + log out */}
      <div
        className={`mt-auto border-t p-5 ${dark ? "border-white/15" : "border-line"}`}
      >
        <p
          className={`truncate text-sm font-bold ${dark ? "text-white" : "text-ink"}`}
        >
          {user?.full_name || "Account"}
        </p>
        <p
          className={`truncate text-xs ${dark ? "text-white/60" : "text-muted"}`}
        >
          {user?.email}
        </p>
        <button
          type="button"
          onClick={logout}
          className={`mt-4 flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
            dark
              ? "border-white/25 text-white hover:bg-white/10"
              : "border-line text-ink-2 hover:bg-grey-soft"
          }`}
        >
          <LogOut size={16} aria-hidden="true" /> Log out
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const role = user?.role;

  // Admin and wholesaler: sidebar on wide screens, top bar + bottom tabs on narrow ones
  if (role === "admin" || role === "seller") {
    const isAdmin = role === "admin";

    return (
      <div className="flex min-h-screen bg-canvas">
        <Sidebar role={role} user={user} logout={logout} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={isAdmin ? "min-[900px]:hidden" : "lg:hidden"}>
            <Navbar />
          </div>

          {/* Bottom space so the fixed tab bar never covers the end of a page */}
          <div
            className={`min-w-0 flex-1 ${isAdmin ? "pb-24 min-[900px]:pb-0" : "pb-24 md:pb-0"}`}
          >
            <Outlet />
          </div>

          <BottomTabs />
        </div>
      </div>
    );
  }

  // Shoppers: top bar + bottom tabs
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <div className="pb-24 md:pb-0">
        <Outlet />
      </div>
      <BottomTabs />
    </div>
  );
}
