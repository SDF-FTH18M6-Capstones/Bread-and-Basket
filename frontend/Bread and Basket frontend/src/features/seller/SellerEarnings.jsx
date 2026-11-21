import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Truck, Wallet } from "lucide-react";

import { request } from "../../api/client";
import { productImage } from "../../lib/productImages";

// Everything the page needs to know about each campaign status, in one place.
// `bucket` = which tile the money counts towards; null = counts nowhere.
const STATUS = {
  completed: {
    label: "Completed",
    bucket: "earned",
    badge: "bg-lime-soft text-forest",
  },
  successful: {
    label: "Sold",
    bucket: "inProgress",
    badge: "bg-orange-soft text-orange-text",
  },
  fulfilling: {
    label: "Being delivered",
    bucket: "inProgress",
    badge: "bg-orange-soft text-orange-text",
  },
  active: { label: "Open", bucket: "open", badge: "bg-grey-soft text-ink-2" },
  failed: {
    label: "Failed · refunded",
    bucket: null,
    badge: "bg-bad-soft text-bad",
  },
  cancelled: {
    label: "Cancelled",
    bucket: null,
    badge: "bg-bad-soft text-bad",
  },
  draft: { label: "Draft", bucket: null, badge: "bg-grey-soft text-muted" },
};
const UNKNOWN = {
  label: "Unknown",
  bucket: null,
  badge: "bg-grey-soft text-muted",
};

function formatPrice(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

const TILE = {
  dark: {
    box: "bg-forest",
    label: "text-white/75",
    value: "text-lime",
    icon: "text-lime",
  },
  plain: {
    box: "bg-white",
    label: "text-muted",
    value: "text-forest",
    icon: "text-forest",
  },
};

function Tile({ label, value, note, icon: Icon, tone = "plain" }) {
  const t = TILE[tone];
  return (
    <article className={`min-w-0 rounded-[18px] p-4 sm:p-5 ${t.box}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm ${t.label}`}>{label}</p>
        <Icon size={18} className={t.icon} aria-hidden="true" />
      </div>
      <p
        className={`mt-1 break-words text-[22px] font-bold tabular-nums sm:text-[26px] ${t.value}`}
      >
        {value}
      </p>
      <p className={`mt-1 text-xs leading-snug ${t.label}`}>{note}</p>
    </article>
  );
}

export default function SellerEarnings() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // 1. Fetch once, and again whenever "Try again" bumps `attempt`
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    request("/seller/campaigns")
      .then((data) => {
        if (!cancelled) setCampaigns(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load your earnings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // 2. Rows: each campaign + status info + amount, biggest first.
  //    map() returns a NEW array, so sort() never touches the state array.
  const rows = campaigns
    .map((campaign) => {
      const info = STATUS[campaign.status] ?? UNKNOWN;
      const units = Number(campaign.ordered_quantity || 0);
      const price = Number(campaign.campaign_price || 0);
      return {
        ...campaign,
        info,
        units,
        price,
        amount: info.bucket ? units * price : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 3. Totals: one pass, adding each amount into its bucket.
  const totals = rows.reduce(
    (acc, row) => {
      if (row.info.bucket) acc[row.info.bucket] += row.amount;
      return acc;
    },
    { earned: 0, inProgress: 0, open: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-12 pt-5 text-ink md:px-8">
      <header className="mb-5">
        <p className="text-sm text-muted">
          What you've sold through Bread &amp; Basket
        </p>
        <h1 className="text-[27px] font-bold leading-tight tracking-tight sm:text-[30px]">
          Earnings
        </h1>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-[14px] bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          {error}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="ml-2 font-bold underline"
          >
            Try again
          </button>
        </p>
      )}

      {/* Tiles */}
      <section
        aria-label="Earnings summary"
        className="mb-5 grid gap-2.5 sm:grid-cols-3 sm:gap-3.5"
      >
        <Tile
          tone="dark"
          icon={CheckCircle2}
          label="Earned"
          value={loading ? "—" : formatPrice(totals.earned)}
          note="Delivered and confirmed by shoppers"
        />
        <Tile
          icon={Truck}
          label="In progress"
          value={loading ? "—" : formatPrice(totals.inProgress)}
          note="Sold, being delivered now"
        />
        <Tile
          icon={Clock}
          label="Open campaigns"
          value={loading ? "—" : formatPrice(totals.open)}
          note="Can still change before the deadline"
        />
      </section>

      {/* Per-campaign list */}
      <section className="rounded-[20px] bg-white p-[18px] sm:p-[22px]">
        <h2 className="text-xl font-bold leading-tight tracking-tight">
          By campaign
        </h2>

        {loading ? (
          <div className="mt-3 flex flex-col gap-3" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-16 animate-pulse rounded-[14px] bg-grey-soft"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted">
            No campaigns yet. Once the admin runs a campaign for one of your
            products, it shows here.
          </p>
        ) : (
          <>
            {/* Column labels, wider screens only */}
            <div className="mt-3 hidden grid-cols-[minmax(0,1fr)_120px_140px] gap-4 border-b border-grey-soft px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
              <span>Campaign</span>
              <span className="text-right">Units × price</span>
              <span className="text-right">Amount</span>
            </div>

            <ul className="flex flex-col">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-grey-soft px-1 py-3.5 first:border-t-0 md:grid-cols-[minmax(0,1fr)_120px_140px]"
                >
                  {/* Campaign + status */}
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={productImage(row.product)}
                      alt=""
                      className="size-11 shrink-0 rounded-xl bg-canvas object-contain p-1"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">
                        {row.title}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.info.badge}`}
                      >
                        {row.info.label}
                      </span>
                    </div>
                  </div>

                  {/* Units × price: under the title on mobile, own column on md+ */}
                  <p className="col-start-1 row-start-2 pl-14 text-[13px] tabular-nums text-muted md:col-start-2 md:row-start-1 md:pl-0 md:text-right">
                    {row.units} × {formatPrice(row.price)}
                  </p>

                  {/* Amount */}
                  <p
                    className={`col-start-2 row-span-2 row-start-1 text-right text-[15px] font-bold tabular-nums md:col-start-3 md:row-span-1 ${
                      row.amount > 0 ? "text-forest" : "text-muted"
                    }`}
                  >
                    {formatPrice(row.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mt-4 flex items-start gap-2 text-sm leading-snug text-muted">
        <Wallet size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Payouts to your M-Pesa are coming soon. These figures show what you've
        sold, at your wholesale price.
      </p>
    </div>
  );
}
