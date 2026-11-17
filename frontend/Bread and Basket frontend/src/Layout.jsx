import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/navigation/Navbar";
import BottomTabs from "./components/navigation/BottomTabs";
import { getLinksForRole } from "./lib/navConfig";

function SellerSidebar({ user, logout }) {
  const links = getLinksForRole("seller");

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white lg:flex">
      <div className="border-b border-line px-6 py-7">
        <NavLink to="/seller" className="flex items-center">
          <span className="text-lg font-extrabold text-forest">
            Bread & Basket
          </span>
        </NavLink>
        <p className="mt-1 text-xs text-muted">Wholesaler Centre</p>
      </div>

      <div className="px-4 py-6">
        <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-muted">
          Seller menu
        </p>

        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/seller"}
              className={({ isActive }) =>
                `flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-lime-soft text-forest"
                    : "text-ink-2 hover:bg-grey-soft"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-line p-5">
        <div className="mb-4">
          <p className="truncate text-sm font-bold text-ink">
            {user?.full_name || "Wholesaler"}
          </p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-line px-4 py-3 text-left text-sm font-semibold text-ink-2 transition hover:bg-grey-soft"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const isSeller = user?.role === "seller";

  if (isSeller) {
    return (
      <div className="flex min-h-screen bg-canvas">
        <SellerSidebar user={user} logout={logout} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="lg:hidden">
            <Navbar />
          </div>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>

          <BottomTabs />
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <BottomTabs />
    </>
  );
}
