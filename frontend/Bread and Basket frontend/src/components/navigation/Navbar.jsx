import { useContext } from "react";
import { NavLink, Link } from "react-router-dom";
import { AuthContext } from "../../features/auth/authContext";
import { getLinksForRole } from "../../lib/navConfig";
import "./Navigation.css";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext) ?? {};
  const links = getLinksForRole(user?.role);

  if (user?.role === "admin") {
    return (
      <header className="admin-mobile-navbar">
        <Link to="/admin" className="admin-mobile-navbar__brand">
          <span className="admin-mobile-navbar__name">Bread &amp; Basket</span>
          <span className="admin-mobile-navbar__role">Admin</span>
        </Link>

        <button
          type="button"
          className="admin-mobile-navbar__logout"
          onClick={logout}
        >
          Logout
        </button>
      </header>
    );
  }

  const homeLink =
    user?.role === "consumer"
      ? "/shop"
      : user?.role === "seller"
        ? "/seller"
        : "/";

  return (
    <header className="navbar">
      <Link to={homeLink} className="navbar__brand">
        🍞 Bread &amp; Basket
      </Link>

      <nav className="navbar__links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `navbar__link${isActive ? " is-active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="navbar__user">
          <span className="navbar__name">{user.full_name ?? user.email}</span>
          <button type="button" className="navbar__logout" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
