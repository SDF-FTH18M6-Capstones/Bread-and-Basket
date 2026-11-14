import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { listCampaigns } from "../../api/campaigns";
import CampaignCard from "./CampaignCard";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Vegetables", value: "vegetables" },
  { label: "Fruits", value: "fruits" },
  { label: "Rice & Grains", value: "rice_grains" },
  { label: "Flour", value: "flour" },
  { label: "Cooking Oil", value: "cooking_oil" },
  { label: "Sugar", value: "sugar" },
  { label: "Pulses", value: "pulses" },
  { label: "Dairy & Eggs", value: "dairy_eggs" },
];

const FILTERS = [
  { label: "Ending soon", value: "ending_soon" },
  { label: "Almost unlocked", value: "almost_unlocked" },
];

function timeOfDay() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

export default function ShopHome() {
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const firstName = user?.full_name?.trim().split(" ")[0] || "User";

  // Debounce search input to avoid sending a request for every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Load campaigns whenever a search or filter changes.
  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setError("");

    listCampaigns({
      q: debouncedSearch,
      category,
      filter: activeFilter,
    })
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
    setSearch("");
    setDebouncedSearch("");
    setCategory("");
    setActiveFilter("");
  }

  const hasActiveFilters =
    search.trim() !== "" || category !== "" || activeFilter !== "";

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5">
      {/* Welcome section */}
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

      {/* Search */}
      <section className="mt-6">
        <label htmlFor="campaign-search" className="sr-only">
          Search campaigns
        </label>

        <div className="relative">
          <input
            id="campaign-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products or campaigns..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-11 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
          />

          <svg
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </div>
      </section>

      {/* Category chips */}
      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold">Categories</h2>

        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((item) => {
            const selected = category === item.value;

            return (
              <button
                key={item.value || "all"}
                type="button"
                onClick={() => setCategory(item.value)}
                aria-pressed={selected}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  selected
                    ? "bg-forest text-white"
                    : "bg-white text-muted hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
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
                    : "border-gray-200 bg-white text-muted hover:border-forest"
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

      {/* Campaign results */}
      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold leading-tight tracking-tight">
            {hasActiveFilters ? "Search results" : "Explore campaigns"}
          </h2>

          {status === "ready" && (
            <span className="text-sm text-muted">
              {campaigns.length}{" "}
              {campaigns.length === 1 ? "campaign" : "campaigns"}
            </span>
          )}
        </div>

        {status === "loading" && (
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

        {status === "ready" && campaigns.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
