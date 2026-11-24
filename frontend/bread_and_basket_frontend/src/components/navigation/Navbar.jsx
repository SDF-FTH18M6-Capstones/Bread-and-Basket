import { useContext, useEffect, useState } from "react";
import {
  NavLink,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { LogOut, ShoppingBasket } from "lucide-react";
import { AuthContext } from "../../features/auth/authContext";
import { getLinksForRole } from "../../lib/navConfig";
import SearchInput from "../ui/SearchInput";

const HOME = { consumer: "/shop", seller: "/seller", admin: "/admin" };

function Brand({ to, role, dark = false }) {
  return (
    <Link
      to={to}
      className="flex shrink-0 items-center gap-2.5 no-underline"
      aria-label="Bread & Basket home"
    >
      <span
        className={`flex size-9 items-center justify-center rounded-full ${
          dark ? "bg-lime text-forest" : "bg-forest text-lime"
        }`}
      >
        <ShoppingBasket size={20} aria-hidden="true" />
      </span>
      {/* Name only from tablet size up; phones show just the logo */}
      <span className="hidden flex-col leading-tight md:flex">
        <span
          className={`text-lg font-bold ${dark ? "text-white" : "text-forest"}`}
        >
          Bread &amp; Basket
        </span>
        {role && <span className="text-[11px] text-lime">{role}</span>}
      </span>
    </Link>
  );
}

function LogoutButton({ onClick, dark = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Log out"
      title="Log out"
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition ${
        dark
          ? "border-white/40 text-white hover:bg-white/10"
          : "border-line text-ink-2 hover:bg-canvas"
      }`}
    >
      <LogOut size={15} aria-hidden="true" />
      <span className="hidden md:inline">Log out</span>
    </button>
  );
}

export default function Navbar() {
  // All hooks first: hooks must run in the same order on every render
  const { user, logout } = useContext(AuthContext) ?? {};
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // Follow the URL when it changes from elsewhere (Clear filters, leaving Browse)
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const links = getLinksForRole(user?.role).filter(
    (link) => link.enabled !== false,
  );
  const home = HOME[user?.role] ?? "/";
  const onBrowse = pathname === "/browse";

  // Typing anywhere takes you to Browse with the search already applied
  function handleSearchChange(value) {
    setQuery(value);
    if (!onBrowse && value.trim() === "") return; // nothing typed yet: stay put

    const url = value ? `/browse?q=${encodeURIComponent(value)}` : "/browse";
    // From another page: a new history entry, so Back returns there.
    // On Browse: replace, so each letter doesn't become its own Back step.
    navigate(url, { replace: onBrowse });
  }

  // Admin: slim dark header on phones only (the sidebar covers desktop)
  if (user?.role === "admin") {
    return (
      <header className="flex h-14 items-center justify-between gap-3 bg-forest-deep px-4 min-[900px]:hidden">
        <Brand to={home} role="Admin" dark />
        <LogoutButton onClick={logout} dark />
      </header>
    );
  }

  return (
    <header className="sticky w-full top-0 z-[100] border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 md:gap-6">
        <Brand to={home} />

        {/* Desktop links; phones use the bottom tabs */}
        <nav className="hidden flex-1 gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm no-underline transition ${
                  isActive
                    ? "bg-lime-soft font-semibold text-forest"
                    : "text-ink-2 hover:bg-canvas"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Search: shoppers only, on every screen size */}
        {user?.role === "consumer" && (
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="min-w-0 flex-1 md:w-64 md:flex-none"
          >
            <SearchInput
              id="nav-search"
              value={query}
              onChange={handleSearchChange}
            />
          </form>
        )}

        {user && (
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <span className="hidden text-sm text-muted lg:inline">
              {user.full_name ?? user.email}
            </span>
            <LogoutButton onClick={logout} />
          </div>
        )}
      </div>
    </header>
  );
}
