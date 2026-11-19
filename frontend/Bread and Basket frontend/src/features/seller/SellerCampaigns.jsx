
import { useEffect, useState } from "react";
import { request, assetUrl } from "../../api/client";

export default function SellerCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <p className="py-8 text-center text-gray-500">
      Loading campaigns...
    </p>;
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-red-600">{error}</p>
        <button
          onClick={fetchCampaigns}
          className="rounded-lg bg-green-800 px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        You don't have any campaigns yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-4 p-5">
            {campaign.product?.image_url ? (
              <img
                src={assetUrl(campaign.product.image_url)}
                alt={campaign.product.name}
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
                No image
              </div>
            )}

            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-gray-900">
                {campaign.title}
              </h3>

              <p className="text-sm text-gray-500">
                {campaign.product?.name}
              </p>

              <p className="mt-1 text-xs capitalize text-gray-500">
                {campaign.status}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-4">
              <p className="text-sm text-gray-500">Campaign price</p>
              <p className="text-2xl font-bold text-green-800">
                {formatPrice(campaign.campaign_price)}
              </p>
              <p className="text-xs text-gray-500">
                Save {formatPrice(campaign.savings_per_unit)} per unit
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Units ordered</p>
                <p className="font-semibold text-gray-800">
                  {campaign.ordered_quantity ?? 0}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Households</p>
                <p className="font-semibold text-gray-800">
                  {campaign.households ?? 0}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Minimum quantity</p>
                <p className="font-semibold text-gray-800">
                  {campaign.min_quantity}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Maximum quantity</p>
                <p className="font-semibold text-gray-800">
                  {campaign.max_quantity}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500">Campaign deadline</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDate(campaign.deadline)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
