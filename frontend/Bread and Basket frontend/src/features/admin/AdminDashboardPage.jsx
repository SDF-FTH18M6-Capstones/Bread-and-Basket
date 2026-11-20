import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

function SummaryCard({ label, value, variant = "", valueClass = "" }) {
  return (
    <article className={`dashboard-stat ${variant}`}>
      <p className="dashboard-stat-label">{label}</p>
      <p className={`dashboard-stat-value ${valueClass}`}>{value}</p>
    </article>
  );
}

function EmptyMessage({ children }) {
  return <div className="dashboard-empty">{children}</div>;
}

function SectionHeading({ children }) {
  return <h2 className="dashboard-section-heading">{children}</h2>;
}

function StockIndicator({ campaign }) {
  const confirmed = Boolean(campaign.stock_confirmed_at);

  return (
    <span
      className={`dashboard-badge ${
        confirmed ? "dashboard-badge-success" : "dashboard-badge-warning"
      }`}
    >
      {confirmed
        ? `Stock confirmed ${formatShortDate(campaign.stock_confirmed_at)}`
        : "Awaiting stock confirmation"}
    </span>
  );
}

function CampaignLink({ campaign, children }) {
  return (
    <Link
      to={`/admin/campaigns/${campaign.id}`}
      className="dashboard-campaign-link"
    >
      {children}
    </Link>
  );
}

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
    if (showLoading) {
      setLoading(true);
    }

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

      const allOrders = orderResults.flatMap((result) =>
        Array.isArray(result) ? result : [],
      );

      setOrders(allOrders);
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

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active",
  );

  const overdueCampaigns = activeCampaigns.filter((campaign) => {
    const deadline = new Date(campaign.deadline).getTime();

    return (
      campaign.deadline && !Number.isNaN(deadline) && deadline < Date.now()
    );
  });

  const fulfilmentCampaigns = campaigns.filter((campaign) =>
    ["successful", "fulfilling"].includes(campaign.status),
  );

  const paidOrders = orders.filter(
    (order) => order.status !== "refunded" && order.status !== "cancelled",
  );

  const paidRevenue = paidOrders.reduce(
    (total, order) => total + Number(order.total_amount || 0),
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

  return (
    <div className="admin-dashboard">
      <style>{`
        .admin-dashboard {
          --dash-forest: #133D27;
          --dash-forest-2: #1D5236;
          --dash-lime: #B6E07C;
          --dash-lime-soft: #EAF5DA;
          --dash-orange: #FF6B35;
          --dash-orange-soft: #FFEADF;
          --dash-orange-text: #B43B08;
          --dash-bg: #F4F5F0;
          --dash-ink: #15231A;
          --dash-muted: #5A6A5F;
          --dash-line: #E4E9E2;
          color: var(--dash-ink);
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          font-family: "Outfit", "Segoe UI", system-ui, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .dashboard-date {
          color: var(--dash-muted);
          font-size: 14px;
          margin-bottom: 3px;
        }

        .dashboard-title {
          font-size: 30px;
          line-height: 1.15;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .dashboard-new-campaign {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 22px;
          border: 0;
          border-radius: 999px;
          background: var(--dash-lime);
          color: var(--dash-forest);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: filter .15s;
        }

        .dashboard-new-campaign:hover {
          filter: brightness(.95);
        }

        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .dashboard-stat {
          min-width: 0;
          background: #fff;
          border-radius: 18px;
          padding: 18px;
        }

        .dashboard-stat-label {
          color: var(--dash-muted);
          font-size: 14px;
          margin-bottom: 2px;
        }

        .dashboard-stat-value {
          color: var(--dash-forest);
          font-size: 28px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          overflow-wrap: anywhere;
        }

        .dashboard-stat.dark {
          background: var(--dash-forest);
        }

        .dashboard-stat.dark .dashboard-stat-label {
          color: #CFE0D3;
        }

        .dashboard-stat.dark .dashboard-stat-value {
          color: var(--dash-lime);
        }

        .dashboard-stat.hot {
          background: var(--dash-orange);
        }

        .dashboard-stat.hot .dashboard-stat-label,
        .dashboard-stat.hot .dashboard-stat-value {
          color: #2A1204;
        }

        .dashboard-stat-value.revenue {
          font-size: 22px;
        }

        .dashboard-split {
          display: grid;
          grid-template-columns: minmax(0, 2.3fr) minmax(280px, 1fr);
          gap: 20px;
          align-items: start;
        }

        .dashboard-panel {
          min-width: 0;
          background: #fff;
          border-radius: 20px;
          padding: 22px;
        }

        .dashboard-split > section.dashboard-panel {
          min-height: 520px;
        }

        .dashboard-section-heading {
          font-size: 20px;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }

        .dashboard-empty {
          padding: 30px 12px;
          text-align: center;
          color: var(--dash-muted);
          font-size: 14px;
        }

        .dashboard-note {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 4px;
          border: 0;
          border-top: 1px solid #ECF1EA;
          background: transparent;
          color: inherit;
          text-align: left;
        }

        .dashboard-note-content {
          flex: 1;
          min-width: 0;
        }

        .dashboard-note-title {
          display: block;
          font-size: 15px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .dashboard-note-description {
          display: block;
          margin-top: 3px;
          color: var(--dash-muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .dashboard-note-icon {
          width: 40px;
          height: 40px;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--dash-line);
          border-radius: 50%;
          color: var(--dash-forest);
          font-size: 18px;
        }

        .dashboard-note-arrow {
          color: var(--dash-muted);
          font-size: 20px;
          flex: none;
        }

        .dashboard-note-action {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
          padding: 14px 4px;
          border-top: 1px solid #ECF1EA;
        }

        .dashboard-campaign-link {
          display: block;
          color: inherit;
          text-decoration: none;
          min-width: 0;
          flex: 1;
        }

        .dashboard-campaign-link:hover .dashboard-note-title {
          color: var(--dash-forest-2);
          text-decoration: underline;
        }

        .dashboard-close-button {
          min-height: 36px;
          padding: 0 14px;
          border: 0;
          border-radius: 999px;
          background: var(--dash-orange);
          color: #2A1204;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .dashboard-close-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .dashboard-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          max-width: 100%;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .dashboard-badge-success {
          background: var(--dash-lime-soft);
          color: var(--dash-forest);
        }

        .dashboard-badge-warning {
          background: var(--dash-orange-soft);
          color: var(--dash-orange-text);
        }

        .dashboard-badge-neutral {
          background: #E9ECE8;
          color: #58645B;
        }

        .dashboard-location {
          padding: 10px 0;
          border-top: 1px solid #ECF1EA;
        }

        .dashboard-location-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 14px;
        }

        .dashboard-location-name {
          font-weight: 600;
        }

        .dashboard-location-fee {
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .dashboard-location-point {
          margin-top: 4px;
          color: var(--dash-muted);
          font-size: 13px;
          line-height: 1.4;
        }

        .dashboard-message {
          margin-bottom: 14px;
          border-radius: 14px;
          padding: 12px 16px;
          font-size: 14px;
        }

        .dashboard-message.error {
          background: #FDE3E0;
          color: #9B1C14;
        }

        .dashboard-message.success {
          background: var(--dash-lime-soft);
          color: var(--dash-forest);
        }

        .dashboard-retry {
          border: 0;
          background: transparent;
          color: inherit;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
          margin-left: 8px;
        }

        @media (max-width: 1050px) {
          .dashboard-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-split {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 560px) {
          .dashboard-header {
            align-items: flex-start;
          }

          .dashboard-title {
            font-size: 27px;
          }

          .dashboard-new-campaign {
            min-height: 40px;
            padding: 0 16px;
          }

          .dashboard-stats {
            gap: 10px;
          }

          .dashboard-stat {
            padding: 15px;
          }

          .dashboard-stat-value {
            font-size: 25px;
          }

          .dashboard-stat-value.revenue {
            font-size: 19px;
          }

          .dashboard-panel {
            padding: 18px;
          }

          .dashboard-note-action {
            align-items: flex-start;
          }
        }
      `}</style>

      <header className="dashboard-header">
        <div>
          <p className="dashboard-date">{formatDate(new Date())}</p>
          <h1 className="dashboard-title">Dashboard</h1>
        </div>

        <Link to="/admin/campaigns/new" className="dashboard-new-campaign">
          <span aria-hidden="true">＋</span>
          New campaign
        </Link>
      </header>

      {successMessage && (
        <div className="dashboard-message success" role="status">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="dashboard-message error" role="alert">
          {actionError}
        </div>
      )}

      {loadError && (
        <div className="dashboard-message error" role="alert">
          {loadError}

          <button
            type="button"
            className="dashboard-retry"
            onClick={() => loadDashboard()}
          >
            Try again
          </button>
        </div>
      )}

      <section className="dashboard-stats" aria-label="Dashboard summary">
        <SummaryCard
          label="Active campaigns"
          value={loading ? "—" : activeCampaigns.length}
          variant="dark"
        />

        <SummaryCard
          label="Paid orders"
          value={loading ? "—" : paidOrders.length}
        />

        <SummaryCard
          label="Revenue from paid orders"
          value={loading ? "—" : formatKES(paidRevenue)}
          valueClass="revenue"
        />

        <SummaryCard
          label="Pending approvals"
          value={loading ? "—" : pendingApprovalCount}
          variant="hot"
        />
      </section>

      <div className="dashboard-split">
        <section className="dashboard-panel">
          <SectionHeading>Needs attention</SectionHeading>

          {loading ? (
            <EmptyMessage>Loading dashboard information...</EmptyMessage>
          ) : (
            <>
              {sellers.length > 0 && (
                <Link
                  to="/admin/approvals"
                  className="dashboard-note"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span className="dashboard-note-icon" aria-hidden="true">
                    ✓
                  </span>

                  <span className="dashboard-note-content">
                    <span className="dashboard-note-title">
                      {sellers.length} pending seller{" "}
                      {sellers.length === 1 ? "approval" : "approvals"}
                    </span>

                    <span className="dashboard-note-description">
                      Wholesalers waiting for verification
                    </span>
                  </span>

                  <span className="dashboard-note-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              )}

              {products.length > 0 && (
                <Link
                  to="/admin/approvals"
                  className="dashboard-note"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span className="dashboard-note-icon" aria-hidden="true">
                    ✓
                  </span>

                  <span className="dashboard-note-content">
                    <span className="dashboard-note-title">
                      {products.length} pending product{" "}
                      {products.length === 1 ? "approval" : "approvals"}
                    </span>

                    <span className="dashboard-note-description">
                      Products waiting for review
                    </span>
                  </span>

                  <span className="dashboard-note-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              )}

              {overdueCampaigns.map((campaign) => (
                <div
                  className="dashboard-note-action"
                  key={`overdue-${campaign.id}`}
                >
                  <span className="dashboard-note-icon" aria-hidden="true">
                    !
                  </span>

                  <CampaignLink campaign={campaign}>
                    <span className="dashboard-note-title">
                      {campaign.title}
                    </span>

                    <span className="dashboard-note-description">
                      Overdue ·{" "}
                      {Number(campaign.ordered_quantity || 0) >=
                      Number(campaign.min_quantity || 0)
                        ? "Minimum reached"
                        : `${
                            Number(campaign.min_quantity || 0) -
                            Number(campaign.ordered_quantity || 0)
                          } short of minimum`}
                    </span>
                  </CampaignLink>

                  <button
                    type="button"
                    className="dashboard-close-button"
                    disabled={closingId === campaign.id}
                    onClick={() => handleCloseCampaign(campaign)}
                  >
                    {closingId === campaign.id ? "Closing..." : "Close now"}
                  </button>
                </div>
              ))}

              {fulfilmentCampaigns.map((campaign) => (
                <div
                  className="dashboard-note"
                  key={`fulfilment-${campaign.id}`}
                >
                  <span className="dashboard-note-icon" aria-hidden="true">
                    {campaign.status === "successful" ? "✓" : "↗"}
                  </span>

                  <span className="dashboard-note-content">
                    <CampaignLink campaign={campaign}>
                      <span className="dashboard-note-title">
                        {campaign.title}
                      </span>
                    </CampaignLink>

                    <span className="dashboard-note-description">
                      {campaign.status === "successful"
                        ? "Successful · Ready for fulfilment"
                        : "In fulfilment · Orders being processed"}
                    </span>

                    <span
                      style={{
                        display: "block",
                        marginTop: 7,
                      }}
                    >
                      <StockIndicator campaign={campaign} />
                    </span>
                  </span>

                  <Link
                    to={`/admin/campaigns/${campaign.id}`}
                    className="dashboard-note-arrow"
                    aria-label={`View ${campaign.title}`}
                    style={{ textDecoration: "none" }}
                  >
                    →
                  </Link>
                </div>
              ))}

              {sellers.length === 0 &&
                products.length === 0 &&
                overdueCampaigns.length === 0 &&
                fulfilmentCampaigns.length === 0 && (
                  <EmptyMessage>
                    All clear. Nothing needs attention.
                  </EmptyMessage>
                )}
            </>
          )}
        </section>

        <aside className="dashboard-panel">
          <SectionHeading>Delivery locations</SectionHeading>

          {loading ? (
            <EmptyMessage>Loading locations...</EmptyMessage>
          ) : locations.length === 0 ? (
            <EmptyMessage>No delivery locations available.</EmptyMessage>
          ) : (
            locations.map((location) => (
              <article
                className="dashboard-location"
                key={location.id}
                style={{
                  opacity: location.is_active === false ? 0.55 : 1,
                }}
              >
                <div className="dashboard-location-top">
                  <span className="dashboard-location-name">
                    {location.name}

                    {location.is_active === false && (
                      <span
                        className="dashboard-badge dashboard-badge-neutral"
                        style={{ marginLeft: 7 }}
                      >
                        Inactive
                      </span>
                    )}
                  </span>

                  <span className="dashboard-location-fee">
                    {formatKES(location.delivery_fee)}
                  </span>
                </div>

                <p className="dashboard-location-point">
                  Collection:{" "}
                  {location.collection_point ||
                    "Collection point to be confirmed"}
                </p>
              </article>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
