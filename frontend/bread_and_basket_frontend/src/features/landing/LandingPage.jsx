import { useEffect, useState } from "react";
import AuthModal from "../auth/AuthModal";
import { assetUrl } from "../../api/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4010";

const IMG = "/images/products";

const categories = [
  { value: "vegetables", label: "Vegetables", image: `${IMG}/vegetables.svg` },
  { value: "fruits", label: "Fruits", image: `${IMG}/oranges.webp` },
  { value: "rice_grains", label: "Rice & Grains", image: `${IMG}/rice.svg` },
  { value: "flour", label: "Flour", image: `${IMG}/maize-flour.svg` },
  {
    value: "cooking_oil",
    label: "Cooking Oil",
    image: `${IMG}/cooking-oil.svg`,
  },
  { value: "sugar", label: "Sugar", image: `${IMG}/sugar.svg` },
  { value: "pulses", label: "Pulses", image: `${IMG}/beans.svg` },
  { value: "dairy_eggs", label: "Dairy & Eggs", image: `${IMG}/eggs.svg` },
];

function money(price) {
  return `KES ${Number(price || 0).toLocaleString("en-KE")}`;
}

function getDiscount(campaign) {
  const retail = Number(campaign.product?.retail_price || 0);
  const price = Number(campaign.campaign_price || 0);

  if (!retail) return 0;

  return Math.round(((retail - price) / retail) * 100);
}

function CampaignCard({ campaign, openRegister }) {
  const product = campaign.product || {};
  const ordered = Number(campaign.ordered_quantity || 0);
  const minimum = Number(campaign.min_quantity || 0);
  const progress = minimum ? Math.min(100, (ordered / minimum) * 100) : 0;

  const discount = getDiscount(campaign);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-muted">Group deal</span>

        {discount > 0 && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
            {discount}% OFF
          </span>
        )}
      </div>

      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-[#EEF5E8]">
        {product.image_url ? (
          <img
            src={assetUrl(product.image_url)}
            alt={product.name || "Product"}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-6xl">🧺</span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-bold text-forest">
        {product.name || campaign.title}
      </h3>

      <p className="mt-1 text-sm text-muted">{product.unit || "Per unit"}</p>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-forest">
            {money(campaign.campaign_price)}
          </p>

          <p className="text-xs text-muted line-through">
            {money(product.retail_price)}
          </p>
        </div>

        <button
          onClick={openRegister}
          className="rounded-full bg-lime px-4 py-2 text-sm font-bold text-forest hover:brightness-95"
        >
          Join deal
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>
            {ordered} of {minimum} needed
          </span>
          <span>{Math.round(progress)}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-forest"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-muted">
          {campaign.min_reached
            ? "Minimum target reached!"
            : `${Math.max(0, minimum - ordered)} more units needed`}
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [tab, setTab] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [locations, setLocations] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getLocations() {
      try {
        const response = await fetch(`${API_URL}/locations`);

        if (!response.ok) return;

        const data = await response.json();
        setLocations(data);
      } catch {
        setLocations([]);
      }
    }

    getLocations();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (category) params.set("category", category);
      if (search.trim()) params.set("q", search.trim());

      try {
        const query = params.toString();
        const url = `${API_URL}/campaigns${query ? `?${query}` : ""}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Could not load campaigns.");
        }

        const data = await response.json();
        setCampaigns(data);
      } catch (err) {
        setCampaigns([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [category, search]);

  const featured = campaigns.slice(0, 4);
  const weekly = campaigns.slice(4, 8);

  function openRegister() {
    setTab("register");
  }

  return (
    <>
      <div className="min-h-screen bg-canvas text-ink">
        {/* Top promotion bar */}
        <div className="bg-forest px-4 py-3 text-center text-sm text-white">
          Buy together, save together. Get wholesale prices with Bread & Basket.
        </div>

        {/* Navigation */}
        <header className="bg-white shadow-sm">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-5">
            <a href="#home" className="text-2xl font-extrabold text-forest">
              🧺 Bread &amp; Basket
            </a>

            <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
              <a href="#home" className="hover:text-forest">
                Home
              </a>
              <a href="#deals" className="hover:text-forest">
                Shop
              </a>
              <a href="#wholesalers" className="hover:text-forest">
                Wholesalers
              </a>
              <a href="#how-it-works" className="hover:text-forest">
                How it works
              </a>
              <a href="#contact" className="hover:text-forest">
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTab("login")}
                className="rounded-full border border-forest px-5 py-2.5 font-bold text-forest hover:bg-gray-50"
              >
                Log in
              </button>

              <button
                onClick={openRegister}
                className="rounded-full bg-lime px-5 py-2.5 font-bold text-forest hover:brightness-95"
              >
                Register
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 sm:px-5">
          {/* Hero section */}
          <section
            id="home"
            className="relative mt-6 flex flex-wrap items-center gap-10 overflow-hidden rounded-[30px] bg-forest px-7 py-12 text-white sm:px-12 lg:min-h-[470px]"
          >
            <div className="relative z-10 flex-1 basis-[350px]">
              <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-lime">
                Better prices start together
              </span>

              <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                Your trusted source for{" "}
                <span className="text-lime">wholesale & fresh</span> foods.
              </h1>

              <p className="mt-5 max-w-xl leading-7 text-gray-200">
                Shop together with your neighbours and enjoy wholesale prices on
                everyday food and household essentials.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={openRegister}
                  className="rounded-full bg-lime px-7 py-4 font-bold text-forest hover:brightness-95"
                >
                  Start shopping
                </button>

                <a
                  href="#deals"
                  className="rounded-full border border-lime px-7 py-4 font-bold text-white hover:bg-white/10"
                >
                  Explore deals
                </a>
              </div>
            </div>

            <div className="relative flex min-h-[280px] flex-1 basis-[300px] items-center justify-center">
              <div className="absolute h-64 w-64 rounded-full bg-lime/20 blur-3xl" />

              <div className="relative grid grid-cols-2 gap-4">
                {categories.slice(0, 4).map((item) => (
                  <div
                    key={item.label}
                    className="flex h-32 w-36 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur"
                  >
                    <img
                      src={item.image}
                      className="size-16 object-contain sm:size-20"
                    ></img>
                    <span className="mt-2 text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="py-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-forest">
                Shop by category
              </h2>
              <a href="#deals" className="text-sm font-bold text-forest">
                View deals →
              </a>
            </div>

            <div className="overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto flex w-max snap-x snap-mandatory gap-3 sm:gap-4">
                {categories.map((item) => {
                  const selected = category === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setCategory(item.value);
                        document
                          .getElementById("deals")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`flex w-28 shrink-0 snap-start flex-col items-center gap-2 rounded-[18px] bg-white px-2.5 pb-4 pt-4 transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-forest sm:w-36 ${
                        selected ? "ring-2 ring-forest" : ""
                      }`}
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="size-16 object-contain sm:size-20"
                        loading="lazy"
                      />
                      <span className="text-center text-sm font-semibold leading-tight sm:text-base">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Promotion cards */}
          <section className="grid gap-5 md:grid-cols-3">
            <div className="flex min-h-52 flex-col justify-center rounded-2xl bg-forest p-7 text-white">
              <span className="text-4xl">🥬</span>
              <h3 className="mt-4 text-2xl font-bold">
                Free collection on campaigns.
              </h3>
              <a href="#deals" className="mt-4 font-bold text-lime">
                Shop now →
              </a>
            </div>

            <div className="flex min-h-52 flex-col justify-center rounded-2xl bg-[#F16B3A] p-7 text-white">
              <span className="text-4xl">🤝</span>
              <h3 className="mt-4 text-2xl font-bold">
                Better prices when we buy together.
              </h3>
              <button
                onClick={openRegister}
                className="mt-4 w-fit rounded-full bg-white px-5 py-2 font-bold text-forest"
              >
                Get started
              </button>
            </div>

            <div className="flex min-h-52 flex-col justify-center rounded-2xl bg-[#FFD84A] p-7 text-forest">
              <span className="text-4xl">🍊</span>
              <h3 className="mt-4 text-2xl font-bold">
                Save on everyday essentials.
              </h3>
              <a href="#deals" className="mt-4 font-bold">
                Explore offers →
              </a>
            </div>
          </section>

          {/* Featured campaigns */}
          <section className="pt-14">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">
                  SHOP TOGETHER
                </p>
                <h2 className="mt-1 text-3xl font-bold text-forest">
                  Featured campaigns
                </h2>
              </div>

              <a href="#deals" className="font-bold text-forest">
                View all →
              </a>
            </div>

            {loading ? (
              <p className="rounded-2xl bg-white p-8 text-center text-muted">
                Loading campaigns...
              </p>
            ) : error ? (
              <p className="rounded-2xl bg-white p-8 text-center text-red-600">
                {error}
              </p>
            ) : featured.length === 0 ? (
              <p className="rounded-2xl bg-white p-8 text-center text-muted">
                No campaigns are available right now.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    openRegister={openRegister}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Today's deals */}
          <section id="deals" className="pt-14">
            <div className="mb-6">
              <p className="text-sm font-semibold text-muted">
                FIND SOMETHING GOOD
              </p>
              <h2 className="mt-1 text-3xl font-bold text-forest">
                Today's best deals
              </h2>
            </div>

            <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2">
                <button
                  onClick={() => setCategory("")}
                  className={`rounded-full px-5 py-2 text-sm font-bold ${
                    category === ""
                      ? "bg-forest text-white"
                      : "bg-white text-forest"
                  }`}
                >
                  All products
                </button>

                {categories.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setCategory(item.value)}
                    className={`rounded-full px-5 py-2 text-sm font-bold ${
                      category === item.value
                        ? "bg-forest text-white"
                        : "bg-white text-forest"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for products..."
              className="mb-6 w-full rounded-xl border border-line bg-white px-5 py-3 outline-none focus:border-forest"
            />

            {!loading && !error && campaigns.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {campaigns.slice(0, 8).map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    openRegister={openRegister}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Wholesaler section */}
          <section
            id="wholesalers"
            className="mt-16 flex flex-wrap items-center justify-between gap-8 rounded-3xl bg-forest px-8 py-12 text-white sm:px-12"
          >
            <div className="max-w-2xl">
              <p className="font-semibold text-lime">FOR BUSINESS OWNERS</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Are you a wholesaler?
              </h2>
              <p className="mt-4 leading-7 text-gray-200">
                Connect with customers, list your products and reach more
                households through group buying.
              </p>
            </div>

            <button
              onClick={openRegister}
              className="rounded-full bg-lime px-7 py-4 font-bold text-forest hover:brightness-95"
            >
              Become a wholesaler
            </button>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="py-16">
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold text-muted">
                SIMPLE AND EASY
              </p>
              <h2 className="mt-2 text-3xl font-bold text-forest">
                How it works
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "🛒",
                  "Choose a campaign",
                  "Find the products you need at group prices.",
                ],
                [
                  "🤝",
                  "Join the group",
                  "Join a campaign and choose your quantity.",
                ],
                [
                  "📈",
                  "Reach the target",
                  "The group works together to reach the minimum.",
                ],
                [
                  "📦",
                  "Collect your order",
                  "Collect your order or arrange delivery.",
                ],
              ].map(([icon, title, description], index) => (
                <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{icon}</span>
                    <span className="font-bold text-orange-600">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-forest">
                    {title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Locations */}
          <section className="pb-16">
            <h2 className="mb-6 text-3xl font-bold text-forest">
              Delivery and collection areas
            </h2>

            {locations.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <h3 className="font-bold text-forest">
                      📍 {location.name}
                    </h3>

                    <p className="mt-2 text-sm text-muted">
                      Delivery: {money(location.delivery_fee)}
                    </p>

                    <p className="mt-2 text-sm text-muted">
                      {location.collection_point}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Delivery locations will appear here.
              </p>
            )}
          </section>

          {/* Final call to action */}
          <section className="flex flex-wrap items-center justify-between gap-8 rounded-3xl bg-[#E8F2DC] px-8 py-12 sm:px-12">
            <div className="max-w-xl">
              <h2 className="text-3xl font-extrabold text-forest sm:text-4xl">
                Ready to buy together?
              </h2>

              <p className="mt-4 leading-7 text-muted">
                Join Bread & Basket and start enjoying wholesale prices on
                everyday essentials.
              </p>

              <button
                onClick={openRegister}
                className="mt-6 rounded-full bg-forest px-7 py-3 font-bold text-white hover:bg-green-900"
              >
                Create an account
              </button>
            </div>

            <div className="text-8xl">🧺🥑</div>
          </section>
        </main>

        {/* Footer */}
        <footer id="contact" className="mt-16 bg-[#102D1E] py-12 text-white">
          <div className="mx-auto grid max-w-[1240px] gap-8 px-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-xl font-extrabold">Bread &amp; Basket 🧺</h3>
              <p className="mt-3 text-sm leading-6 text-gray-300">
                Bringing households together through affordable group buying.
              </p>
            </div>

            <div>
              <h3 className="font-bold">Explore</h3>
              <a href="#deals" className="mt-3 block text-sm text-gray-300">
                Shop products
              </a>
              <a
                href="#how-it-works"
                className="mt-2 block text-sm text-gray-300"
              >
                How it works
              </a>
            </div>

            <div>
              <h3 className="font-bold">Wholesalers</h3>
              <button
                onClick={openRegister}
                className="mt-3 text-sm text-gray-300"
              >
                Become a wholesaler
              </button>
            </div>

            <div>
              <h3 className="font-bold">Account</h3>
              <button
                onClick={() => setTab("login")}
                className="mt-3 block text-sm text-gray-300"
              >
                Log in
              </button>
              <button
                onClick={openRegister}
                className="mt-2 block text-sm text-gray-300"
              >
                Register
              </button>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[1240px] border-t border-white/10 px-5 pt-5 text-xs text-gray-400">
            © {new Date().getFullYear()} Bread &amp; Basket. All rights
            reserved.
          </div>
        </footer>
      </div>

      {/* Login and registration modal */}
      {tab && (
        <AuthModal tab={tab} onTab={setTab} onClose={() => setTab(null)} />
      )}
    </>
  );
}
