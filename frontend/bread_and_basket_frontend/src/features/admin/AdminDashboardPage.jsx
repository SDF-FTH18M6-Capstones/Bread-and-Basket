import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Clock,
  Package,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react";

import {
  getPendingSellers,
  getPendingProducts,
} from "../../api/adminApprovals";
import { getAdminCampaigns, closeCampaign } from "../../api/adminCampaigns";
import { getCampaignOrders } from "../../api/adminOrders";
import { getAdminLocations } from "../../api/adminLocations";

function formatKES(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TILE = {
  plain: { box: "bg-white", label: "text-muted", value: "text-forest" },
  dark: { box: "bg-forest", label: "text-white/75", value: "text-lime" },
  hot: { box: "bg-orange", label: "text-ink/80", value: "text-ink" },
};

function SummaryCard({ label, value, tone = "plain", small = false }) {
  const t = TILE[tone];
  return (
    <article className={`min-w-0 rounded-[18px] p-4 sm:p-5 ${t.box}`}>
      <p className={`text-sm ${t.label}`}>{label}</p>
      <p
        className={`mt-0.5 break-words font-bold tabular-nums ${t.value} ${
          small ? "text-[19px] sm:text-[22px]" : "text-[25px] sm:text-[28px]"
        }`}
      >
        {value}
      </p>
    </article>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-[20px] bg-white p-[18px] sm:p-[22px] ${className}`}
    >
      <h2 className="text-xl font-bold leading-tight tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyMessage({ children }) {
  return <p className="px-3 py-8 text-center text-sm text-muted">{children}</p>;
}

function NoteIcon({ children }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-forest"
    >
      {children}
    </span>
  );
}

function StockIndicator({ campaign }) {
  const confirmed = Boolean(campaign.stock_confirmed_at);
  return (
    <span
      className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold leading-snug ${
        confirmed
          ? "bg-lime-soft text-forest"
          : "bg-orange-soft text-orange-text"
      }`}
    >
      {confirmed
        ? `Stock confirmed ${formatShortDate(campaign.stock_confirmed_at)}`
        : "Awaiting stock confirmation"}
    </span>
  );
}

// One row in "Needs attention"; rows share the same spacing and divider
const ROW =
  "flex items-center gap-3 border-t border-grey-soft px-1 py-3.5 first:border-t-0";
const ROW_TITLE = "block break-words text-[15px] font-semibold";
const ROW_TEXT = "mt-0.5 block text-[13px] leading-snug text-muted";

export default function AdminDashboardPage() {
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [closingId, setClosingId] = useState(null);

  async function loadDashboard(showLoading = true) {
    if (showLoading) setLoading(true);
    setLoadError("");
    setActionError("");

    try {
      const [sellerData, productData, campaignData, locationData] =
        await Promise.all([
          getPendingSellers(),
          getPendingProducts(),
          getAdminCampaigns(),
          getAdminLocations(),
        ]);

      const sellerList = Array.isArray(sellerData) ? sellerData : [];
      const productList = Array.isArray(productData) ? productData : [];
      const campaignList = Array.isArray(campaignData) ? campaignData : [];
      const locationList = Array.isArray(locationData) ? locationData : [];

      setSellers(sellerList);
      setProducts(productList);
      setCampaigns(campaignList);
      setLocations(locationList);

      const orderResults = await Promise.all(
        campaignList.map((campaign) => getCampaignOrders(campaign.id)),
      );
      setOrders(
        orderResults.flatMap((result) => (Array.isArray(result) ? result : [])),
      );
    } catch (error) {
      setLoadError(error.message || "Unable to load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const pendingApprovalCount = sellers.length + products.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active");

  const overdueCampaigns = activeCampaigns.filter((campaign) => {
    const deadline = new Date(campaign.deadline).getTime();
    return (
      campaign.deadline && !Number.isNaN(deadline) && deadline < Date.now()
    );
  });

  const fulfilmentCampaigns = campaigns.filter((c) =>
    ["successful", "fulfilling"].includes(c.status),
  );

  const paidOrders = orders.filter(
    (o) => o.status !== "refunded" && o.status !== "cancelled",
  );
  const paidRevenue = paidOrders.reduce(
    (total, o) => total + Number(o.total_amount || 0),
    0,
  );

  async function handleCloseCampaign(campaign) {
    const confirmed = window.confirm(
      `Close "${campaign.title}" now?\n\nThe system will calculate the campaign outcome. If the minimum quantity has been reached, the campaign will succeed. Otherwise, it will fail and eligible payments will be refunded.`,
    );
    if (!confirmed) return;

    setClosingId(campaign.id);
    setActionError("");
    setSuccessMessage("");

    try {
      await closeCampaign(campaign.id);
      setSuccessMessage(`${campaign.title} has been closed successfully.`);
      await loadDashboard(false);
    } catch (error) {
      setActionError(error.message || "Unable to close this campaign.");
    } finally {
      setClosingId(null);
    }
  }

  const nothingToDo =
    sellers.length === 0 &&
    products.length === 0 &&
    overdueCampaigns.length === 0 &&
    fulfilmentCampaigns.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-12 pt-5 text-ink md:px-8">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4 sm:items-center">
        <div>
          <p className="text-sm text-muted">{formatDate(new Date())}</p>
          <h1 className="text-[27px] font-bold leading-tight tracking-tight sm:text-[30px]">
            Dashboard
          </h1>
        </div>
        <Link
          to="/admin/campaigns/new"
          className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-lime px-4 text-sm font-bold text-forest no-underline transition hover:brightness-95 sm:min-h-11 sm:px-[22px]"
        >
          <Plus size={16} aria-hidden="true" /> New campaign
        </Link>
      </header>

      {/* Messages */}
      {successMessage && (
        <p
          role="status"
          className="mb-3.5 rounded-[14px] bg-lime-soft px-4 py-3 text-sm text-forest"
        >
          {successMessage}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="mb-3.5 rounded-[14px] bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          {actionError}
        </p>
      )}
      {loadError && (
        <p
          role="alert"
          className="mb-3.5 rounded-[14px] bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          {loadError}
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="ml-2 font-bold underline"
          >
            Try again
          </button>
        </p>
      )}

      {/* Summary */}
      <section
        aria-label="Dashboard summary"
        className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3.5 min-[1050px]:grid-cols-4"
      >
        <SummaryCard
          label="Active campaigns"
          value={loading ? "—" : activeCampaigns.length}
          tone="dark"
        />
        <SummaryCard
          label="Paid orders"
          value={loading ? "—" : paidOrders.length}
        />
        <SummaryCard
          label="Revenue from paid orders"
          value={loading ? "—" : formatKES(paidRevenue)}
          small
        />
        <SummaryCard
          label="Pending approvals"
          value={loading ? "—" : pendingApprovalCount}
          tone={pendingApprovalCount > 0 ? "hot" : "plain"}
        />
      </section>

      <div className="grid items-start gap-5 min-[1050px]:grid-cols-[minmax(0,2.3fr)_minmax(280px,1fr)]">
        {/* Needs attention */}
        <Panel title="Needs attention" className="min-[1050px]:min-h-[520px]">
          {loading ? (
            <EmptyMessage>Loading dashboard information...</EmptyMessage>
          ) : (
            <div className="mt-2 flex flex-col">
              {sellers.length > 0 && (
                <Link
                  to="/admin/approvals"
                  className={`${ROW} text-ink no-underline hover:bg-canvas`}
                >
                  <NoteIcon>
                    <ShieldCheck size={18} />
                  </NoteIcon>
                  <span className="min-w-0 flex-1">
                    <span className={ROW_TITLE}>
                      {sellers.length} pending seller{" "}
                      {sellers.length === 1 ? "approval" : "approvals"}
                    </span>
                    <span className={ROW_TEXT}>
                      Wholesalers waiting for verification
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </Link>
              )}

              {products.length > 0 && (
                <Link
                  to="/admin/approvals"
                  className={`${ROW} text-ink no-underline hover:bg-canvas`}
                >
                  <NoteIcon>
                    <Package size={18} />
                  </NoteIcon>
                  <span className="min-w-0 flex-1">
                    <span className={ROW_TITLE}>
                      {products.length} pending product{" "}
                      {products.length === 1 ? "approval" : "approvals"}
                    </span>
                    <span className={ROW_TEXT}>
                      Products waiting for review
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </Link>
              )}

              {overdueCampaigns.map((campaign) => {
                const ordered = Number(campaign.ordered_quantity || 0);
                const minimum = Number(campaign.min_quantity || 0);
                return (
                  <div
                    key={`overdue-${campaign.id}`}
                    className={`${ROW} flex-wrap`}
                  >
                    <NoteIcon>
                      <Clock size={18} />
                    </NoteIcon>
                    <Link
                      to={`/admin/campaigns/${campaign.id}`}
                      className="group min-w-0 flex-1 text-ink no-underline"
                    >
                      <span className={`${ROW_TITLE} group-hover:underline`}>
                        {campaign.title}
                      </span>
                      <span className={ROW_TEXT}>
                        Overdue ·{" "}
                        {ordered >= minimum
                          ? "Minimum reached"
                          : `${minimum - ordered} short of minimum`}
                      </span>
                    </Link>
                    <button
                      type="button"
                      disabled={closingId === campaign.id}
                      onClick={() => handleCloseCampaign(campaign)}
                      className="min-h-9 whitespace-nowrap rounded-full bg-orange px-3.5 text-[13px] font-bold text-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {closingId === campaign.id ? "Closing..." : "Close now"}
                    </button>
                  </div>
                );
              })}

              {fulfilmentCampaigns.map((campaign) => (
                <Link
                  key={`fulfilment-${campaign.id}`}
                  to={`/admin/campaigns/${campaign.id}`}
                  className={`${ROW} text-ink no-underline hover:bg-canvas`}
                >
                  <NoteIcon>
                    {campaign.status === "successful" ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <Truck size={18} />
                    )}
                  </NoteIcon>
                  <span className="min-w-0 flex-1">
                    <span className={ROW_TITLE}>{campaign.title}</span>
                    <span className={ROW_TEXT}>
                      {campaign.status === "successful"
                        ? "Successful · Ready for fulfilment"
                        : "In fulfilment · Orders being processed"}
                    </span>
                    <span className="mt-2 block">
                      <StockIndicator campaign={campaign} />
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </Link>
              ))}

              {nothingToDo && (
                <EmptyMessage>All clear. Nothing needs attention.</EmptyMessage>
              )}
            </div>
          )}
        </Panel>

        {/* Delivery locations */}
        <Panel title="Delivery locations">
          {loading ? (
            <EmptyMessage>Loading locations...</EmptyMessage>
          ) : locations.length === 0 ? (
            <EmptyMessage>No delivery locations available.</EmptyMessage>
          ) : (
            <div className="mt-2 flex flex-col">
              {locations.map((location) => {
                const inactive = location.is_active === false;
                return (
                  <article
                    key={location.id}
                    className={`border-t border-grey-soft py-2.5 first:border-t-0 ${inactive ? "opacity-55" : ""}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        {location.name}
                        {inactive && (
                          <span className="rounded-full bg-grey-soft px-2.5 py-0.5 text-xs font-semibold text-ink-2">
                            Inactive
                          </span>
                        )}
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatKES(location.delivery_fee)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-muted">
                      Collection:{" "}
                      {location.collection_point ||
                        "Collection point to be confirmed"}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
