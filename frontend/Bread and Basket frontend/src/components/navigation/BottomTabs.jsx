import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../features/auth/authContext";
import { getLinksForRole } from "../../lib/navConfig";

export default function BottomTabs() {
  const { user } = useContext(AuthContext) ?? {};
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const links = getLinksForRole(user.role).filter(
    (link) => link.enabled !== false,
  );

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed inset-x-0 bottom-0 z-[100] flex border-t border-line bg-white
        px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))]
        ${isAdmin ? "min-[900px]:hidden" : "md:hidden"}`}
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-1 text-[11px] no-underline
              ${isActive ? "font-bold text-forest" : "font-medium text-muted"}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`flex h-[30px] w-11 items-center justify-center rounded-full transition-colors
                    ${isActive ? "bg-lime" : ""}`}
                >
                  {Icon && <Icon size={22} strokeWidth={2} />}
                </span>
                <span className="max-w-full truncate">
                  {link.mobileLabel ?? link.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
