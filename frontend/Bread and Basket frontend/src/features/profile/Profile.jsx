import { useContext, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { AuthContext } from "../../features/auth/authContext";
import { getMe } from "../../api/auth";

const ROLE_LABELS = {
  consumer: "Shopper",
  seller: "Wholesaler",
  admin: "Admin",
};

const STATUS = {
  pending: {
    label: "Waiting for approval",
    className: "bg-orange-soft text-orange-text",
  },
  approved: { label: "Approved", className: "bg-lime-soft text-forest" },
  rejected: { label: "Rejected", className: "bg-bad-soft text-bad" },
};

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

// One label + value row
function Detail({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line py-3 first:border-t-0 sm:flex-row sm:justify-between sm:gap-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words font-medium sm:text-right">
        {children}
      </dd>
    </div>
  );
}

export default function Profile() {
  const { user: savedUser, logout } = useContext(AuthContext) ?? {};
  const [freshUser, setFreshUser] = useState(null);
  const [error, setError] = useState("");

  // Saved login data shows at once; /me replaces it with the latest
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) setFreshUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const user = freshUser ?? savedUser;
  if (!user) return null; // logged out: the redirect is on its way

  const seller = user.seller;
  const status = seller ? STATUS[seller.verification_status] : null;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-12 py-5">
      <h1 className="text-[26px] font-bold tracking-tight">Profile</h1>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          Showing your saved details. {error}
        </p>
      )}

      {/* Personal information */}
      <section className="mt-5 rounded-[20px] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lime text-lg font-extrabold text-forest"
          >
            {initials(user.full_name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{user.full_name}</h2>
            <span className="mt-1 inline-flex rounded-full bg-grey-soft px-2.5 py-0.5 text-xs font-semibold text-ink-2">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-muted">
          Personal information
        </h3>
        <dl className="mt-1">
          <Detail label="Email">{user.email}</Detail>
          <Detail label="Phone">{user.phone || "Not added"}</Detail>
        </dl>
      </section>

      {/* Business details: wholesalers only */}
      {seller && (
        <section className="mt-4 rounded-[20px] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Business details</h3>
            {status && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
            )}
          </div>

          {seller.verification_status === "pending" && (
            <p className="mt-3 rounded-xl bg-orange-soft px-4 py-3 text-sm text-orange-text">
              An admin is reviewing your business. You can submit products once
              you're approved.
            </p>
          )}

          {seller.verification_status === "rejected" &&
            seller.rejection_reason && (
              <p className="mt-3 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
                <span className="font-semibold">Reason: </span>
                {seller.rejection_reason}
              </p>
            )}

          <dl className="mt-2">
            <Detail label="Business name">{seller.business_name}</Detail>
            <Detail label="Business address">{seller.business_address}</Detail>
          </dl>
        </section>
      )}

      <button
        type="button"
        onClick={logout}
        className="mt-6 mb-8 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white py-3 font-semibold text-bad transition hover:bg-bad-soft sm:w-auto sm:px-6"
      >
        <LogOut size={18} aria-hidden="true" /> Log out
      </button>
    </main>
  );
}
