import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminCampaigns } from "../../api/adminCampaigns";

const STATUS_FILTERS = [
  "all",
  "draft",
  "active",
  "successful",
  "fulfilling",
  "completed",
  "failed",
  "cancelled",
];

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-lime/20 text-forest",
  successful: "bg-green-100 text-green-700",
  fulfilling: "bg-blue-100 text-blue-700",
  completed: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status) {
  if (!status) return "Unknown";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function CampaignStatus({ status }) {
  const styles = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function AdminCampaignsPage() {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCampaigns(status = activeFilter) {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminCampaigns(status === "all" ? "" : status);

      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load campaigns. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns(activeFilter);
  }, [activeFilter]);

  function handleFilterChange(status) {
    setActiveFilter(status);
  }

  function openCampaign(campaignId) {
    navigate(`/admin/campaigns/${campaignId}`);
  }

  function getProgress(campaign) {
    const ordered = Number(campaign.ordered_quantity || 0);
    const minimum = Number(campaign.min_quantity || 0);

    if (!minimum) return 0;

    return Math.min(Math.round((ordered / minimum) * 100), 100);
  }

  return (
    <main className="admin-main min-w-0">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest sm:text-3xl">
            Campaigns
          </h1>

          <p className="mt-2 text-sm text-muted">
            Create and manage group-buying campaigns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/campaigns/new")}
          className="inline-flex items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          + Create campaign
        </button>
      </div>

      <section className="mb-6 rounded-[18px] border border-line bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-forest">
            Filter campaigns
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleFilterChange(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeFilter === status
                  ? "bg-forest text-white"
                  : "border border-line bg-white text-muted hover:border-forest hover:text-forest"
              }`}
            >
              {status === "all" ? "All" : formatStatus(status)}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold text-forest">Campaign list</h2>

            <p className="mt-1 text-xs text-muted">
              {campaigns.length}{" "}
              {campaigns.length === 1 ? "campaign" : "campaigns"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadCampaigns(activeFilter)}
            disabled={loading}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-forest transition hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted">Loading campaigns...</p>
          </div>
        ) : error ? (
          <div className="px-5 py-16 text-center">
            <p className="font-medium text-red-600">{error}</p>

            <button
              type="button"
              onClick={() => loadCampaigns(activeFilter)}
              className="mt-4 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <h3 className="font-semibold text-forest">No campaigns here</h3>

            <p className="mt-2 text-sm text-muted">
              {activeFilter === "all"
                ? "There are no campaigns yet. Create your first campaign to get started."
                : `There are no ${activeFilter} campaigns.`}
            </p>

            {activeFilter === "all" && (
              <button
                type="button"
                onClick={() => navigate("/admin/campaigns/new")}
                className="mt-5 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Create campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-gray-50/70">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted">
                    Campaign
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted">
                    Progress
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted">
                    Quantity
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted">
                    Ends
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {campaigns.map((campaign) => {
                  const progress = getProgress(campaign);

                  return (
                    <tr
                      key={campaign.id}
                      onClick={() => openCampaign(campaign.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCampaign(campaign.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer border-b border-line last:border-0 transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {campaign.product?.image_url ? (
                            <img
                              src={campaign.product.image_url}
                              alt={campaign.product.name || "Product"}
                              className="h-12 w-12 rounded-xl border border-line object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl">
                              📦
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-semibold text-forest">
                              {campaign.title}
                            </p>

                            <p className="mt-1 text-sm text-muted">
                              {campaign.product?.name || "Unknown product"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-36">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-forest">
                              {campaign.ordered_quantity || 0} /{" "}
                              {campaign.min_quantity}
                            </span>

                            <span className="text-muted">{progress}%</span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-lime"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-forest">
                          {campaign.ordered_quantity || 0} ordered
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {campaign.households || 0} households
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-muted">
                        {formatDate(campaign.deadline)}
                      </td>

                      <td className="px-5 py-4">
                        <CampaignStatus status={campaign.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
