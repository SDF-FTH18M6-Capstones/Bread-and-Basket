import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAdminCampaigns,
  activateCampaign,
  cancelCampaign,
  closeCampaign,
} from "../../api/adminCampaigns";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-lime/20 text-forest",
  successful: "bg-green-100 text-green-700",
  fulfilling: "bg-blue-100 text-blue-700",
  completed: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status) {
  if (!status) return "Unknown";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>

      <p className="mt-2 text-2xl font-bold text-forest">{value}</p>

      {description && <p className="mt-1 text-xs text-muted">{description}</p>}
    </div>
  );
}

export default function AdminCampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [closeOutcome, setCloseOutcome] = useState(null);

  async function loadCampaign() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminCampaigns();

      const found = Array.isArray(data)
        ? data.find((item) => String(item.id) === String(campaignId))
        : null;

      if (!found) {
        setCampaign(null);
        setError("Campaign not found.");
        return;
      }

      setCampaign(found);
    } catch (err) {
      setError(err.message || "Unable to load campaign.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  async function runAction(action, successMessage) {
    try {
      setActionLoading(true);
      setMessage(null);
      setError("");
      setCloseOutcome(null);

      const result = await action();

      if (successMessage) {
        setMessage({
          type: "success",
          text: successMessage,
        });
      }

      if (result?.outcome) {
        setCloseOutcome(result);
      }

      await loadCampaign();
    } catch (err) {
      setError(err.message || "The action could not be completed.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleActivate() {
    const confirmed = window.confirm(
      "Activate this campaign? Customers will be able to place orders.",
    );

    if (!confirmed) return;

    runAction(
      () => activateCampaign(campaignId),
      "Campaign activated successfully.",
    );
  }

  function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this campaign?",
    );

    if (!confirmed) return;

    runAction(
      () => cancelCampaign(campaignId),
      "Campaign cancelled successfully.",
    );
  }

  function handleClose() {
    const confirmed = window.confirm(
      "Close this campaign now? The system will calculate its outcome and process refunds where required.",
    );

    if (!confirmed) return;

    runAction(() => closeCampaign(campaignId));
  }

  if (loading) {
    return (
      <main className="admin-main">
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <p className="text-sm text-muted">Loading campaign...</p>
        </div>
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="admin-main">
        <button
          type="button"
          onClick={() => navigate("/admin/campaigns")}
          className="mb-6 text-sm font-semibold text-forest hover:underline"
        >
          ← Back to campaigns
        </button>

        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <h2 className="font-semibold text-forest">Campaign unavailable</h2>

          <p className="mt-2 text-sm text-muted">
            {error || "The requested campaign could not be found."}
          </p>
        </div>
      </main>
    );
  }

  const orderedQuantity = Number(campaign.ordered_quantity || 0);
  const minimumQuantity = Number(campaign.min_quantity || 0);
  const maximumQuantity = Number(campaign.max_quantity || 0);

  const progress = minimumQuantity
    ? Math.min(Math.round((orderedQuantity / minimumQuantity) * 100), 100)
    : 0;

  const minimumReached = orderedQuantity >= minimumQuantity;

  const statusStyle =
    STATUS_STYLES[campaign.status] || "bg-gray-100 text-gray-700";

  const canEdit = campaign.status === "draft";
  const canActivate = campaign.status === "draft";

  const canCancel =
    campaign.status === "draft" ||
    (campaign.status === "active" && Number(campaign.households || 0) === 0);

  const canClose = campaign.status === "active";

  const product = campaign.product || {};

  return (
    <main className="admin-main min-w-0">
      <button
        type="button"
        onClick={() => navigate("/admin/campaigns")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
      >
        ← Back to campaigns
      </button>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest sm:text-3xl">
            Campaign details
          </h1>

          <p className="mt-2 text-sm text-muted">
            Monitor campaign progress and manage its status.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${statusStyle}`}
        >
          {formatStatus(campaign.status)}
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message.text}
        </div>
      )}

      {closeOutcome && (
        <section className="mb-6 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-bold text-forest">
            Campaign closing outcome
          </h2>

          <p className="mt-2 text-sm text-muted">
            This campaign was closed as{" "}
            <strong>{formatStatus(closeOutcome.outcome)}</strong>.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Orders confirmed"
              value={closeOutcome.orders_confirmed ?? 0}
              description="Orders retained after closing."
            />

            <StatCard
              label="Orders refunded"
              value={closeOutcome.orders_refunded ?? 0}
              description="Orders refunded after closing."
            />
          </div>
        </section>
      )}

      <section className="mb-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name || "Campaign product"}
                className="h-36 w-full rounded-xl object-cover sm:w-36"
              />
            ) : (
              <div className="flex h-36 w-full items-center justify-center rounded-xl bg-gray-100 text-4xl sm:w-36">
                📦
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Product
              </p>

              <h2 className="mt-2 text-xl font-bold text-forest">
                {product.name || "Campaign product"}
              </h2>

              <p className="mt-1 text-sm text-muted">
                {product.unit || "Unit not specified"}
              </p>

              <h3 className="mt-5 font-semibold text-forest">
                {campaign.title}
              </h3>

              <p className="mt-1 text-sm text-muted">
                Seller information is not available in the campaign response.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Campaign deadline</p>

              <p className="mt-1 text-sm font-semibold text-forest">
                {formatDate(campaign.deadline)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Closed at</p>

              <p className="mt-1 text-sm font-semibold text-forest">
                {formatDate(campaign.closed_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 className="font-bold text-forest">Campaign progress</h2>

          <p className="mt-2 text-sm text-muted">
            Quantity ordered against the minimum required.
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-forest">
                {orderedQuantity} / {minimumQuantity}
              </span>

              <span className="text-sm font-semibold text-forest">
                {progress}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-lime transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div
            className={`mt-5 rounded-xl p-4 text-sm ${
              minimumReached
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {minimumReached
              ? "The minimum quantity has been reached."
              : `The campaign needs ${
                  minimumQuantity - orderedQuantity
                } more units to reach its minimum.`}
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ordered quantity"
          value={orderedQuantity}
          description="Total quantity ordered."
        />

        <StatCard
          label="Minimum quantity"
          value={minimumQuantity}
          description="Required for success."
        />

        <StatCard
          label="Maximum quantity"
          value={maximumQuantity}
          description="Campaign order limit."
        />

        <StatCard
          label="Campaign price"
          value={
            campaign.campaign_price != null
              ? `KSh ${Number(campaign.campaign_price).toLocaleString()}`
              : "—"
          }
          description="Price copied from the approved product."
        />
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-forest">Campaign management</h2>

        <p className="mt-2 text-sm text-muted">
          Available actions depend on the current campaign status.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canEdit && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => navigate(`/admin/campaigns/${campaignId}/edit`)}
              className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-forest transition hover:bg-gray-50 disabled:opacity-50"
            >
              Edit draft
            </button>
          )}

          {canActivate && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleActivate}
              className="rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Activate campaign
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancel}
              className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Cancel campaign
            </button>
          )}

          {canClose && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleClose}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Close campaign now
            </button>
          )}

          {actionLoading && (
            <span className="self-center text-sm text-muted">
              Processing...
            </span>
          )}

          {!canEdit && !canActivate && !canCancel && !canClose && (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
              No management actions are available for this campaign status.
            </p>
          )}
        </div>

        {canClose && (
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Closing this campaign:</strong>

            <p className="mt-1">
              If the minimum quantity has been reached, the campaign will close
              successfully and eligible orders will be confirmed. Otherwise, the
              campaign will fail and live orders will be refunded automatically.
            </p>
          </div>
        )}

        {campaign.status === "active" &&
          Number(campaign.households || 0) > 0 && (
            <p className="mt-4 text-sm text-muted">
              This campaign has active orders. It cannot be cancelled; use Close
              campaign now to calculate its outcome and process any required
              refunds.
            </p>
          )}
      </section>
    </main>
  );
}
