import CampaignCard from "./CampaignCard";

// A titled row of campaign cards that scrolls sideways. Renders nothing if the list is empty.
export default function CampaignRail({ title, campaigns }) {
  if (campaigns.length === 0) return null;
  const id = `rail-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={id} className="mt-[26px]">
      <h2
        id={id}
        className="mb-3 text-xl font-bold leading-[1.15] tracking-tight"
      >
        {title}
      </h2>
      <div className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-0.5 pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </section>
  );
}
