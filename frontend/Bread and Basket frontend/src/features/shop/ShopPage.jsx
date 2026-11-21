import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { AuthContext } from "../../features/auth/authContext";
import { request } from "../../api/client";
import CategoryChips from "../../components/ui/CateoryChips";
import CampaignRail from "../../components/ui/CampaignRail";
import { ORDER_STATUS, IN_PROGRESS, CAN_CONFIRM } from "../../lib/orderStatus";
import { productImage } from "../../lib/productImages";

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Outside the component, so the page can call it on load AND after a confirm
async function fetchShop() {
  const [all, endingSoon, almostUnlocked, orders] = await Promise.all([
    request("/campaigns"),
    request("/campaigns?filter=ending_soon"),
    request("/campaigns?filter=almost_unlocked"),
    request("/orders"),
  ]);
  return { all, endingSoon, almostUnlocked, orders };
}

const ShopPage = () => {
  const { user } = useContext(AuthContext) ?? {};
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const firstName = user?.full_name?.trim().split(" ")[0] || "there";

  useEffect(() => {
    let cancelled = false;

    fetchShop()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirm(orderId) {
    setConfirmingId(orderId);
    setError(null);
    try {
      await request(`/orders/${orderId}/confirm-receipt`, { method: "POST" });
      setData(await fetchShop()); // fresh data: the order leaves the strip
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingId(null);
    }
  }

  // Before any data: a fetch error, or still loading
  if (!data) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5">
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad"
          >
            {error}
          </p>
        ) : (
          <ShopSkeleton />
        )}
      </main>
    );
  }

  // Worked out from the raw data on every render
  const inProgress = data.orders
    .filter((order) => IN_PROGRESS.includes(order.status))
    .slice(0, 2);

  const closest = [...data.almostUnlocked].sort(
    (a, b) =>
      a.min_quantity -
      a.ordered_quantity -
      (b.min_quantity - b.ordered_quantity),
  )[0];

  const shown = new Set(
    [...data.endingSoon, ...data.almostUnlocked].map((c) => c.id),
  );
  const rest = data.all.filter((campaign) => !shown.has(campaign.id));

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5">
      {/* Greeting */}
      <section>
        <p className="text-sm text-muted">{timeOfDay()}</p>
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight">
          Habari, {firstName}
        </h1>
        <p className="text-muted">
          Group campaigns open now. Pick delivery or free collection at
          checkout.
        </p>
      </section>

      {/* Categories: a tap opens Browse with that category */}
      <section className="mt-5">
        <CategoryChips
          value={null}
          onChange={(value) =>
            navigate(value ? `/browse?category=${value}` : "/browse")
          }
        />
      </section>

      {/* An error after the data loaded (e.g. a failed confirm) */}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad"
        >
          {error}
        </p>
      )}

      {/* Orders on the way */}
      {inProgress.length > 0 && (
        <section
          className="mt-5 flex flex-col gap-3"
          aria-label="Your orders in progress"
        >
          {inProgress.map((order) => {
            const product = order.campaign.product;
            const status = ORDER_STATUS[order.status];
            const canConfirm = CAN_CONFIRM.includes(order.status);
            const confirming = confirmingId === order.id;

            return (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-2xl bg-forest p-3 text-white"
              >
                <img
                  src={productImage(product)}
                  alt=""
                  className="size-14 shrink-0 rounded-xl bg-white object-contain p-1"
                />
                <Link
                  to={`/orders/${order.id}`}
                  className="min-w-0 flex-1 text-white no-underline"
                >
                  <span className="block truncate font-semibold">
                    {product.name} · {status?.label ?? order.status}
                  </span>
                  <span className="block truncate text-sm text-white/75">
                    {status?.note ?? "Tap to track your order"}
                  </span>
                </Link>
                {canConfirm ? (
                  <button
                    type="button"
                    onClick={() => handleConfirm(order.id)}
                    disabled={confirming}
                    className="shrink-0 rounded-full bg-lime px-3.5 py-2 text-sm font-semibold text-forest transition hover:brightness-95 disabled:opacity-60"
                  >
                    {confirming ? "Confirming..." : "Confirm received"}
                  </button>
                ) : (
                  <ChevronRight
                    aria-hidden="true"
                    className="shrink-0 text-white/70"
                  />
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Help it unlock */}
      {closest && (
        <section className="mt-5 flex items-center gap-4 overflow-hidden rounded-2xl bg-orange p-5 text-ink">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider">
              Help it unlock
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight">
              {closest.title} needs{" "}
              {closest.min_quantity - closest.ordered_quantity} more
            </h2>
            <p className="mt-1 text-sm">
              {closest.households}{" "}
              {closest.households === 1 ? "household has" : "households have"}{" "}
              joined. Everyone saves once it unlocks.
            </p>
            <Link
              to={`/campaigns/${closest.id}`}
              className="mt-3 inline-flex rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white no-underline"
            >
              Join now
            </Link>
          </div>
          <img
            src={productImage(closest.product)}
            alt=""
            className="hidden size-28 shrink-0 object-contain sm:block"
          />
        </section>
      )}

      {/* Rails hide themselves when empty */}
      <CampaignRail
        title="Ending soon"
        campaigns={data.endingSoon}
        seeAllTo="/browse?filter=ending_soon"
      />
      <CampaignRail
        title="Almost unlocked"
        campaigns={data.almostUnlocked}
        seeAllTo="/browse?filter=almost_unlocked"
      />
      <CampaignRail
        title="More campaigns"
        campaigns={rest}
        seeAllTo="/browse"
      />

      {data.all.length === 0 && (
        <div className="mt-7 rounded-xl bg-white px-4 py-10 text-center">
          <h3 className="font-semibold">No campaigns open right now</h3>
          <p className="mt-1 text-sm text-muted">
            New group buys open every week. Check back soon.
          </p>
        </div>
      )}
    </main>
  );
};

function ShopSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-7">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-grey-soft" />
        <div className="h-7 w-48 animate-pulse rounded bg-grey-soft" />
      </div>
      {[0, 1].map((rail) => (
        <div key={rail}>
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-grey-soft" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="h-56 w-44 shrink-0 animate-pulse rounded-2xl bg-grey-soft"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ShopPage;
