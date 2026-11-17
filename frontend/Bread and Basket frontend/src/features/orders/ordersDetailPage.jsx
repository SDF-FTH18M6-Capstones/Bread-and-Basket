import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  cancelOrder,
  canCancelNow,
  canConfirmReceipt,
  confirmReceipt,
  fetchOrder,
} from "../../api/orders";
import {
  HISTORY_TEXT,
  formatDateTime,
  formatMoney,
  formatRelative,
  statusOf,
  withArea,
} from "./ordersUtils";
import {
  DriveProgress,
  ErrorState,
  Fulfilment,
  Loading,
  ProductThumb,
  ProgressSteps,
  RefundNote,
  StatusBadge,
  btnDanger,
  btnSuccess,
} from "./ordersParts";

/* Order tracking page using the backend Orders API. */

function orderIdFromUrl() {
  const match = window.location.pathname.match(/(\d+)\/?$/);
  return match ? match[1] : null;
}

export default function OrderDetailPage({
  orderId = orderIdFromUrl(),
  backUrl = "/orders",
  loginUrl = "/login",
}) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(
    async ({ signal } = {}) => {
      setOrder(null);
      setError(null);

      if (!orderId) {
        setError(new ApiError("We couldn't find that order.", 404));
        return;
      }

      try {
        const data = await fetchOrder(orderId, { signal });
        setOrder(data);
        setNow(new Date());
      } catch (err) {
        if (err.name === "AbortError") return;

        setError(err instanceof ApiError ? err : new ApiError(err.message));
      }
    },
    [orderId],
  );

  useEffect(() => {
    const ctrl = new AbortController();

    load({ signal: ctrl.signal });

    return () => ctrl.abort();
  }, [load]);

  async function runAction(action) {
    setBusy(action);
    setActionError(null);

    try {
      const updated =
        action === "cancel"
          ? await cancelOrder(order.id)
          : await confirmReceipt(order.id);

      setOrder(updated);
      setNow(new Date());
    } catch (err) {
      if (err.status === 401) {
        setError(err);
        return;
      }

      setActionError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-3xl px-5 pt-6 pb-16">
        <a
          href={backUrl}
          className="text-sm font-semibold text-orange-700 hover:underline"
        >
          My orders
        </a>

        {error ? (
          <ErrorState
            error={error}
            loginUrl={loginUrl}
            backUrl={backUrl}
            onRetry={() => load()}
          />
        ) : !order ? (
          <Loading count={2} height="h-56" />
        ) : (
          <OrderDetail
            order={order}
            now={now}
            busy={busy}
            actionError={actionError}
            onAction={runAction}
          />
        )}
      </main>
    </div>
  );
}

function OrderDetail({ order: o, now, busy, actionError, onAction }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const c = o.campaign;
  const p = c.product;
  const st = statusOf(o.status);
  const closed = st.group === "closed";

  return (
    <div className="mt-4 grid gap-4">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-start gap-4 px-4 pt-5 pb-4 sm:px-6">
          <ProductThumb product={p} faded={closed} large />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="font-serif text-2xl font-semibold">
                {o.order_no}
              </h1>

              <StatusBadge status={o.status} />
            </div>

            <p className="mt-1 font-semibold">
              {o.quantity} × {p.name}{" "}
              <span className="font-normal text-stone-500">· {p.unit}</span>
            </p>

            <p className="text-sm text-stone-600">{c.title}</p>

            <p className="mt-0.5 text-[13px] text-stone-500">
              Placed {formatDateTime(o.created_at)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-stone-200 px-4 py-4 sm:px-6">
          <StatusMessage order={o} now={now} />

          {closed ? <RefundNote order={o} /> : <ProgressSteps order={o} />}

          {canConfirmReceipt(o) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 px-3.5 py-3 text-sm">
              <span>
                {o.fulfilment === "delivery"
                  ? "Got your delivery?"
                  : "Picked it up?"}{" "}
                Let us know so we can close the order.
              </span>

              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => onAction("confirm")}
                className={btnSuccess}
              >
                {busy === "confirm" ? "Saving…" : "I’ve received it"}
              </button>
            </div>
          )}

          {canCancelNow(o, now) && (
            <div className="border-t border-dashed border-stone-200 pt-3">
              {!confirmingCancel ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-stone-500">
                  <span>
                    Free cancellation until{" "}
                    {formatDateTime(o.cancellation_cutoff)} (
                    {formatRelative(o.cancellation_cutoff, now)}). You get the
                    full {formatMoney(o.total_amount)} back.
                  </span>

                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => setConfirmingCancel(true)}
                    className={btnDanger}
                  >
                    Cancel order
                  </button>
                </div>
              ) : (
                <div
                  role="group"
                  aria-labelledby="cancel-confirmation-title"
                  className="rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <h3
                    id="cancel-confirmation-title"
                    className="font-semibold text-red-900"
                  >
                    Cancel this order?
                  </h3>

                  <p className="mt-1 text-sm text-red-800">
                    Your order will be cancelled and a refund of{" "}
                    {formatMoney(o.total_amount)} will be processed. This action
                    cannot be undone.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => onAction("cancel")}
                      className={btnDanger}
                    >
                      {busy === "cancel"
                        ? "Cancelling…"
                        : "Confirm cancellation"}
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => setConfirmingCancel(false)}
                      className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      Keep order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {actionError && (
            <p role="alert" className="text-sm text-red-700">
              {actionError}
            </p>
          )}
        </div>
      </section>

      {st.group === "active" && c.status === "active" && (
        <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 sm:px-6">
          <h2 className="mb-3 font-semibold">The group buy</h2>

          <DriveProgress campaign={c} now={now} />
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PriceBreakdown order={o} />
        <PaymentCard payment={o.payment} />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 sm:px-6">
        <h2 className="mb-3 font-semibold">
          {o.fulfilment === "delivery" ? "Delivery" : "Collection"}
        </h2>

        <Fulfilment order={o} />

        {o.fulfilment === "collection" && (
          <p className="mt-2 pl-[30px] text-[13px] text-stone-500">
            Show your order number {o.order_no} when you pick it up.
          </p>
        )}
      </section>

      <History history={o.history || []} />
    </div>
  );
}

function StatusMessage({ order: o, now }) {
  const c = o.campaign;

  const where =
    o.fulfilment === "delivery"
      ? withArea(o.delivery_address, o.location.name)
      : withArea(o.location.collection_point, o.location.name);

  let text;

  switch (o.status) {
    case "paid":
      text =
        c.status === "active" && new Date(c.deadline) > now
          ? `Payment received. We'll confirm your order when the drive closes ${formatRelative(c.deadline, now)}.`
          : "Payment received. We'll confirm your order shortly.";
      break;

    case "confirmed":
      text =
        "Your order is confirmed. We'll let you know when it's being prepared.";
      break;

    case "preparing":
      text =
        o.fulfilment === "delivery"
          ? "Your order is being prepared. It'll be on its way soon."
          : "Your order is being prepared. We'll tell you when it's ready to collect.";
      break;

    case "dispatched":
      text = `Your order is on its way to ${where}.`;
      break;

    case "ready_for_collection":
      text = `Your order is ready to collect at ${where}.`;
      break;

    case "completed":
      text = "Order completed. Thanks for buying together!";
      break;

    case "cancelled":
      text = "This order was cancelled.";
      break;

    case "refunded":
      text = "This order was refunded.";
      break;

    default:
      text = statusOf(o.status).label;
  }

  return <p className="text-[15px] font-medium">{text}</p>;
}

function PriceBreakdown({ order: o }) {
  const unit = o.unit_price ?? o.campaign.campaign_price;
  const platform = o.platform_charge ?? 0;
  const logistics = o.logistics_charge ?? 0;
  const retail = o.campaign.product.retail_price;
  const saved = Math.max(0, (retail - unit) * o.quantity);
  const closed = statusOf(o.status).group === "closed";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 sm:px-6">
      <h2 className="mb-3 font-semibold">Price</h2>

      <dl className="grid gap-1.5 text-sm">
        <Row
          label={`${o.quantity} × ${formatMoney(unit)}`}
          value={formatMoney(o.quantity * unit)}
        />

        <Row
          label={`Platform fee (${o.quantity} × ${formatMoney(platform)})`}
          value={formatMoney(o.quantity * platform)}
        />

        <Row
          label={o.fulfilment === "delivery" ? "Delivery" : "Collection"}
          value={logistics > 0 ? formatMoney(logistics) : "Free"}
        />

        <div className="mt-1.5 flex items-baseline justify-between border-t border-stone-200 pt-2.5">
          <dt className="font-semibold">Total</dt>

          <dd
            className={`text-lg font-bold tabular-nums ${
              closed ? "text-stone-400 line-through" : ""
            }`}
          >
            {formatMoney(o.total_amount)}
          </dd>
        </div>
      </dl>

      {!closed && saved > 0 && (
        <p className="mt-2 text-[13px] font-semibold text-emerald-700">
          You save {formatMoney(saved)} vs the shop price of{" "}
          {formatMoney(retail)} per {o.campaign.product.unit}
        </p>
      )}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-stone-600">{label}</dt>

      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function PaymentCard({ payment }) {
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const refunded = payment.status === "refunded";

  async function copy() {
    try {
      await navigator.clipboard.writeText(payment.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard not available */
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Payment</h2>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            refunded
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {refunded ? "Refunded" : "Paid"}
        </span>
      </div>

      <dl className="grid gap-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-stone-600">Reference</dt>

          <dd className="flex items-center gap-2">
            <span className="font-mono tracking-wide">{payment.reference}</span>

            <button
              type="button"
              onClick={copy}
              className="text-xs font-semibold text-orange-700 hover:underline"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </dd>
        </div>

        <Row label="Amount" value={formatMoney(payment.amount)} />

        <Row label="Paid" value={formatDateTime(payment.paid_at)} />
      </dl>
    </section>
  );
}

function History({ history }) {
  if (!history.length) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-4 py-4 sm:px-6">
      <h2 className="mb-3 font-semibold">History</h2>

      <ol className="relative grid gap-4 border-l-2 border-stone-200 pl-5">
        {history.map((h, i) => {
          const latest = i === history.length - 1;
          const bad = h.status === "cancelled" || h.status === "refunded";

          return (
            <li key={`${h.status}-${h.created_at}`} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                  bad
                    ? "bg-red-600"
                    : latest
                      ? "bg-emerald-600 ring-4 ring-emerald-100"
                      : "bg-stone-400"
                }`}
              />

              <p className={`text-sm ${latest ? "font-semibold" : ""}`}>
                {HISTORY_TEXT[h.status] || statusOf(h.status).label}
              </p>

              {h.note && <p className="text-sm text-stone-600">{h.note}</p>}

              <p className="text-[13px] text-stone-500">
                {formatDateTime(h.created_at)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
