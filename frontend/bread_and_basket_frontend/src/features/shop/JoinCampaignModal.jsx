import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, X } from "lucide-react";

import { request, assetUrl } from "../../api/client";
import { kes } from "../../lib/format";

function ModalShell({ labelledBy, onBackdrop, children }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBackdrop?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="flex max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:max-h-[88dvh] sm:rounded-[24px]"
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}

function ModalHeader({ id, title, subtitle, onBack, onClose }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-grey-soft px-5 py-3.5">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-2 transition hover:bg-line"
        >
          <ArrowLeft size={18} />
        </button>
      ) : null}

      <div className="min-w-0 flex-1">
        <h2
          id={id}
          className="truncate text-lg font-bold leading-tight text-ink"
        >
          {title}
        </h2>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-ink-2 transition hover:bg-line"
        >
          <X size={18} />
        </button>
      ) : null}
    </header>
  );
}

// Scrollable middle part
const BODY = "min-h-0 flex-1 overflow-y-auto px-5 py-4";
// Bottom bar that always stays visible (clears the phone's home indicator)
const FOOTER =
  "shrink-0 border-t border-grey-soft bg-white px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]";

const PRIMARY_BTN =
  "min-h-12 w-full rounded-full bg-lime px-5 font-bold text-forest transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50";
const FIELD =
  "w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-forest";
const LABEL = "mb-1.5 block text-sm font-semibold text-ink";

/* ---------- Component ---------- */

export default function JoinCampaignModal({ campaign, locations, onClose }) {
  const navigate = useNavigate();

  const minimum = Number(campaign.min_order_quantity || 1);

  const maximum = Number(
    campaign.max_orderable ??
      campaign.remaining_quantity ??
      campaign.max_quantity - campaign.ordered_quantity,
  );

  const [quantity, setQuantity] = useState(Math.min(minimum, maximum));
  const [fulfilment, setFulfilment] = useState("delivery");
  const [locationId, setLocationId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [paymentStage, setPaymentStage] = useState("checkout");
  const [order, setOrder] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const activeLocations = useMemo(
    () => locations.filter((location) => location.active !== false),
    [locations],
  );

  const selectedLocation = activeLocations.find(
    (location) => String(location.id) === String(locationId),
  );

  const platformFee = Number(campaign.platform_charge || 0);
  const campaignPrice = Number(campaign.campaign_price || 0);
  const retailPrice = Number(campaign.product.retail_price || 0);

  const deliveryFee =
    fulfilment === "delivery" && selectedLocation
      ? Number(selectedLocation.delivery_fee || 0)
      : 0;

  const subtotal = quantity * (campaignPrice + platformFee);
  const total = subtotal + deliveryFee;

  const retailTotal = quantity * retailPrice;
  const savings = Math.max(0, retailTotal - total);

  const productImage = assetUrl(campaign.product.image_url);

  // Stop the page behind the modal from scrolling while it's open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (paymentStage !== "waiting" || !order) return;

    const timer = setTimeout(() => {
      if (order.payment?.status === "successful") {
        setPaymentStage("success");
      } else {
        setPaymentStage("payment_error");
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [paymentStage, order]);

  function updateQuantity(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return;

    setQuantity(Math.max(minimum, Math.min(maximum, parsed)));
  }

  function continueToPayment(event) {
    event.preventDefault();

    setError("");
    setFieldErrors({});

    if (maximum < minimum) {
      setError("There are not enough units available to join this campaign.");
      return;
    }

    if (quantity < minimum || quantity > maximum) {
      setError(`Choose a quantity between ${minimum} and ${maximum}.`);
      return;
    }

    if (!locationId) {
      setError("Please select a location.");
      return;
    }

    if (fulfilment === "delivery" && !deliveryAddress.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    setPaymentStage("mpesa");
  }

  async function handlePayment(event) {
    event.preventDefault();

    setError("");
    setFieldErrors({});

    if (!phone.trim()) {
      setError("Please enter your M-Pesa phone number.");
      return;
    }

    const orderData = {
      campaign_id: Number(campaign.id),
      quantity: Number(quantity),
      fulfilment,
      phone: phone.trim(),
      location_id: Number(locationId),
    };

    if (fulfilment === "delivery") {
      orderData.delivery_address = deliveryAddress.trim();
    }

    try {
      setSubmitting(true);

      const createdOrder = await request("/orders", {
        method: "POST",
        body: orderData,
      });

      setOrder(createdOrder);
      setPaymentStage("waiting");
    } catch (err) {
      setError(
        err.message || "Unable to process your order. Please try again.",
      );
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  }

  function getFieldError(field) {
    const value = fieldErrors[field];

    if (Array.isArray(value)) return value.join(", ");

    return value || "";
  }

  function ProductSummary({ amount, orderQuantity }) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          {productImage ? (
            <img
              src={productImage}
              alt={campaign.product.name}
              className="size-full object-contain p-1"
            />
          ) : (
            <span className="text-xl font-bold text-forest/30">
              {campaign.product.name?.[0] || "B"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">
            {campaign.title} · {orderQuantity} × {campaign.product.unit}
          </p>
          <p className="mt-0.5 text-[22px] font-bold leading-tight tabular-nums text-forest">
            {kes(amount)}
          </p>
        </div>
      </div>
    );
  }

  // WAITING SCREEN
  if (paymentStage === "waiting") {
    return (
      <ModalShell labelledBy="mpesa-waiting-title">
        <ModalHeader id="mpesa-waiting-title" title="Pay with M-Pesa" />

        <div className={`${BODY} space-y-4`}>
          <ProductSummary
            amount={order?.total_amount ?? total}
            orderQuantity={order?.quantity ?? quantity}
          />

          <div className="flex flex-col items-center rounded-2xl bg-canvas px-5 py-6 text-center">
            <div className="size-10 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />
            <h3 className="mt-4 text-base font-bold text-ink">
              Check your phone
            </h3>
            <p className="mt-1 text-sm text-muted">
              Enter your M-Pesa PIN on{" "}
              <span className="font-semibold text-ink">{phone}</span>
            </p>
          </div>
        </div>
      </ModalShell>
    );
  }

  // SUCCESS SCREEN
  if (paymentStage === "success") {
    const payment = order?.payment || {};
    const orderNumber = order?.order_number || order?.id || "Confirmed";
    const orderTotal = order?.total_amount ?? payment.amount ?? total;

    const campaignOrdered =
      Number(campaign.ordered_quantity || 0) +
      Number(order?.quantity || quantity);

    const locationName = selectedLocation?.name || "Your selected location";

    const fulfilmentDescription =
      order?.fulfilment === "delivery"
        ? order?.delivery_address || locationName
        : locationName;

    return (
      <ModalShell labelledBy="payment-success-title">
        <div className={BODY}>
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-lime text-forest">
              <Check size={34} strokeWidth={3} aria-hidden="true" />
            </div>

            <h2
              id="payment-success-title"
              className="text-[22px] font-bold text-ink"
            >
              Payment received
            </h2>

            <p className="text-sm leading-relaxed text-ink-2">
              Order <strong>#{orderNumber}</strong> · {kes(orderTotal)} · Ref{" "}
              <strong>{payment.reference || "—"}</strong>
            </p>
          </div>

          <dl className="mt-5 space-y-2.5 rounded-2xl bg-canvas p-4 text-sm tabular-nums">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted">Campaign</dt>
              <dd className="font-semibold text-ink">
                {campaignOrdered} / {campaign.max_quantity}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Free cancellation until</dt>
              <dd className="text-right font-semibold text-ink">
                {campaign.cancellation_cutoff
                  ? new Date(campaign.cancellation_cutoff).toLocaleString(
                      "en-KE",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )
                  : "Not specified"}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">
                {order?.fulfilment === "delivery"
                  ? "Delivery to"
                  : "Collect at"}
              </dt>
              <dd className="min-w-0 break-words text-right font-semibold text-ink">
                {fulfilmentDescription}
              </dd>
            </div>
          </dl>
        </div>

        <div className={`${FOOTER} flex gap-2.5`}>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="min-h-12 flex-1 rounded-full bg-forest px-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            View my orders
          </button>
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="min-h-12 flex-1 rounded-full border border-line px-3 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Keep browsing
          </button>
        </div>
      </ModalShell>
    );
  }

  // PAYMENT ERROR SCREEN
  if (paymentStage === "payment_error") {
    return (
      <ModalShell labelledBy="payment-error-title">
        <div className={`${BODY} text-center`}>
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-bad-soft text-bad">
            <AlertCircle size={28} aria-hidden="true" />
          </div>
          <h2
            id="payment-error-title"
            className="mt-4 text-xl font-bold text-ink"
          >
            Payment not confirmed
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Your payment could not be confirmed. Check your orders before trying
            again.
          </p>
        </div>

        <div className={FOOTER}>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="min-h-12 w-full rounded-full bg-forest font-bold text-white"
          >
            View my orders
          </button>
        </div>
      </ModalShell>
    );
  }

  // M-PESA SCREEN
  if (paymentStage === "mpesa") {
    return (
      <ModalShell labelledBy="mpesa-title">
        <ModalHeader
          id="mpesa-title"
          title="Pay with M-Pesa"
          onBack={() => {
            if (submitting) return;
            setError("");
            setFieldErrors({});
            setPaymentStage("checkout");
          }}
        />

        <form onSubmit={handlePayment} className="flex min-h-0 flex-1 flex-col">
          <div className={`${BODY} space-y-4`}>
            <ProductSummary amount={total} orderQuantity={quantity} />

            <div>
              <label htmlFor="mpesa-phone" className={LABEL}>
                M-Pesa phone number
              </label>
              <input
                id="mpesa-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={submitting}
                placeholder="0712 345 678"
                className={`${FIELD} h-12 text-base tracking-wide`}
              />
              {getFieldError("phone") && (
                <span className="mt-1 block text-sm text-bad">
                  {getFieldError("phone")}
                </span>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-bad-soft p-3 text-sm text-bad"
              >
                {error}
              </div>
            )}

            {Object.entries(fieldErrors)
              .filter(([field]) => field !== "phone")
              .map(([field, message]) => (
                <p key={field} className="text-sm text-bad">
                  {field}:{" "}
                  {Array.isArray(message) ? message.join(", ") : message}
                </p>
              ))}
          </div>

          <div className={FOOTER}>
            <button type="submit" disabled={submitting} className={PRIMARY_BTN}>
              {submitting ? "Processing..." : "Send payment prompt"}
            </button>
          </div>
        </form>
      </ModalShell>
    );
  }

  // JOIN CAMPAIGN / QUANTITY SELECTION
  const choiceClass = (selected) =>
    `min-h-11 rounded-xl border text-sm font-semibold transition ${
      selected
        ? "border-forest bg-lime-soft text-forest"
        : "border-line text-ink-2 hover:bg-canvas"
    }`;

  return (
    <ModalShell
      labelledBy="join-campaign-title"
      onBackdrop={() => {
        if (!submitting) onClose();
      }}
    >
      <ModalHeader
        id="join-campaign-title"
        title="Join campaign"
        subtitle={campaign.product.name}
        onClose={onClose}
      />

      <form
        onSubmit={continueToPayment}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className={`${BODY} space-y-4`}>
          {/* Quantity */}
          <div>
            <label htmlFor="order-quantity" className={LABEL}>
              Quantity
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => updateQuantity(quantity - 1)}
                disabled={quantity <= minimum}
                aria-label="Decrease quantity"
                className="grid size-10 place-items-center rounded-full bg-canvas text-lg font-bold text-forest disabled:opacity-40"
              >
                −
              </button>
              <input
                id="order-quantity"
                type="number"
                inputMode="numeric"
                min={minimum}
                max={maximum}
                value={quantity}
                onChange={(event) => updateQuantity(event.target.value)}
                disabled={maximum < minimum}
                className="h-10 w-20 rounded-xl border border-line text-center font-bold text-ink outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={() => updateQuantity(quantity + 1)}
                disabled={quantity >= maximum}
                aria-label="Increase quantity"
                className="grid size-10 place-items-center rounded-full bg-canvas text-lg font-bold text-forest disabled:opacity-40"
              >
                +
              </button>
              <span className="text-xs text-muted">
                Min {minimum} · Max {maximum}
              </span>
            </div>
          </div>

          {/* Fulfilment */}
          <div>
            <p className={LABEL}>How would you like to receive it?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFulfilment("delivery")}
                className={choiceClass(fulfilment === "delivery")}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setFulfilment("collection")}
                className={choiceClass(fulfilment === "collection")}
              >
                Collection
              </button>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="order-location" className={LABEL}>
              {fulfilment === "delivery"
                ? "Delivery location"
                : "Collection location"}
            </label>
            <select
              id="order-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className={`${FIELD} h-11`}
            >
              <option value="">Choose a location</option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            {activeLocations.length === 0 && (
              <p className="mt-1.5 text-sm text-bad">
                No locations are currently available.
              </p>
            )}
            {fulfilment === "collection" &&
              selectedLocation?.collection_point && (
                <p className="mt-1.5 text-xs text-muted">
                  Pick up at {selectedLocation.collection_point}
                </p>
              )}
          </div>

          {/* Address */}
          {fulfilment === "delivery" && (
            <div>
              <label htmlFor="delivery-address" className={LABEL}>
                Delivery address
              </label>
              <textarea
                id="delivery-address"
                rows={2}
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Estate, street, building…"
                className={`${FIELD} resize-none py-2.5`}
              />
            </div>
          )}

          {/* Price breakdown */}
          <div className="rounded-2xl bg-canvas p-3.5">
            <div className="space-y-1.5 text-sm tabular-nums text-ink-2">
              <div className="flex justify-between gap-3">
                <span>
                  {quantity} × {kes(campaignPrice)}
                </span>
                <span>{kes(quantity * campaignPrice)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>
                  Platform fee ({quantity} × {kes(platformFee)})
                </span>
                <span>{kes(quantity * platformFee)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>
                  {fulfilment === "delivery"
                    ? "Delivery fee"
                    : "Collection fee"}
                </span>
                <span>{kes(deliveryFee)}</span>
              </div>
            </div>
            <p
              className={`mt-2.5 text-xs ${savings > 0 ? "font-semibold text-leaf" : "text-muted"}`}
            >
              {kes(retailTotal)} at retail
              {savings > 0 ? ` · you save ${kes(savings)}` : ""}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-bad-soft p-3 text-sm text-bad"
            >
              {error}
            </div>
          )}
        </div>

        {/* Total + button always visible */}
        <div className={FOOTER}>
          <button
            type="submit"
            disabled={maximum < minimum || activeLocations.length === 0}
            className={PRIMARY_BTN}
          >
            Continue · {kes(total)}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
