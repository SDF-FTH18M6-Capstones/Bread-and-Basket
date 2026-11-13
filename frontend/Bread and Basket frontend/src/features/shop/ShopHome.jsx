import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { listCampaigns } from "../../api/campaigns";
import { isEndingSoon } from "../../lib/format";
import CampaignRail from "./CampaignRail";

const FRESH = ["vegetables", "fruits"];

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ShopHome() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listCampaigns()
      .then((data) => {
        if (cancelled) return;
        setCampaigns(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.full_name?.trim().split(" ")[0] || "User";

  // Each row is a filter of the same list, as described in the API contract.
  const endingSoon = campaigns.filter((c) => isEndingSoon(c.deadline));
  const almostUnlocked = campaigns.filter((c) => !c.min_reached);
  const freshProduce = campaigns.filter((c) =>
    FRESH.includes(c.product.category),
  );
  const pantryStaples = campaigns.filter(
    (c) => !FRESH.includes(c.product.category),
  );

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-12 pt-5">
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

      {status === "loading" && (
        <p className="mt-[26px] text-muted">Loading campaigns...</p>
      )}

      {status === "error" && (
        <div
          className="mt-[26px] rounded-lg bg-bad-soft px-3 py-2.5 text-sm text-bad"
          role="alert"
        >
          {error}
        </div>
      )}

      {status === "ready" && campaigns.length === 0 && (
        <p className="mt-[26px] text-muted">
          No campaigns are open right now. Check back soon.
        </p>
      )}

      {status === "ready" && (
        <>
          <CampaignRail title="Ending soon" campaigns={endingSoon} />
          <CampaignRail title="Almost unlocked" campaigns={almostUnlocked} />
          <CampaignRail title="Fresh produce" campaigns={freshProduce} />
          <CampaignRail title="Pantry staples" campaigns={pantryStaples} />
        </>
      )}
    </main>
  );
}
