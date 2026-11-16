import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

function CampaignCard({ campaign }) {
  const title = campaign.title || campaign.name;
  const price = campaign.price || 0;
  const current = campaign.current_quantity || campaign.current || 0;
  const target = campaign.target_quantity || campaign.target || 0;

  let progress = 0;

  if (target > 0) {
    progress = (current / target) * 100;
  }

  if (progress > 100) {
    progress = 100;
  }

  return (
    <div className="bb-card">
      <h3>{title}</h3>

      <p className="bb-price">
        KSh {Number(price).toLocaleString("en-KE")}
      </p>

      <div className="bb-bar">
        <i style={{ width: progress + "%" }}></i>
      </div>

      <div className="bb-meta">
        <span>{current} of {target} ordered</span>
        <span>{campaign.ends_at || campaign.deadline || "Open"}</span>
      </div>

      <Link to="/register" className="bb-btn bb-primary">
        Register to join
      </Link>
    </div>
  );
}

function LandingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/campaigns")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        } else {
          setCampaigns(data.campaigns || []);
        }

        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bb">

      {/* Header and hero */}
      <div className="bb-hero">
        <div className="bb-wrap">

          <header className="bb-header">
            <Link to="/" className="bb-logo">
              Bread &amp; Basket
            </Link>

            <nav>
              <Link to="/login" className="bb-link">
                Log in
              </Link>

              <Link to="/register" className="bb-btn bb-primary">
                Register
              </Link>
            </nav>
          </header>

          <h1>Fresh from the baker, shared with the neighbourhood.</h1>

          <p>
            Join live campaigns from local sellers, order together,
            and pay with M-Pesa. You don't need an account to look.
          </p>

          <a href="#campaigns" className="bb-btn bb-primary">
            See live campaigns
          </a>

        </div>
      </div>

      {/* Campaigns */}
      <section id="campaigns" className="bb-wrap bb-section">

        <h2>Live campaigns</h2>

        <p className="bb-sub">
          If a campaign closes without reaching its goal, you're refunded.
        </p>

        {loading && <p>Loading campaigns...</p>}

        {!loading && campaigns.length === 0 && (
          <p>No campaigns available right now.</p>
        )}

        <div className="bb-grid">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
            />
          ))}
        </div>

      </section>

      {/* Bottom section */}
      <section className="bb-closing">
        <div className="bb-wrap">

          <h2>Ready to fill your basket?</h2>

          <Link to="/register" className="bb-btn bb-primary">
            Register
          </Link>

          <Link to="/login" className="bb-link">
            Log in
          </Link>

        </div>
      </section>

    </div>
  );
}

export default LandingPage;
