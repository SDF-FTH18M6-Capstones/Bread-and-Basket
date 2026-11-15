
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { request, assetUrl } from "../../api/client";
import { kes } from "../../lib/format";

export default function JoinCampaignModal({
  campaign,
  locations,
  onClose,
}) {
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

  const overlayClass =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 max-sm:items-end max-sm:p-0";

  const cardClass =
    "my-auto w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-[26px] shadow-2xl max-sm:mb-0 max-sm:max-h-[92vh] max-sm:rounded-b-none max-sm:rounded-t-[26px] max-sm:px-5 max-sm:pb-7";

  function ProductSummary({ amount, orderQuantity }) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          {productImage ? (
            <img
              src={productImage}
              alt={campaign.product.name}
              className="size-full object-contain"
            />
          ) : (
            <span className="text-2xl font-bold text-forest/30">
              {campaign.product.name?.[0] || "B"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            {campaign.title} · {orderQuantity} × {campaign.product.unit}
          </p>

          <p className="mt-1 text-[26px] font-bold leading-tight tabular-nums text-forest">
            {kes(amount)}
          </p>
        </div>
      </div>
    );
  }

  // WAITING SCREEN
  if (paymentStage === "waiting") {
    return (
      <div className={overlayClass}>
        <section role="dialog" aria-modal="true" className={cardClass}>
          <h2 className="mb-5 text-[22px] font-bold text-ink">
            Pay with M-Pesa
          </h2>

          <div className="space-y-5">
            <ProductSummary
              amount={order?.total_amount ?? total}
              orderQuantity={order?.quantity ?? quantity}
            />

            <div>
              <label className="block text-sm font-semibold text-ink">
                M-Pesa phone number
              </label>

              <input
                type="tel"
                value={phone}
                disabled
                className="mt-2 min-h-[52px] w-full rounded-xl border border-line bg-canvas px-4 text-lg tracking-wide text-ink"
              />
            </div>

            <div className="flex flex-col items-center rounded-2xl bg-canvas px-5 py-7 text-center">
              <div className="size-11 animate-spin rounded-full border-4 border-forest/20 border-t-forest" />

              <h3 className="mt-5 text-lg font-bold text-ink">
                Check your phone
              </h3>

              <p className="mt-2 text-sm text-muted">
                Waiting for your M-Pesa PIN…
              </p>
            </div>
          </div>
        </section>
      </div>
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
      <div className={overlayClass}>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-success-title"
          className={cardClass}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-[84px] items-center justify-center rounded-full bg-lime">
              <svg
                viewBox="0 0 48 48"
                className="size-11"
                fill="none"
                stroke="#133D27"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 25L20 35L39 14" />
              </svg>
            </div>

            <h2
              id="payment-success-title"
              className="text-[26px] font-bold text-ink"
            >
              Payment received
            </h2>

            <p className="text-sm leading-relaxed text-ink-2">
              Order <strong>#{orderNumber}</strong> · {kes(orderTotal)} · Ref{" "}
              <strong>{payment.reference || "—"}</strong>
            </p>
          </div>

          <div className="mt-6 w-full space-y-3 rounded-2xl bg-canvas p-4 text-sm tabular-nums">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Campaign</span>

              <span className="font-semibold text-ink">
                {campaignOrdered} / {campaign.max_quantity}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">
                Free cancellation until
              </span>

              <span className="text-right font-semibold text-ink">
                {campaign.cancellation_cutoff
                  ? new Date(campaign.cancellation_cutoff).toLocaleString(
                      "en-KE",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )
                  : "Not specified"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">
                {order?.fulfilment === "delivery"
                  ? "Delivery to"
                  : "Collect at"}
              </span>

              <span className="text-right font-semibold text-ink">
                {fulfilmentDescription}
              </span>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="min-h-[48px] flex-1 rounded-full bg-forest px-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              View my orders
            </button>

            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="min-h-[48px] flex-1 rounded-full border border-line px-3 text-sm font-semibold text-ink transition hover:bg-canvas"
            >
              Keep browsing
            </button>
          </div>
        </section>
      </div>
    );
  }

  // PAYMENT ERROR SCREEN
  if (paymentStage === "payment_error") {
    return (
      <div className={overlayClass}>
        <section role="dialog" aria-modal="true" className={cardClass}>
          <div className="text-center">
            <div className="mx-auto grid size-[72px] place-items-center rounded-full bg-bad-soft text-3xl font-bold text-bad">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-ink">
              Payment not confirmed
            </h2>

            <p className="mt-2 text-sm text-muted">
              Your payment could not be confirmed. Check your orders before
              trying again.
            </p>

            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="mt-6 min-h-[50px] w-full rounded-full bg-forest font-bold text-white"
            >
              View my orders
            </button>
          </div>
        </section>
      </div>
    );
  }

  // M-PESA SCREEN
  if (paymentStage === "mpesa") {
    return (
      <div className={overlayClass}>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="mpesa-title"
          className={cardClass}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setFieldErrors({});
                setPaymentStage("checkout");
              }}
              className="grid size-9 place-items-center rounded-full bg-canvas text-xl text-ink-2 transition hover:bg-line"
              aria-label="Back to checkout"
            >
              ←
            </button>

            <h2
              id="mpesa-title"
              className="flex-1 text-center text-[22px] font-bold text-ink"
            >
              Pay with M-Pesa
            </h2>

            <div className="size-9" />
          </div>

          <form onSubmit={handlePayment} className="space-y-4">
            <ProductSummary amount={total} orderQuantity={quantity} />

            <label
              htmlFor="mpesa-phone"
              className="block text-sm font-semibold text-ink"
            >
              M-Pesa phone number

              <input
                id="mpesa-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={submitting}
                placeholder="0712 345 678"
                className="mt-2 min-h-[52px] w-full rounded-xl border border-line bg-white px-4 text-lg tracking-wide outline-none transition focus:border-forest"
              />

              {getFieldError("phone") && (
                <span className="mt-1 block text-sm font-normal text-bad">
                  {getFieldError("phone")}
                </span>
              )}
            </label>

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

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[52px] w-full rounded-full bg-lime px-5 font-bold text-forest transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Send payment prompt"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // JOIN CAMPAIGN / QUANTITY SELECTION
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-campaign-title"
        className="my-auto w-full max-w-[560px] rounded-[22px] bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="join-campaign-title"
              className="text-2xl font-bold text-forest"
            >
              Join campaign
            </h2>

            <p className="mt-1 text-sm text-muted">
              {campaign.product.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-xl text-ink-2 hover:bg-line"
          >
            ×
          </button>
        </div>

        <form onSubmit={continueToPayment} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="order-quantity"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              Quantity
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateQuantity(quantity - 1)}
                disabled={quantity <= minimum}
                className="grid size-11 place-items-center rounded-full bg-canvas text-xl font-bold text-forest disabled:opacity-40"
              >
                −
              </button>

              <input
                id="order-quantity"
                type="number"
                min={minimum}
                max={maximum}
                value={quantity}
                onChange={(event) => updateQuantity(event.target.value)}
                disabled={maximum < minimum}
                className="h-11 w-24 rounded-xl border border-line text-center font-bold text-ink outline-none focus:border-forest"
              />

              <button
                type="button"
                onClick={() => updateQuantity(quantity + 1)}
                disabled={quantity >= maximum}
                className="grid size-11 place-items-center rounded-full bg-canvas text-xl font-bold text-forest disabled:opacity-40"
              >
                +
              </button>

              <span className="text-sm text-muted">
                Min {minimum} · Max {maximum}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              How would you like to receive your order?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfilment("delivery")}
                className={`rounded-xl border p-3 text-sm font-semibold transition ${
                  fulfilment === "delivery"
                    ? "border-forest bg-lime-soft text-forest"
                    : "border-line text-ink-2 hover:bg-canvas"
                }`}
              >
                Delivery
              </button>

              <button
                type="button"
                onClick={() => setFulfilment("collection")}
                className={`rounded-xl border p-3 text-sm font-semibold transition ${
                  fulfilment === "collection"
                    ? "border-forest bg-lime-soft text-forest"
                    : "border-line text-ink-2 hover:bg-canvas"
                }`}
              >
                Collection
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="order-location"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              {fulfilment === "delivery"
                ? "Delivery location"
                : "Collection location"}
            </label>

            <select
              id="order-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest"
            >
              <option value="">Choose a location</option>

              {activeLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>

            {activeLocations.length === 0 && (
              <p className="mt-2 text-sm text-bad">
                No locations are currently available.
              </p>
            )}
          </div>

          {fulfilment === "delivery" && (
            <div>
              <label
                htmlFor="delivery-address"
                className="mb-2 block text-sm font-semibold text-ink"
              >
                Delivery address
              </label>

              <textarea
                id="delivery-address"
                rows={2}
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Enter your estate, street, building or other delivery details"
                className="w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-forest"
              />
            </div>
          )}

          <div className="rounded-[16px] bg-canvas p-4">
            <h3 className="mb-3 font-bold text-ink">
              Price breakdown
            </h3>

            <div className="space-y-2 text-sm text-ink-2">
              <div className="flex justify-between gap-3">
                <span>
                  Campaign price ({quantity} × {kes(campaignPrice)})
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

              <div className="flex justify-between gap-3 border-t border-line pt-3 text-base font-bold text-forest">
                <span>Total</span>
                <span>{kes(total)}</span>
              </div>

              <p
                className={`pt-1 text-xs ${
                  savings > 0 ? "font-medium text-green-700" : "text-muted"
                }`}
              >
                You'd pay {kes(retailTotal)} at retail
                {savings > 0 ? ` · you save ${kes(savings)}` : ""}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-bad-soft p-3 text-sm text-bad"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={maximum < minimum || activeLocations.length === 0}
            className="min-h-[52px] w-full rounded-full bg-lime px-5 font-bold text-forest transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue · {kes(total)}
          </button>
        </form>
      </section>
    </div>
  );
}
