import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CampaignCard from "../../features/shop/CampaignCard";

export default function CampaignRail({ title, campaigns, seeAllTo }) {
  if (!campaigns.length) return null; // empty rails just don't show

  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-forest no-underline hover:underline"
          >
            See all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="w-44 shrink-0 snap-start sm:w-52">
            <CampaignCard campaign={campaign} />
          </div>
        ))}
      </div>
    </section>
  );
}
