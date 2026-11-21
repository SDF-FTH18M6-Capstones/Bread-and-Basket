import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listCampaigns } from "../../api/campaigns";
import CampaignCard from "./CampaignCard";
import CategoryChips from "../../components/ui/CategoryChips";

const FILTERS = [
  { label: "Ending soon", value: "ending_soon" },
  { label: "Almost unlocked", value: "almost_unlocked" },
];

export default function BrowsePage() {
  // The navbar writes the search into the URL; this page only reads it
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const [campaigns, setCampaigns] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState(q);

  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [activeFilter, setActiveFilter] = useState(
    searchParams.get("filter") ?? "",
  );
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  // Wait until typing pauses before asking the server
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Reload whenever the search or a filter changes
  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setError("");

    listCampaigns({ q: debouncedSearch, category, filter: activeFilter })
      .then((data) => {
        if (cancelled) return;
        setCampaigns(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load campaigns.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, category, activeFilter]);

  function toggleFilter(value) {
    setActiveFilter((current) => (current === value ? "" : value));
  }

  function clearFilters() {
    setDebouncedSearch("");
    setCategory("");
    setActiveFilter("");
    setSearchParams({}); // also empties the navbar box
  }

  const hasActiveFilters = q !== "" || category !== "" || activeFilter !== "";
  const loading = status === "loading";
  const firstLoad = loading && campaigns.length === 0;

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5">
      <section>
        <h1 className="text-[26px] font-bold leading-[1.15] tracking-tight">
          Browse campaigns
        </h1>
      </section>

      {/* Category chips */}
      <section className="mt-5">
        <CategoryChips />
      </section>

      {/* Campaign filters */}
      <section className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const selected = activeFilter === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => toggleFilter(item.value)}
                aria-pressed={selected}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-forest bg-forest/10 text-forest"
                    : "border-line bg-white text-muted hover:border-forest"
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2 py-2 text-sm font-medium text-bad hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-xl font-bold leading-tight tracking-tight">
            {q
              ? `Results for “${q}”`
              : hasActiveFilters
                ? "Filtered campaigns"
                : "Explore campaigns"}
          </h2>

          {status === "ready" && (
            <span className="shrink-0 text-sm text-muted">
              {campaigns.length}{" "}
              {campaigns.length === 1 ? "campaign" : "campaigns"}
            </span>
          )}
        </div>

        {/* Only the very first load shows a message; later loads keep the old cards */}
        {firstLoad && (
          <p className="py-8 text-center text-sm text-muted">
            Loading campaigns...
          </p>
        )}

        {status === "error" && (
          <div
            className="rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad"
            role="alert"
          >
            {error}
          </div>
        )}

        {status === "ready" && campaigns.length === 0 && (
          <div className="rounded-xl bg-white px-4 py-10 text-center">
            <h3 className="font-semibold">No campaigns found</h3>
            <p className="mt-1 text-sm text-muted">
              Try another search or change your filters.
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {status !== "error" && campaigns.length > 0 && (
          <div
            aria-busy={loading}
            className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 ${
              loading ? "opacity-60" : ""
            }`}
          >
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
