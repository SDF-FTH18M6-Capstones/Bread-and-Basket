import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getAdminCampaigns,
  activateCampaign,
  cancelCampaign,
  closeCampaign,
} from "../../api/adminCampaigns";

import {
  getCampaignOrders,
  updateCampaignOrdersStatus,
  updateAdminOrderStatus,
} from "../../api/adminOrders";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-lime/20 text-forest",
  successful: "bg-green-100 text-green-700",
  fulfilling: "bg-blue-100 text-blue-700",
  completed: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-amber-50 text-amber-700",
  dispatched: "bg-purple-50 text-purple-700",
  ready_for_collection: "bg-green-50 text-green-700",
  refunded: "bg-red-50 text-red-700",
};

const FULFILMENT_ACTIONS = {
  preparing: "Mark preparing",
  dispatched: "Mark dispatched",
  ready_for_collection: "Mark ready for collection",
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

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function StatCard({ label, value, valueClass = "" }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass || "text-forest"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex w-fit whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${style}`}
    >
      {formatStatus(status)}
    </span>
  );
}

/*
 * Payment and refund helpers.
 *
 * Prefer the real backend payment/refund objects.
 * Fall back to the current mock order data during development.
 */

function getPaymentStatus(order) {
  if (order.payment?.status) {
    return order.payment.status;
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    return "refunded";
  }

  return "successful";
}

function getPaidAmount(order) {
  if (order.payment?.amount !== undefined && order.payment?.amount !== null) {
    return Number(order.payment.amount) || 0;
  }

  return Number(order.total_amount || 0);
}

function getRefundAmount(order) {
  if (order.refund?.amount !== undefined && order.refund?.amount !== null) {
    return Number(order.refund.amount) || 0;
  }

  // Development fallback for the current mock data.
  if (["cancelled", "refunded"].includes(order.status)) {
    return Number(order.total_amount || 0);
  }

  return 0;
}

function PaymentBadge({ status }) {
  const styles = {
    successful: "bg-green-50 text-green-700",
    succeeded: "bg-green-50 text-green-700",
    paid: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-red-50 text-red-700",
  };

  const style = styles[status] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function AdminCampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState("");

  const [error, setError] = useState("");
  const [orderError, setOrderError] = useState("");

  const [message, setMessage] = useState(null);
  const [closeOutcome, setCloseOutcome] = useState(null);

  async function loadCampaign({ showLoading = true } = {}) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");
      setOrderError("");

      const data = await getAdminCampaigns();

      const found = Array.isArray(data)
        ? data.find((item) => String(item.id) === String(campaignId))
        : null;

      if (!found) {
        setCampaign(null);
        setOrders([]);
        setError("Campaign not found.");
        return;
      }

      setCampaign(found);
      setOrdersLoading(true);

      try {
        const orderData = await getCampaignOrders(campaignId);
        setOrders(Array.isArray(orderData) ? orderData : []);
      } catch (err) {
        setOrders([]);
        setOrderError(err.message || "Unable to load campaign orders.");
      } finally {
        setOrdersLoading(false);
      }
    } catch (err) {
      setError(err.message || "Unable to load campaign.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadCampaign();

    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      await loadCampaign({ showLoading: false });
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

  async function handleBulkOrderUpdate(status) {
    const actionLabel = FULFILMENT_ACTIONS[status];

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel.toLowerCase()} all eligible orders in this campaign?`,
    );

    if (!confirmed) return;

    try {
      setOrderActionLoading(status);
      setMessage(null);
      setOrderError("");

      const result = await updateCampaignOrdersStatus(campaignId, status);

      setMessage({
        type: "success",
        text: `${actionLabel}: ${result.updated} orders updated and ${result.skipped} orders skipped.`,
      });

      await loadCampaign({ showLoading: false });
    } catch (err) {
      setOrderError(err.message || "Unable to update campaign orders.");
    } finally {
      setOrderActionLoading("");
    }
  }

  async function handleIndividualOrderUpdate(order, status) {
    const actionLabel = FULFILMENT_ACTIONS[status];

    const confirmed = window.confirm(
      `${actionLabel} for order ${order.order_no}?`,
    );

    if (!confirmed) return;

    try {
      setOrderActionLoading(String(order.id));
      setMessage(null);
      setOrderError("");

      await updateAdminOrderStatus(order.id, status);

      setMessage({
        type: "success",
        text: `Order ${order.order_no} successfully updated to ${formatStatus(status)}.`,
      });

      await loadCampaign({ showLoading: false });
    } catch (err) {
      setOrderError(err.message || "Unable to update this order.");
    } finally {
      setOrderActionLoading("");
    }
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

  const progress = maximumQuantity
    ? Math.min(Math.round((orderedQuantity / maximumQuantity) * 100), 100)
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

  const canFulfilOrders = ["successful", "fulfilling"].includes(
    campaign.status,
  );

  const product = campaign.product || {};

  // Campaign order and financial summaries.
  const totalOrders = orders.length;

  const totalUnits = orders.reduce(
    (total, order) => total + Number(order.quantity || 0),
    0,
  );

  const totalPaid = orders.reduce((total, order) => {
    const paymentStatus = getPaymentStatus(order);

    if (
      ["successful", "succeeded", "paid", "refunded"].includes(paymentStatus)
    ) {
      return total + getPaidAmount(order);
    }

    return total;
  }, 0);

  const totalRefunds = orders.reduce(
    (total, order) => total + getRefundAmount(order),
    0,
  );

  const orderCounts = orders.reduce((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    return counts;
  }, {});

  // Use backend-provided next_statuses as the source of truth.
  const availableBulkStatuses = canFulfilOrders
    ? [
        ...new Set(
          orders.flatMap((order) =>
            Array.isArray(order.next_statuses) ? order.next_statuses : [],
          ),
        ),
      ].filter((status) => FULFILMENT_ACTIONS[status])
    : [];

  const hasDeliveryPreparing = orders.some(
    (order) =>
      order.fulfilment === "delivery" &&
      order.status === "preparing" &&
      order.next_statuses?.includes("dispatched"),
  );

  const hasCollectionPreparing = orders.some(
    (order) =>
      order.fulfilment === "collection" &&
      order.status === "preparing" &&
      order.next_statuses?.includes("ready_for_collection"),
  );

  const hasConfirmedOrders = orders.some(
    (order) =>
      order.status === "confirmed" &&
      order.next_statuses?.includes("preparing"),
  );

  return (
    <main className="admin-main min-w-0">
      <button
        type="button"
        onClick={() => navigate("/admin/campaigns")}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
      >
        ← Back to campaigns
      </button>

      {/* Campaign heading */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name || "Campaign product"}
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl">
              📦
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">
              {product.name || "Campaign product"}
              {product.unit ? ` · ${product.unit}` : ""}
            </p>

            <h1 className="mt-1 text-xl font-bold text-forest sm:text-2xl">
              {campaign.title}
            </h1>

            <p className="mt-1 text-xs text-muted">
              Campaign details and order monitoring
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${statusStyle}`}
          >
            {formatStatus(campaign.status)}
          </span>

          <span className="text-xs text-muted">
            {campaign.status === "active"
              ? `Ends ${formatDate(campaign.deadline)}`
              : campaign.closed_at
                ? `Closed ${formatDate(campaign.closed_at)}`
                : ""}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message.text}
        </div>
      )}

      {/* Campaign closing result */}
      {closeOutcome && (
        <section className="mb-5 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-bold text-forest">Campaign closing outcome</h2>

          <p className="mt-2 text-sm text-muted">
            This campaign was closed as{" "}
            <strong>{formatStatus(closeOutcome.outcome)}</strong>.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Orders confirmed"
              value={closeOutcome.orders_confirmed ?? 0}
            />

            <StatCard
              label="Orders refunded"
              value={closeOutcome.orders_refunded ?? 0}
            />
          </div>
        </section>
      )}

      {/* Campaign statistics and progress */}
      <section className="mb-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6">
          <StatCard label="Total orders" value={totalOrders} />

          <StatCard label="Total units" value={totalUnits} />

          <StatCard
            label="Total paid"
            value={formatMoney(totalPaid)}
            valueClass="text-green-700"
          />

          <StatCard
            label="Total refunds"
            value={formatMoney(totalRefunds)}
            valueClass="text-red-600"
          />
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-forest">
              Campaign progress
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

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span>
              Ordered:{" "}
              <strong className="text-forest">{orderedQuantity}</strong>
            </span>

            <span>
              Minimum:{" "}
              <strong className="text-forest">{minimumQuantity}</strong>
            </span>

            <span>
              Maximum:{" "}
              <strong className="text-forest">{maximumQuantity || "—"}</strong>
            </span>

            <span
              className={minimumReached ? "font-semibold text-green-700" : ""}
            >
              Minimum {minimumReached ? "reached" : "not reached"}
            </span>
          </div>
        </div>
      </section>

      {/* Orders and next action */}
      <section className="mb-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Orders */}
        <div className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-forest">Orders</h2>

              <p className="mt-1 text-xs text-muted">
                {orders.length} total order{orders.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadCampaign({ showLoading: false })}
              disabled={ordersLoading || Boolean(orderActionLoading)}
              className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-forest transition hover:bg-gray-50 disabled:opacity-50"
            >
              {ordersLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {orderError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {orderError}
            </div>
          )}

          {ordersLoading && orders.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center">
              <p className="text-sm text-muted">Loading campaign orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center">
              <p className="font-semibold text-forest">No orders yet</p>

              <p className="mt-2 text-sm text-muted">
                There are currently no orders recorded for this campaign.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="px-3 py-3 font-medium">Order</th>
                    <th className="px-3 py-3 font-medium">Consumer</th>
                    <th className="px-3 py-3 font-medium">Qty</th>
                    <th className="px-3 py-3 font-medium">Fulfilment</th>
                    <th className="px-3 py-3 font-medium">Amount paid</th>
                    <th className="px-3 py-3 font-medium">Payment / refund</th>
                    <th className="px-3 py-3 font-medium">Order status</th>
                    <th className="px-3 py-3 font-medium">Next action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-line">
                  {orders.map((order) => {
                    const nextStatuses = Array.isArray(order.next_statuses)
                      ? order.next_statuses.filter(
                          (status) => FULFILMENT_ACTIONS[status],
                        )
                      : [];

                    const isUpdating = orderActionLoading === String(order.id);

                    const fulfilmentLabel =
                      order.fulfilment === "delivery"
                        ? "Delivery"
                        : "Collection";

                    const locationDetails =
                      order.fulfilment === "delivery"
                        ? order.delivery_address || order.location?.name || "—"
                        : order.location?.collection_point ||
                          order.location?.name ||
                          "—";

                    const paymentStatus = getPaymentStatus(order);
                    const paidAmount = getPaidAmount(order);
                    const refundAmount = getRefundAmount(order);

                    return (
                      <tr key={order.id} className="align-top">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-forest">
                            {order.order_no || `#${order.id}`}
                          </p>

                          <p className="mt-1 text-xs text-muted">
                            {formatDate(order.created_at)}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <p className="font-medium text-forest">
                            {order.consumer?.full_name || "—"}
                          </p>

                          <p className="mt-1 text-xs text-muted">
                            {order.consumer?.phone || "—"}
                          </p>
                        </td>

                        <td className="px-3 py-4 font-medium text-forest">
                          {order.quantity ?? "—"}
                        </td>

                        <td className="max-w-[180px] px-3 py-4">
                          <p className="font-medium text-forest">
                            {fulfilmentLabel}
                          </p>

                          <p className="mt-1 whitespace-normal text-xs leading-relaxed text-muted">
                            {locationDetails}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          <p className="font-semibold text-forest">
                            {formatMoney(paidAmount)}
                          </p>

                          {order.payment?.reference && (
                            <p className="mt-1 text-xs text-muted">
                              Ref: {order.payment.reference}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <PaymentBadge status={paymentStatus} />

                          {refundAmount > 0 && (
                            <p className="mt-2 whitespace-nowrap text-xs font-semibold text-red-600">
                              Refunded: {formatMoney(refundAmount)}
                            </p>
                          )}

                          {order.refund?.processed_at && (
                            <p className="mt-1 whitespace-nowrap text-xs text-muted">
                              {formatDate(order.refund.processed_at)}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="px-3 py-4">
                          {canFulfilOrders && nextStatuses.length > 0 ? (
                            <div className="flex min-w-[150px] flex-col gap-2">
                              {nextStatuses.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={
                                    Boolean(orderActionLoading) || actionLoading
                                  }
                                  onClick={() =>
                                    handleIndividualOrderUpdate(order, status)
                                  }
                                  className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-forest transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? "Updating..."
                                    : FULFILMENT_ACTIONS[status]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">
                              No action available
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Cancelled and refunded orders remain visible for monitoring.
            Completed orders are confirmed by shoppers and cannot be advanced by
            the admin.
          </p>
        </div>

        {/* Next action panel */}
        <aside className="h-fit rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-bold text-forest">Next action</h2>

          <p className="mt-1 text-sm text-muted">
            Actions available for this campaign.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            {campaign.status === "draft" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleActivate}
                className="w-full rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-forest transition hover:opacity-90 disabled:opacity-50"
              >
                Activate campaign
              </button>
            )}

            {campaign.status === "active" && (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleClose}
                  className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Close campaign now
                </button>

                <p className="text-xs leading-relaxed text-muted">
                  If the minimum quantity is reached, the campaign will close
                  successfully. Otherwise, it will fail and eligible orders will
                  be refunded.
                </p>
              </>
            )}

            {canFulfilOrders && (
              <>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-forest">
                    Order fulfilment
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Bulk actions update all eligible orders that have the
                    selected status as their next allowed step.
                  </p>
                </div>

                {availableBulkStatuses.length > 0 ? (
                  availableBulkStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={Boolean(orderActionLoading) || actionLoading}
                      onClick={() => handleBulkOrderUpdate(status)}
                      className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {orderActionLoading === status
                        ? "Updating..."
                        : `Move all to ${formatStatus(status)}`}
                    </button>
                  ))
                ) : (
                  <p className="rounded-xl bg-gray-50 p-3 text-sm text-muted">
                    No fulfilment actions are currently available.
                  </p>
                )}

                {hasConfirmedOrders && (
                  <p className="text-xs text-muted">
                    {orderCounts.confirmed || 0} confirmed order
                    {orderCounts.confirmed === 1 ? "" : "s"} awaiting
                    preparation.
                  </p>
                )}

                {hasDeliveryPreparing && (
                  <p className="text-xs text-muted">
                    Delivery orders are awaiting dispatch.
                  </p>
                )}

                {hasCollectionPreparing && (
                  <p className="text-xs text-muted">
                    Collection orders are awaiting collection readiness.
                  </p>
                )}
              </>
            )}

            {!canFulfilOrders &&
              campaign.status !== "draft" &&
              campaign.status !== "active" && (
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-muted">
                  No fulfilment action is available for this campaign status.
                </p>
              )}

            {actionLoading && (
              <p className="text-center text-xs text-muted">Processing...</p>
            )}
          </div>

          {/* Order status counts */}
          {orders.length > 0 && (
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-forest">
                Order status
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(orderCounts).map(([status, count]) => (
                  <span
                    key={status}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {formatStatus(status)}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {campaign.status === "failed" && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              The minimum quantity was not reached. Eligible orders were
              refunded automatically.
            </div>
          )}

          {campaign.status === "completed" && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              This campaign's transaction has been completed.
            </div>
          )}
        </aside>
      </section>

      {/* Campaign management */}
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-forest">Campaign management</h2>

        <p className="mt-2 text-sm text-muted">
          Available management actions depend on the campaign status.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
