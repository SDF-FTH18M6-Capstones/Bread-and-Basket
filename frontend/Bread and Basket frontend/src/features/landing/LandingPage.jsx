
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const IMG_DIR = "/images";

const CATEGORIES = [
  ["Vegetables", "cat-vegetables", "🥬"],
  ["Fruits", "cat-fruits", "🍎"],
  ["Rice", "cat-rice", "🍚"],
  ["Flour", "cat-flour", "🌾"],
  ["Cooking Oil", "cat-oil", "🫒"],
  ["Pulses", "cat-pulses", "🫘"],
  ["Dairy", "cat-dairy", "🥛"]
];

const FEATURED_SAMPLE = [
  { id: 1, title: "Tomatoes", tag: "In Stock", pack: "5kg crate", price: 450, current: 17, target: 40, file: "tomatoes", emoji: "🍅" },
  { id: 2, title: "Carrots", tag: "Rare", pack: "2kg", price: 140, current: 26, target: 150, file: "carrots", emoji: "🥕" },
  { id: 3, title: "Oranges", tag: "Limited", pack: "5kg crate", price: 300, current: 5, target: 80, file: "oranges", emoji: "🍊" },
  { id: 4, title: "Red onions", tag: "In Stock", pack: "5kg", price: 520, current: 13, target: 90, file: "red-onions", emoji: "🧅" }
];

const DEALS = [
  { id: 1, title: "Pishori rice", tag: "20% OFF", pack: "5kg", price: 130, old: 170, joined: "20/60", cat: "Grains", file: "rice", emoji: "🍚" },
  { id: 2, title: "Brown sugar", tag: "Hot Deal", pack: "2kg", price: 290, old: 340, joined: "48/80", cat: "Grains", file: "sugar", emoji: "🍬" },
  { id: 3, title: "Cooking oil", tag: "Best Price", pack: "3L", price: 560, old: 650, joined: "33/50", cat: "Grains", file: "oil", emoji: "🫒" },
  { id: 4, title: "Eggs", tag: "Limited Offer", pack: "Tray of 30", price: 420, old: 480, joined: "12/40", cat: "Dairy & Eggs", file: "eggs", emoji: "🥚" },
  { id: 5, title: "Home baking flour", tag: "20% OFF", pack: "2kg", price: 160, old: 200, joined: "41/100", cat: "Grains", file: "flour", emoji: "🌾" },
  { id: 6, title: "Long-life milk", tag: "Deal Of The Day", pack: "12 × 500ml", price: 780, old: 900, joined: "18/60", cat: "Dairy & Eggs", file: "milk", emoji: "🥛" },
  { id: 7, title: "Tomatoes", tag: "Ending Soon", pack: "5kg", price: 450, old: 520, joined: "17/40", cat: "Vegetables", file: "tomatoes", emoji: "🍅" },
  { id: 8, title: "Maize flour", tag: "Special Offer", pack: "2kg", price: 150, old: 180, joined: "60/120", cat: "Grains", file: "maize-flour", emoji: "🌽" }
];

const FILTERS = ["All Products", "Vegetables", "Fruits", "Grains", "Dairy & Eggs"];

function Pic({ file, emoji, alt }) {
  const [error, setError] = useState(false);
  const src = file.startsWith("http") ? file : `${IMG_DIR}/${file}.png`;

  return error
    ? <span className="bb-emoji" role="img" aria-label={alt}>{emoji}</span>
    : <img src={src} alt={alt} loading="lazy" onError={() => setError(true)} />;
}

function ProductCard({ product, featured }) {
  return (
    <article className="bb-card">
      <span className={`bb-tag ${featured ? "" : "bb-tag-deal"}`}>{product.tag}</span>
      <div className="bb-pic">
        <Pic file={product.file} emoji={product.emoji} alt={product.title} />
      </div>
      <h3>{product.title}</h3>
      <p className="bb-pack">
        <span>{product.pack}</span>
        <span>{featured ? `${product.current}/${product.target}` : product.joined} joined</span>
      </p>
      <div className="bb-buy">
        <p className="bb-price">
          KES {Number(product.price || 0).toLocaleString("en-KE")}
          {product.old && <s>{product.old}</s>}
        </p>
        <Link to="/register" className="bb-join">+ Join</Link>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const [featured, setFeatured] = useState(FEATURED_SAMPLE);
  const [filter, setFilter] = useState("All Products");
  const strip = useRef(null);

  useEffect(() => {
    let ignore = false;

    fetch("/campaigns")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load campaigns");
        return response.json();
      })
      .then(data => {
        const list = Array.isArray(data) ? data : data.campaigns || [];

        if (!ignore && list.length > 0) {
          setFeatured(list.slice(0, 4).map(c => ({
            id: c.id,
            title: c.title || c.name,
            tag: c.tag || "In Stock",
            pack: c.pack || c.unit || "",
            price: c.price,
            current: c.current_quantity ?? c.current ?? 0,
            target: c.target_quantity ?? c.target ?? 0,
            file: c.image_url || (c.title || c.name || "").toLowerCase().replace(/\s+/g, "-"),
            emoji: "🧺"
          })));
        }
      })
      .catch(error => console.log(error));

    return () => { ignore = true; };
  }, []);

  const scroll = direction => {
    if (strip.current) {
      strip.current.scrollBy({ left: direction * 300, behavior: "smooth" });
    }
  };

  const selectCategory = name => {
    if (name === "Vegetables" || name === "Fruits") {
      setFilter(name);
    } else if (name === "Dairy") {
      setFilter("Dairy & Eggs");
    } else {
      setFilter("Grains");
    }
  };

  const deals = DEALS.filter(p => filter === "All Products" || p.cat === filter);

  return (
    <div className="bb">
      <div className="bb-announce">
        FREE Collection &amp; Full Refund If A Campaign Misses Its Target. Join Your 1st Campaign Today
      </div>

      <header className="bb-header bb-wrap">
        <Link to="/" className="bb-logo">🧺 Bread &amp; Basket</Link>
        <nav className="bb-nav">
          <a href="#top">Home</a>
          <a href="#campaigns">Shop</a>
          <a href="#deals">Wholesalers</a>
          <a href="#how">How it works</a>
          <a href="#contact">Contact</a>
        </nav>
        <input className="bb-search" type="search" placeholder="Search products" />
        <div className="bb-account">
          <Link to="/login">Log in</Link>
          <Link to="/register" className="bb-btn bb-lime">Register</Link>
        </div>
      </header>

      <main id="top" className="bb-wrap">
        <section className="bb-hero">
          <div className="bb-hero-text">
            <h1>Your Trusted Source for <em>Wholesale &amp; Fresh</em> Foods</h1>
            <p>Experience the convenience of buying together with your neighbours, at wholesale prices, with delivery or free collection.</p>
            <div className="bb-actions">
              <a href="#campaigns" className="bb-btn bb-lime">Shop Now</a>
              <a href="#deals" className="bb-btn bb-outline">Explore Offers</a>
            </div>
          </div>
          <div className="bb-hero-pic">
            <Pic file="hero-vegetables" emoji="🍅🥕🥬🥑" alt="Fresh vegetables" />
          </div>
        </section>

        <section className="bb-cats">
          <button className="bb-arrow" onClick={() => scroll(-1)}>‹</button>
          <div className="bb-strip" ref={strip}>
            {CATEGORIES.map(c => (
              <a key={c[0]} href="#deals" className="bb-cat" onClick={() => selectCategory(c[0])}>
                <Pic file={c[1]} emoji={c[2]} alt={c[0]} />
                <span>{c[0]}</span>
              </a>
            ))}
          </div>
          <button className="bb-arrow" onClick={() => scroll(1)}>›</button>
        </section>

        <section className="bb-promos">
          <div className="bb-promo bb-promo-green">
            <h3>Free Collection On Every Campaign.</h3>
            <a href="#campaigns" className="bb-btn bb-lime">Shop Now!</a>
            <Pic file="promo-cabbage" emoji="🥬" alt="" />
          </div>
          <div className="bb-promo bb-promo-orange">
            <h3>Ready To Join A Campaign?</h3>
            <p>Secure your share now and get fresh staples delivered fast.</p>
            <a href="#campaigns" className="bb-btn bb-white">Shop Now</a>
            <Pic file="promo-carrots" emoji="🥕" alt="" />
          </div>
          <div className="bb-promo bb-promo-yellow">
            <h3>Up To 36% OFF</h3>
            <p>Group prices that beat the supermarket on everyday staples.</p>
            <a href="#deals" className="bb-btn bb-dark">Grab The Offer</a>
            <Pic file="promo-kiwi" emoji="🥝" alt="" />
          </div>
        </section>

        <section id="campaigns" className="bb-section">
          <div className="bb-head">
            <h2>Featured Campaigns</h2>
            <Link to="/register">View All →</Link>
          </div>
          <div className="bb-grid bb-grid-4">
            {featured.map(p => <ProductCard key={p.id} product={p} featured />)}
          </div>
        </section>

        <section id="deals" className="bb-section">
          <div className="bb-head">
            <h2>Today Best Deals</h2>
            <div className="bb-pills">
              {FILTERS.map(f => (
                <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="bb-grid bb-grid-5">
            {deals.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        <section id="how" className="bb-section">
          <h2>How it works</h2>
          <ol className="bb-steps">
            <li><b>Pick a campaign</b><span>Browse open campaigns and see the price and progress.</span></li>
            <li><b>Join and pay with M-Pesa</b><span>Register, choose your quantity and secure your share.</span></li>
            <li><b>Collect or get refunded</b><span>Free collection when it succeeds, full refund if it misses its target.</span></li>
          </ol>
        </section>
      </main>

      <section className="bb-quote">
        <p className="bb-stars">★★★★★ <span>4.8 / 5</span></p>
        <blockquote>
          “Our chama used to buy tomatoes at the kiosk every week. Now we join one crate share and split it. Delivery to Kasarani comes the day after it closed.”
        </blockquote>
        <p className="bb-who"><b>Sample shopper</b>, Kasarani</p>
        <Link to="/register" className="bb-round">→</Link>
      </section>

      <footer id="contact" className="bb-footer bb-wrap">
        <span>© Bread &amp; Basket</span>
        <span><Link to="/login">Log in</Link> · <Link to="/register">Register</Link></span>
      </footer>
    </div>
  );
}
