import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getCampaign } from "../../api/campaigns";
import { request, assetUrl } from "../../api/client";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import JoinCampaignModal from "./JoinCampaignModal";
import { kes, timeLeft } from "../../lib/format";

function formatDate(date) {
  if (!date) return "Not specified";

  return new Date(date).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function campaignState(campaign) {
  if (campaign.sold_out) {
    return { text: "Sold out", tone: "grey" };
  }

  if (campaign.min_reached) {
    return { text: "Minimum reached", tone: "green" };
  }

  return { text: "Building towards minimum", tone: "orange" };
}

function DetailLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      <div className="animate-pulse space-y-5">
        <div className="h-5 w-28 rounded bg-gray-200" />

        <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <div className="h-[350px] rounded-[20px] bg-gray-200" />
            <div className="h-[260px] rounded-[20px] bg-gray-200" />
          </div>

          <div className="space-y-4">
            <div className="h-[380px] rounded-[20px] bg-gray-200" />
            <div className="h-[60px] rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [locations, setLocations] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCampaign() {
      setStatus("loading");
      setError("");
      setCampaign(null);

      try {
        const data = await getCampaign(campaignId);

        if (cancelled) return;

        setCampaign(data);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;

        setError(err.message || "Unable to load this campaign.");
        setStatus("error");
      }
    }

    loadCampaign();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        const data = await request("/locations");

        if (cancelled) return;

        setLocations(Array.isArray(data) ? data : data?.locations || []);
      } catch {
        if (!cancelled) {
          setLocations([]);
        }
      }
    }

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  function handleOrderSuccess(order) {
    setShowJoinModal(false);

    if (order?.id) {
      navigate(`/orders/${order.id}`);
    } else {
      navigate("/orders");
    }
  }

  if (status === "loading") {
    return <DetailLoading />;
  }

  if (status === "error") {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <Link
          to="/shop"
          className="text-sm font-semibold text-forest hover:underline"
        >
          ← Back
        </Link>

        <div
          role="alert"
          className="mt-6 rounded-[20px] bg-bad-soft p-6 text-sm text-bad"
        >
          <h1 className="font-semibold">Unable to load campaign</h1>
          <p className="mt-1">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-forest px-5 py-2.5 font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const product = campaign.product;
  const imageSrc = assetUrl(product.image_url);
  const state = campaignState(campaign);

  const ordered = campaign.ordered_quantity || 0;
  const minimum = campaign.min_quantity || 0;
  const maximum = campaign.max_quantity || 0;

  const remaining = Math.max(
    0,
    campaign.remaining_quantity ?? maximum - ordered,
  );

  const savings =
    campaign.savings_per_unit ?? product.retail_price - campaign.campaign_price;

  const savingsPercentage =
    product.retail_price > 0
      ? Math.round((savings / product.retail_price) * 100)
      : 0;

  const minimumPosition =
    maximum > 0 ? Math.min(100, (minimum / maximum) * 100) : 0;

  const minimumReached = campaign.min_reached;
  const deadlinePassed = new Date(campaign.deadline).getTime() <= now;

  const activeLocations = locations.filter(
    (location) => location.active !== false,
  );

  const deliveryFees = activeLocations
    .map((location) => Number(location.delivery_fee))
    .filter((fee) => Number.isFinite(fee));

  const lowestDeliveryFee =
    deliveryFees.length > 0 ? Math.min(...deliveryFees) : null;

  const canJoin =
    campaign.can_join !== false &&
    !campaign.sold_out &&
    campaign.status === "active" &&
    !deadlinePassed;

  const source = product.source;

  return (
    <main className="mx-auto max-w-[1200px] px-4 pb-12 pt-5">
      <Link
        to="/shop"
        className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink-2 transition hover:bg-white"
      >
        ← Back
      </Link>

      <div className="mt-3 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <section className="flex min-w-0 flex-col gap-[18px]">
          <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-[20px] bg-white p-4 sm:min-h-[380px]">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={product.name}
                className="h-[300px] w-full object-contain sm:h-[350px]"
              />
            ) : (
              <div className="grid h-[300px] w-full place-items-center bg-canvas text-8xl font-bold text-forest/20">
                {product.name?.[0] || "B"}
              </div>
            )}
          </div>

          <div className="rounded-[20px] bg-white p-4 sm:p-[22px]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-ink">Campaign progress</h2>

              <span className="text-sm text-muted">
                Ends {formatDate(campaign.deadline)} ·{" "}
                {deadlinePassed ? "Ended" : timeLeft(campaign.deadline)}
              </span>
            </div>

            <div className="mt-[22px]">
              <ProgressBar
                value={ordered}
                min={minimum}
                max={maximum}
                label={`${ordered} ordered out of ${maximum}, minimum ${minimum}`}
              />
            </div>

            <div className="relative mt-3 h-5 text-[13px] text-muted">
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap font-semibold text-orange-text"
                style={{ left: `${minimumPosition}%` }}
              >
                Min {minimum}
              </span>

              <span className="absolute right-0">Max {maximum}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] bg-canvas p-3">
                <p className="text-[13px] text-muted">Ordered</p>
                <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">
                  {ordered}
                </p>
              </div>

              <div className="rounded-[16px] bg-canvas p-3">
                <p className="text-[13px] text-muted">Still available</p>
                <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">
                  {remaining}
                </p>
              </div>

              <div className="rounded-[16px] bg-canvas p-3">
                <p className="text-[13px] text-muted">Households</p>
                <p className="mt-1 text-[22px] font-bold tabular-nums text-ink">
                  {campaign.households ?? 0}
                </p>
              </div>
            </div>

            <div
              className={`mt-[14px] flex items-center gap-3 rounded-[14px] px-4 py-3 text-[15px] ${
                minimumReached
                  ? "bg-lime-soft font-medium text-forest"
                  : "bg-orange-soft font-medium text-orange-text"
              }`}
              role="status"
            >
              <span className="text-lg" aria-hidden="true">
                {minimumReached ? "✓" : "ⓘ"}
              </span>

              <p>
                {minimumReached
                  ? `Minimum of ${minimum} reached. This campaign will go ahead.`
                  : `Needs ${Math.max(0, minimum - ordered)} more. If it doesn't get there, everyone is refunded in full.`}
              </p>
            </div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-[14px]">
          <div className="flex flex-col gap-[10px] rounded-[20px] bg-white p-4 sm:p-[22px]">
            <div className="flex items-center justify-between">
              <Badge tone="orange">{campaign.title}</Badge>
            </div>

            <h1 className="text-[30px] font-bold leading-tight text-ink">
              {product.name}{" "}
              <span className="text-lg font-medium text-muted">
                {product.unit}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="text-base text-leaf" aria-hidden="true">
                ◈
              </span>

              {source === "seller" ? (
                <span>
                  Verified seller
                  {product.seller_name ? ` · ${product.seller_name}` : ""}
                </span>
              ) : (
                <span>Sourced by Bread & Basket</span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-[10px]">
              <span className="text-[34px] font-bold tabular-nums text-forest">
                {kes(campaign.campaign_price)}
              </span>

              <span className="text-sm text-muted line-through">
                {kes(product.retail_price)}
              </span>
            </div>

            <Badge tone="orange" className="self-start">
              You save {kes(savings)} ({savingsPercentage}%)
            </Badge>

            <p className="text-sm leading-relaxed text-ink-2">
              {product.description ||
                "Join this group campaign and enjoy savings when the minimum order quantity is reached."}
            </p>

            <div className="rounded-[16px] bg-canvas p-4 text-sm leading-[1.9] text-ink-2">
              <p>
                <strong className="text-ink">
                  Min {campaign.min_order_quantity ?? 1}
                  {" · "}
                  Max {campaign.max_per_user ?? "no limit"}
                </strong>{" "}
                per person
              </p>

              <p>
                Cancel free until {formatDate(campaign.cancellation_cutoff)}
              </p>

              <p>
                Delivery from{" "}
                <strong>
                  {lowestDeliveryFee !== null
                    ? kes(lowestDeliveryFee)
                    : "location-dependent"}
                </strong>{" "}
                per order, or free collection
              </p>
            </div>
          </div>

          <div className="sticky bottom-4 z-10">
            <button
              type="button"
              disabled={!canJoin}
              onClick={() => setShowJoinModal(true)}
              className="min-h-[54px] w-full rounded-full bg-lime px-5 text-[17px] font-bold text-forest shadow-[0_10px_24px_rgba(19,61,39,0.2)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {campaign.sold_out
                ? "Sold out"
                : deadlinePassed || campaign.status !== "active"
                  ? "Campaign closed"
                  : `Join campaign · from ${kes(
                      campaign.campaign_price + (campaign.platform_charge || 0),
                    )}`}
            </button>
          </div>
        </aside>
      </div>

      {showJoinModal && (
        <JoinCampaignModal
          campaign={campaign}
          locations={locations}
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleOrderSuccess}
        />
      )}
    </main>
  );
}
