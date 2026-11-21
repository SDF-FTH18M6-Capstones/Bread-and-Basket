import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/client";
import {
  cancelOrder,
  canCancelNow,
  canConfirmReceipt,
  confirmReceipt,
  fetchMyOrders,
  toSummary,
} from "../../api/orders";
import { formatDateTime, formatMoney, statusOf } from "./ordersUtils";
import {
  DriveProgress,
  EmptyState,
  ErrorState,
  Fulfilment,
  Loading,
  ProductThumb,
  ProgressSteps,
  RefundNote,
  StatusBadge,
  btnDanger,
  btnPrimary,
  btnSuccess,
} from "./ordersParts";

/* My orders page — uses the backend Orders API. */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Cancelled" },
];

export default function OrdersPage({
  loginUrl = "/login",
  browseUrl = "/",
  orderUrl = (order) => `/orders/${order.id}`,
}) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async ({ signal } = {}) => {
    setOrders(null);
    setError(null);

    try {
      const data = await fetchMyOrders({ signal });
      setOrders(data);
      setNow(new Date());
    } catch (err) {
      if (err.name === "AbortError") return;

      setError(err instanceof ApiError ? err : new ApiError(err.message));
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();

    load({ signal: ctrl.signal });

    return () => ctrl.abort();
  }, [load]);

  async function runAction(order, action) {
    if (
      action === "cancel" &&
      !window.confirm(
        `Cancel order ${order.order_no}? You'll get a full refund of ${formatMoney(order.total_amount)}.`,
      )
    ) {
      return;
    }

    setBusy({ id: order.id, action });
    setActionError(null);

    try {
      const updated =
        action === "cancel"
          ? await cancelOrder(order.id)
          : await confirmReceipt(order.id);

      setOrders((list) =>
        list.map((o) => (o.id === order.id ? toSummary(updated) : o)),
      );

      setNow(new Date());
    } catch (err) {
      if (err.status === 401) {
        setError(err);
        return;
      }

      setActionError({
        id: order.id,
        message: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(null);
    }
  }

  const counts = useMemo(() => {
    const c = {
      all: 0,
      active: 0,
      completed: 0,
      closed: 0,
    };

    for (const o of orders || []) {
      c.all += 1;
      c[statusOf(o.status).group] += 1;
    }

    return c;
  }, [orders]);

  const shown = (orders || []).filter(
    (o) => filter === "all" || statusOf(o.status).group === filter,
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-16">
        <h1 className="font-serif text-3xl font-semibold">My orders</h1>

        {orders && <Summary orders={orders} />}

        {error ? (
          <ErrorState
            error={error}
            loginUrl={loginUrl}
            onRetry={() => load()}
          />
        ) : !orders ? (
          <Loading />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            text="Join a group buy to get shop staples at wholesale prices."
          >
            <a href={browseUrl} className={btnPrimary}>
              Browse drives
            </a>
          </EmptyState>
        ) : (
          <>
            <FilterTabs value={filter} counts={counts} onChange={setFilter} />

            {shown.length === 0 ? (
              <EmptyState
                title={`No ${FILTERS.find((f) => f.id === filter).label.toLowerCase()} orders`}
                text="They'll show up here when you have some."
              />
            ) : (
              <ul
                role="tabpanel"
                aria-labelledby={`tab-${filter}`}
                className="grid gap-4"
              >
                {shown.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    now={now}
                    href={orderUrl ? orderUrl(o) : null}
                    busy={busy && busy.id === o.id ? busy.action : null}
                    actionError={
                      actionError && actionError.id === o.id
                        ? actionError.message
                        : null
                    }
                    onAction={runAction}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Summary({ orders }) {
  const live = orders.filter((o) => statusOf(o.status).group !== "closed");

  const active = live.filter(
    (o) => statusOf(o.status).group === "active",
  ).length;

  const saved = live.reduce(
    (sum, o) =>
      sum +
      Math.max(
        0,
        o.quantity * ((o.campaign && o.campaign.savings_per_unit) || 0),
      ),
    0,
  );

  if (!active && !saved) return null;

  return (
    <p className="mt-1.5 text-stone-500">
      {active > 0 && `${active} order${active === 1 ? "" : "s"} in progress`}

      {active > 0 && saved > 0 && " · "}

      {saved > 0 && (
        <>
          {active > 0 ? "you" : "You"}’ve saved{" "}
          <strong className="font-semibold text-emerald-700">
            {formatMoney(saved)}
          </strong>{" "}
          by buying together
        </>
      )}
    </p>
  );
}

function FilterTabs({ value, counts, onChange }) {
  function onKeyDown(e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
      return;
    }

    const i = FILTERS.findIndex((f) => f.id === value);

    const next =
      FILTERS[
        (i + (e.key === "ArrowRight" ? 1 : FILTERS.length - 1)) % FILTERS.length
      ].id;

    onChange(next);

    const el = document.getElementById(`tab-${next}`);

    if (el) el.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Filter orders"
      onKeyDown={onKeyDown}
      className="my-5 flex gap-1.5 overflow-x-auto"
    >
      {FILTERS.map((f) => {
        const selected = value === f.id;

        return (
          <button
            key={f.id}
            id={`tab-${f.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(f.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 ${
              selected
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-900 hover:border-stone-400"
            }`}
          >
            {f.label}

            <span
              className={`ml-1 tabular-nums ${
                selected ? "text-stone-300" : "text-stone-500"
              }`}
            >
              {counts[f.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OrderCard({ order: o, now, href, busy, actionError, onAction }) {
  const c = o.campaign;
  const p = c.product;
  const st = statusOf(o.status);

  const closed = st.group === "closed";
  const saved = o.quantity * c.savings_per_unit;

  const cancellable = canCancelNow(o, now);
  const receivable = canConfirmReceipt(o);

  return (
    <li
      aria-label={`Order ${o.order_no}`}
      className={`overflow-hidden rounded-2xl border border-stone-200 ${
        closed ? "bg-stone-50" : "bg-white"
      }`}
    >
      {/* Header */}
      <div className="grid grid-cols-[52px_1fr] items-start gap-x-3.5 gap-y-2 px-4 pt-4 pb-3.5 sm:grid-cols-[64px_1fr_auto] sm:px-5">
        <ProductThumb product={p} faded={closed} />

        <div className="min-w-0">
          <p className="font-semibold">
            {href ? (
              <a
                href={href}
                className="hover:underline focus:outline-none focus-visible:underline"
              >
                {p.name}
              </a>
            ) : (
              p.name
            )}{" "}
            <span className="font-normal text-stone-500">· {p.unit}</span>
          </p>

          <p className="text-sm">{c.title}</p>

          <p className="mt-0.5 text-[13px] text-stone-500">
            {o.order_no} · Placed {formatDateTime(o.created_at)}
          </p>
        </div>

        <StatusBadge
          status={o.status}
          className="col-start-2 justify-self-start sm:col-start-3"
        />
      </div>

      {/* Price */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-stone-200 px-4 py-3 sm:px-5">
        <div className="text-sm">
          {o.quantity} × {formatMoney(c.campaign_price)}
          {p.retail_price > c.campaign_price && (
            <s className="ml-1 text-stone-400">
              <span className="sr-only">shop price </span>
              {formatMoney(p.retail_price)}
            </s>
          )}
          {!closed && saved > 0 && (
            <span className="block text-[13px] font-semibold text-emerald-700">
              You save {formatMoney(saved)}
            </span>
          )}
        </div>

        <div className="text-right">
          <b
            className={`text-lg tabular-nums ${
              closed ? "text-stone-400 line-through" : ""
            }`}
          >
            {formatMoney(o.total_amount)}
          </b>

          <small className="block text-xs text-stone-500">
            {o.fulfilment === "delivery"
              ? "incl. platform fee & delivery"
              : "incl. platform fee"}
          </small>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-3.5 px-4 pt-1 pb-4 sm:px-5">
        {closed ? <RefundNote order={o} /> : <ProgressSteps order={o} />}

        {st.group === "active" && <DriveProgress campaign={c} now={now} />}

        {!closed && <Fulfilment order={o} />}

        {receivable && (
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
              onClick={() => onAction(o, "confirm")}
              className={btnSuccess}
            >
              {busy === "confirm" ? "Saving…" : "I’ve received it"}
            </button>
          </div>
        )}

        {cancellable && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-stone-200 pt-3 text-[13px] text-stone-500">
            <span>
              Free cancellation until {formatDateTime(o.cancellation_cutoff)}
            </span>

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => onAction(o, "cancel")}
              className={btnDanger}
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel order"}
            </button>
          </div>
        )}

        {actionError && (
          <p role="alert" className="text-sm text-red-700">
            {actionError}
          </p>
        )}

        {href && (
          <a
            href={href}
            className="justify-self-start text-sm font-semibold text-orange-700 hover:underline"
          >
            {closed ? "View order" : "Track order"}
          </a>
        )}
      </div>
    </li>
  );
}
