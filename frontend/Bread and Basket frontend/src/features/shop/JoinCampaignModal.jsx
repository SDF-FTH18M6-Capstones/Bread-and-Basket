import { useMemo, useState } from "react";

import { request } from "../../api/client";
import { kes } from "../../lib/format";

export default function JoinCampaignModal({
  campaign,
  locations,
  onClose,
  onSuccess,
}) {
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

  const deliveryFee =
    fulfilment === "delivery" && selectedLocation
      ? Number(selectedLocation.delivery_fee || 0)
      : 0;

  const subtotal = quantity * (campaignPrice + platformFee);
  const total = subtotal + deliveryFee;

  function updateQuantity(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return;

    setQuantity(Math.max(minimum, Math.min(maximum, parsed)));
  }

  async function handleSubmit(event) {
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

      const order = await request("/orders", {
        method: "POST",
        body: orderData,
      });

      onSuccess(order);
    } catch (err) {
      setError(err.message || "Unable to create your order. Please try again.");

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

            <p className="mt-1 text-sm text-muted">{campaign.product.name}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-xl text-ink-2 hover:bg-line disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Quantity */}
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
                disabled={quantity <= minimum || submitting}
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
                disabled={submitting || maximum < minimum}
                className="h-11 w-24 rounded-xl border border-line text-center font-bold text-ink outline-none focus:border-forest"
              />

              <button
                type="button"
                onClick={() => updateQuantity(quantity + 1)}
                disabled={quantity >= maximum || submitting}
                className="grid size-11 place-items-center rounded-full bg-canvas text-xl font-bold text-forest disabled:opacity-40"
              >
                +
              </button>

              <span className="text-sm text-muted">
                Min {minimum} · Max {maximum}
              </span>
            </div>
          </div>

          {/* Fulfilment */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              How would you like to receive your order?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfilment("delivery")}
                disabled={submitting}
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
                disabled={submitting}
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

          {/* Location */}
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
              disabled={submitting}
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

          {/* Delivery address */}
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
                disabled={submitting}
                placeholder="Enter your estate, street, building or other delivery details"
                className="w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-forest"
              />
            </div>
          )}

          {/* M-Pesa phone */}
          <div>
            <label
              htmlFor="mpesa-phone"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              M-Pesa phone number
            </label>

            <input
              id="mpesa-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={submitting}
              placeholder="e.g. 07XXXXXXXX"
              className="h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-forest"
            />
          </div>

          {/* Price breakdown */}
          <div className="rounded-[16px] bg-canvas p-4">
            <h3 className="mb-3 font-bold text-ink">Price breakdown</h3>

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
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-bad-soft p-3 text-sm text-bad"
            >
              {error}
            </div>
          )}

          {Object.entries(fieldErrors).map(([field, message]) => (
            <p key={field} className="text-sm text-bad">
              {field}: {Array.isArray(message) ? message.join(", ") : message}
            </p>
          ))}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              submitting || maximum < minimum || activeLocations.length === 0
            }
            className="min-h-[52px] w-full rounded-full bg-lime px-5 font-bold text-forest transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Placing order..." : `Continue · ${kes(total)}`}
          </button>

          <p className="text-center text-xs text-muted">
            Your order will be submitted for M-Pesa payment.
          </p>
        </form>
      </section>
    </div>
  );
}
