
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSellerProducts } from "../../api/sellerProducts";
import { request } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const productData = await getSellerProducts();
        const campaignData = await request("/seller/campaigns");

        setProducts(productData);
        setCampaigns(campaignData);
      } catch (err) {
        setError(err.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const liveCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active"
  );

  const totalUnits = liveCampaigns.reduce(
    (total, campaign) => total + (campaign.ordered_quantity || 0),
    0
  );

  const pendingProducts = products.filter(
    (product) => product.status === "pending"
  ).length;

  const verificationStatus = user?.seller?.verification_status;

  const stats = [
    {
      title: "Live campaigns",
      value: liveCampaigns.length,
      color: "bg-forest text-white",
    },
    {
      title: "Units ordered (live)",
      value: totalUnits,
      color: "bg-white text-ink",
    },
    {
      title: "Pending payouts",
      value: "—",
      color: "bg-white text-ink",
    },
    {
      title: "Awaiting approval",
      value: pendingProducts,
      color: "bg-white text-ink",
    },
  ];

  if (loading) {
    return <p className="p-8 text-center">Loading dashboard...</p>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-forest px-5 py-2 text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas p-5 md:p-8">

      {/* Welcome section */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            Welcome back
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-forest">
              {user?.full_name || "Wholesaler"}
            </h1>

            {verificationStatus === "approved" && (
              <span className="rounded-full bg-lime-soft px-3 py-1 text-xs font-bold text-forest">
                ✓ Verified
              </span>
            )}

            {verificationStatus === "pending" && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                Verification pending
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate("/seller/products")}
          className="rounded-xl bg-lime px-5 py-3 text-sm font-bold text-forest transition hover:bg-lime-200"
        >
          + Add product
        </button>
      </div>

      {/* Statistics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`rounded-2xl border border-line p-6 shadow-sm ${stat.color}`}
          >
            <p className="text-sm font-medium opacity-80">
              {stat.title}
            </p>

            <h2 className="mt-3 text-3xl font-extrabold">
              {stat.value}
            </h2>

            {stat.title === "Pending payouts" && (
              <p className="mt-2 text-xs opacity-70">
                Payout data not connected yet
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Live campaigns and recent activity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Live campaigns */}
        <section className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">
              Live campaigns
            </h2>

            <button
              onClick={() => navigate("/seller/campaigns")}
              className="text-sm font-bold text-forest hover:underline"
            >
              All orders →
            </button>
          </div>

          {liveCampaigns.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
              <p className="font-semibold text-ink">
                No live campaigns
              </p>
              <p className="mt-2 text-sm text-muted">
                Your active campaigns will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {liveCampaigns.map((campaign) => {
                const quantity = campaign.ordered_quantity || 0;
                const minimum = campaign.min_quantity || 0;
                const maximum = campaign.max_quantity || 0;

                const progress = maximum > 0
                  ? Math.min((quantity / maximum) * 100, 100)
                  : 0;

                return (
                  <div
                    key={campaign.id}
                    className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
                  >
                    {campaign.product?.image_url ? (
                      <img
                        src={campaign.product.image_url}
                        alt={campaign.product.name}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center bg-grey-soft text-sm text-muted">
                        No product image
                      </div>
                    )}

                    <div className="p-5">
                      <h3 className="font-bold text-ink">
                        {campaign.title}
                      </h3>

                      <p className="mt-1 text-sm text-muted">
                        {campaign.product?.name}
                      </p>

                      <p className="mt-4 text-xs font-semibold text-muted">
                        CAMPAIGN PROGRESS
                      </p>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-grey-soft">
                        <div
                          className="h-full rounded-full bg-lime-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-bold text-ink">
                          {quantity} / {maximum} units
                        </span>

                        <span className={`font-semibold ${
                          quantity >= minimum
                            ? "text-green-700"
                            : "text-orange-600"
                        }`}>
                          {quantity >= minimum
                            ? "Minimum reached"
                            : `${minimum - quantity} to minimum`}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-muted">
                        Deadline: {campaign.deadline
                          ? new Date(campaign.deadline).toLocaleDateString(
                              "en-KE",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Not specified"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-ink">
              Recent activity
            </h2>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 rounded-full bg-lime" />

              <div>
                <p className="text-sm font-semibold text-ink">
                  Dashboard connected
                </p>
                <p className="mt-1 text-xs text-muted">
                  Your product and campaign information is loading from your account.
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm text-muted">
                Activity notifications will appear here when the notifications API is connected.
              </p>
            </div>

            <button
              onClick={() => navigate("/seller/campaigns")}
              className="mt-5 text-sm font-bold text-forest hover:underline"
            >
              View campaign orders →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
