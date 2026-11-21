import { useEffect, useState } from "react";
import { request } from "../../api/client";
import ProgressBar from "../../components/ui/ProgressBar";
import { productImage } from "../../lib/productImages";
import { confirmStock } from "../../api/sellerProducts";
import { LoaderCircle, PackageCheck } from "lucide-react";

const STATUS = {
  active: { label: "Open", className: "bg-lime-soft text-forest" },
  successful: { label: "Minimum reached", className: "bg-forest text-white" },
  fulfilling: {
    label: "Fulfilling",
    className: "bg-orange-soft text-orange-text",
  },
  completed: { label: "Completed", className: "bg-grey-soft text-ink-2" },
  failed: { label: "Didn't reach minimum", className: "bg-bad-soft text-bad" },
  cancelled: { label: "Cancelled", className: "bg-grey-soft text-muted" },
};

export default function SellerCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmStockError, setConfirmStockError] = useState(null);

  async function fetchCampaigns() {
    setLoading(true);
    setError("");

    try {
      const data = await request("/seller/campaigns");
      setCampaigns(data);
    } catch (err) {
      setError(err.message || "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
  }, []);

  function formatPrice(price) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 2,
    }).format(price || 0);
  }

  function formatDate(date) {
    if (!date) return "Not specified";

    return new Date(date).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function handleConfirmStock(campaignId) {
    setConfirmingId(campaignId);
    setConfirmStockError(null);
    try {
      const updated = await confirmStock(campaignId);
      // Option b: swap in the campaign the server sent back
      setCampaigns((current) =>
        current.map((c) => (c.id === updated.id ? updated : c)),
      );
    } catch (err) {
      setConfirmStockError(err.message || "Unable to confirm stock.");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 md:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">
            My campaigns
          </h1>
          <p className="text-muted">Every campaign running on your products.</p>
        </div>
        {!loading && !error && campaigns.length > 0 && (
          <span className="text-sm text-muted">
            {campaigns.length}{" "}
            {campaigns.length === 1 ? "campaign" : "campaigns"}
          </span>
        )}
      </div>

      {loading && (
        <div
          aria-busy="true"
          aria-label="Loading"
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-[20px] bg-grey-soft"
            />
          ))}
        </div>
      )}

      {confirmStockError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          {confirmStockError}
        </p>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl bg-bad-soft p-6 text-center"
        >
          <p className="font-semibold text-bad">{error}</p>
          <button
            type="button"
            onClick={fetchCampaigns}
            className="mt-4 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="mt-6 rounded-[20px] bg-white px-4 py-12 text-center">
          <p className="font-semibold">You don't have any campaigns yet</p>
          <p className="mt-1 text-sm text-muted">
            When an admin opens a campaign for one of your approved products, it
            shows here.
          </p>
        </div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const status = STATUS[campaign.status];
            const ordered = campaign.ordered_quantity ?? 0;
            const supplying = ["successful", "fulfilling"].includes(
              campaign.status,
            );

            return (
              <article
                key={campaign.id}
                className="flex flex-col rounded-[20px] bg-white p-5"
              >
                {/* Header: picture, title, status */}
                <div className="flex items-start gap-4">
                  <img
                    src={productImage(campaign.product)}
                    alt={campaign.product?.name ?? ""}
                    className="size-16 shrink-0 rounded-xl bg-canvas object-contain p-1.5"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-semibold leading-tight">
                      {campaign.title}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {campaign.product?.name}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        status?.className ?? "bg-grey-soft text-ink-2"
                      }`}
                    >
                      {status?.label ?? campaign.status}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-2xl font-bold tabular-nums text-forest">
                    {formatPrice(campaign.campaign_price)}
                  </span>
                  <span className="text-xs font-semibold text-orange-text">
                    Shoppers save {formatPrice(campaign.savings_per_unit)}
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <ProgressBar
                    value={ordered}
                    min={campaign.min_quantity}
                    max={campaign.max_quantity}
                    label={`${ordered} of ${campaign.max_quantity} units ordered, minimum ${campaign.min_quantity}`}
                  />
                  <p className="mt-1.5 text-xs tabular-nums text-muted">
                    {ordered} of {campaign.max_quantity} units · minimum{" "}
                    {campaign.min_quantity}
                  </p>
                </div>

                {/* Key numbers */}
                <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-canvas p-3 text-center">
                  <div>
                    <dt className="text-[11px] text-muted">Units ordered</dt>
                    <dd className="font-bold tabular-nums">{ordered}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Households</dt>
                    <dd className="font-bold tabular-nums">
                      {campaign.households ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Deadline</dt>
                    <dd className="text-sm font-bold">
                      {formatDate(campaign.deadline)}
                    </dd>
                  </div>
                </dl>

                {/* Stock confirmation: only once a campaign has succeeded */}
                {supplying && (
                  <div className="mt-auto pt-4">
                    {campaign.stock_confirmed_at ? (
                      <p className="rounded-xl bg-lime-soft px-3 py-2.5 text-center text-sm font-semibold text-forest">
                        ✓ Stock confirmed{" "}
                        {formatDate(campaign.stock_confirmed_at)}
                      </p>
                    ) : (
                      <div className="rounded-xl bg-orange-soft p-3">
                        <p className="text-center text-sm font-semibold text-orange-text">
                          Confirm you can supply {ordered} units
                        </p>
                        <button
                          type="button"
                          onClick={() => handleConfirmStock(campaign.id)}
                          disabled={confirmingId === campaign.id}
                          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-forest py-2.5 text-sm font-semibold text-white transition hover:bg-forest-deep disabled:cursor-wait disabled:opacity-60"
                        >
                          {confirmingId === campaign.id ? (
                            <>
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                              Confirming...
                            </>
                          ) : (
                            <>
                              <PackageCheck size={16} aria-hidden="true" />
                              Confirm stock
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
