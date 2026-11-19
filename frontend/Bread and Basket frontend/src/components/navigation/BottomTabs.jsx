import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../features/auth/authContext";
import { getLinksForRole } from "../../lib/navConfig";
import "./Navigation.css";

export default function BottomTabs() {
  const { user } = useContext(AuthContext) ?? {};
  const links = getLinksForRole(user?.role) ?? [];

  if (user?.role === "admin") {
    return (
      <nav className="admin-bottom-tabs" aria-label="Admin navigation">
        {links.map((link) =>
          link.enabled ? (
            <NavLink
              key={link.label}
              to={link.to}
              end
              className={({ isActive }) =>
                `admin-bottom-tabs__tab${isActive ? " is-active" : ""}`
              }
            >
              {link.mobileLabel ?? link.label}
            </NavLink>
          ) : (
            <span
              key={link.label}
              className="admin-bottom-tabs__tab admin-bottom-tabs__tab--disabled"
              aria-disabled="true"
            >
              {link.mobileLabel ?? link.label}
            </span>
          ),
        )}
      </nav>
    );
  }

  return (
    <nav className="bottom-tabs">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            `bottom-tabs__tab${isActive ? " is-active" : ""}`
          }
        >
          <span className="bottom-tabs__icon" aria-hidden="true">
            {link.icon}
          </span>

          <span className="bottom-tabs__label">{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
