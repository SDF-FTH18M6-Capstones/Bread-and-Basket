import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../features/auth/authContext";
import { getLinksForRole } from "../../lib/navConfig";
import "./Navigation.css";

// Mobile bottom tab bar. Hidden on desktop.
export default function BottomTabs() {
  const { user } = useContext(AuthContext) ?? {};
  const links = getLinksForRole(user?.role);

  return (
    <nav className="bottom-tabs">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) => `bottom-tabs__tab${isActive ? " is-active" : ""}`}
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