import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronRight, Plus } from "lucide-react";
import { getSellerProducts } from "../../api/sellerProducts";
import { request } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import CampaignCard from "../shop/CampaignCard"; // adjust to where CampaignCard lives
import { productImage } from "../../lib/productImages";

const VERIFICATION = {
  approved: { label: "Verified", className: "bg-lime-soft text-forest" },
  pending: {
    label: "Verification pending",
    className: "bg-orange-soft text-orange-text",
  },
  rejected: { label: "Not approved", className: "bg-bad-soft text-bad" },
};

const SUPPLYING = ["successful", "fulfilling"];

const TILE = {
  plain: { box: "bg-white text-ink", label: "text-muted", value: "text-ink" },
  dark: {
    box: "bg-forest text-white",
    label: "text-white/75",
    value: "text-lime",
  },
  hot: { box: "bg-orange text-ink", label: "text-ink/80", value: "text-ink" },
};

function Stat({ label, value, hint, tone = "plain" }) {
  const t = TILE[tone];
  return (
    <div className={`rounded-[18px] p-5 ${t.box}`}>
      <p className={`text-sm ${t.label}`}>{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${t.value}`}>
        {value}
      </p>
      {hint && <p className={`mt-1 text-xs ${t.label}`}>{hint}</p>}
    </div>
  );
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0); // bump it to load again

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([getSellerProducts(), request("/seller/campaigns")])
      .then(([productData, campaignData]) => {
        if (cancelled) return;
        setProducts(productData);
        setCampaigns(campaignData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Worked out from the raw data
  const live = campaigns.filter((c) => c.status === "active");
  const unitsLive = live.reduce((sum, c) => sum + (c.ordered_quantity || 0), 0);
  const supplying = campaigns.filter((c) => SUPPLYING.includes(c.status));
  const awaitingStock = supplying.filter((c) => !c.stock_confirmed_at);
  const pendingProducts = products.filter(
    (p) => p.approval_status === "pending",
  );
  const rejectedProducts = products.filter(
    (p) => p.approval_status === "rejected",
  );

  const verificationStatus = user?.seller?.verification_status;
  const verification = VERIFICATION[verificationStatus];
  const approved = verificationStatus === "approved";
  const actionCount = rejectedProducts.length + awaitingStock.length;

  if (loading) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 md:px-8">
        <div aria-busy="true" aria-label="Loading" className="space-y-6">
          <div className="h-8 w-56 animate-pulse rounded bg-grey-soft" />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[18px] bg-grey-soft"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 md:px-8">
        <div role="alert" className="rounded-2xl bg-bad-soft p-6 text-center">
          <p className="font-semibold text-bad">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-4 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">Welcome back</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
              {user?.seller?.business_name || user?.full_name || "Wholesaler"}
            </h1>
            {verification && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${verification.className}`}
              >
                {approved && <CheckCircle2 size={13} aria-hidden="true" />}
                {verification.label}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/seller/products")}
          disabled={!approved}
          title={
            approved
              ? undefined
              : "You can add products once your business is approved"
          }
          className="flex items-center gap-1.5 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-forest transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} aria-hidden="true" /> Add product
        </button>
      </div>

      {/* Verification notice */}
      {!approved && verification && (
        <p
          className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            verificationStatus === "rejected"
              ? "bg-bad-soft text-bad"
              : "bg-orange-soft text-orange-text"
          }`}
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          {verificationStatus === "rejected"
            ? "Your business wasn't approved. Check your profile for the reason."
            : "An admin is reviewing your business. You can add products once you're approved."}
        </p>
      )}

      {/* Stats */}
      <section
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
        aria-label="Summary"
      >
        <Stat label="Live campaigns" value={live.length} tone="dark" />
        <Stat label="Units ordered (live)" value={unitsLive} />
        <Stat
          label="Waiting for your stock"
          value={awaitingStock.length}
          hint={
            awaitingStock.length ? "Confirm you can supply" : "All confirmed"
          }
          tone={awaitingStock.length ? "hot" : "plain"}
        />
        <Stat
          label="Awaiting approval"
          value={pendingProducts.length}
          hint={pendingProducts.length === 1 ? "product" : "products"}
        />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Live campaigns */}
        <section className="min-w-0 xl:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight">Live campaigns</h2>
            <Link
              to="/seller/campaigns"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-forest no-underline hover:underline"
            >
              Campaign orders <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {live.length === 0 ? (
            <div className="rounded-[18px] bg-white px-4 py-10 text-center">
              <p className="font-semibold">No live campaigns</p>
              <p className="mt-1 text-sm text-muted">
                When an admin opens a campaign for one of your products, it
                shows here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {live.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Needs your action */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold tracking-tight">
              Needs your action
              {actionCount > 0 && (
                <span className="rounded-full bg-orange px-2 text-xs font-extrabold text-ink">
                  {actionCount}
                </span>
              )}
            </h2>

            <div className="rounded-[18px] bg-white p-2">
              {actionCount === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  You're all caught up.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {awaitingStock.map((c) => (
                    <li key={`stock-${c.id}`}>
                      <Link
                        to="/seller/campaigns"
                        className="flex items-center gap-3 rounded-xl p-3 text-ink no-underline hover:bg-canvas"
                      >
                        <img
                          src={productImage(c.product)}
                          alt=""
                          className="size-11 shrink-0 rounded-lg bg-canvas object-contain p-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            Confirm stock: {c.title}
                          </span>
                          <span className="block text-xs text-muted">
                            {c.ordered_quantity} units ordered
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}

                  {rejectedProducts.map((p) => (
                    <li key={`product-${p.id}`}>
                      <Link
                        to="/seller/products"
                        className="flex items-center gap-3 rounded-xl p-3 text-ink no-underline hover:bg-canvas"
                      >
                        <img
                          src={productImage(p)}
                          alt=""
                          className="size-11 shrink-0 rounded-lg bg-canvas object-contain p-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            Fix and resubmit: {p.name}
                          </span>
                          <span className="block truncate text-xs text-bad">
                            {p.rejection_reason}
                          </span>
                        </span>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Supplying now */}
          {supplying.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold tracking-tight">
                Supplying now
              </h2>
              <ul className="divide-y divide-line rounded-[18px] bg-white p-2">
                {supplying.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-3">
                    <img
                      src={productImage(c.product)}
                      alt=""
                      className="size-11 shrink-0 rounded-lg bg-canvas object-contain p-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {c.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {c.ordered_quantity} units to supply
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        c.stock_confirmed_at
                          ? "bg-lime-soft text-forest"
                          : "bg-orange-soft text-orange-text"
                      }`}
                    >
                      {c.stock_confirmed_at
                        ? "Stock confirmed"
                        : "Not confirmed"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
