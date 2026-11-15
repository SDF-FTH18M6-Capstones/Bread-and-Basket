import { Link } from "react-router-dom";

import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import { assetUrl } from "../../api/client";
import { isEndingSoon, kes, timeLeft } from "../../lib/format";

function stateOf(campaign) {
  if (campaign.sold_out) {
    return { text: "Sold out", tone: "grey" };
  }

  if (isEndingSoon(campaign.deadline)) {
    return { text: "Ending soon", tone: "orange" };
  }

  if (campaign.min_reached) {
    return { text: "Min reached", tone: "green" };
  }

  return {
    text: `Needs ${campaign.min_quantity - campaign.ordered_quantity} more`,
    tone: "orange",
  };
}

export default function CampaignCard({ campaign }) {
  const { product } = campaign;
  const state = stateOf(campaign);
  const imageSrc = assetUrl(product.image_url);

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="block h-full w-full min-w-0 rounded-[18px] bg-white p-2.5 transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
      aria-label={`View ${campaign.title} campaign details`}
    >
      <article className="flex h-full flex-col gap-1.5">
        <div className="relative h-[150px] overflow-hidden rounded-[14px]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              className="size-full object-contain"
            />
          ) : (
            <div
              className="grid size-full place-items-center bg-canvas text-5xl font-bold text-forest/30"
              aria-hidden="true"
            >
              {product.name[0]}
            </div>
          )}

          <Badge tone={state.tone} className="absolute left-1.5 top-1.5">
            {state.text}
          </Badge>
        </div>

        <div className="tabular-nums">
          <span className="text-[17px] font-bold text-forest">
            {kes(campaign.campaign_price)}
          </span>{" "}
          <span className="text-[13px] text-muted line-through">
            {kes(product.retail_price)}
          </span>
        </div>

        <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>

        <p className="text-[13px] text-muted">
          {product.unit} · {timeLeft(campaign.deadline)}
        </p>

        <ProgressBar
          value={campaign.ordered_quantity}
          min={campaign.min_quantity}
          max={campaign.max_quantity}
          label={`${campaign.ordered_quantity} of ${campaign.max_quantity} joined, minimum ${campaign.min_quantity}`}
        />

        <p className="text-[13px] tabular-nums text-muted">
          {campaign.ordered_quantity}/{campaign.max_quantity} joined
        </p>
      </article>
    </Link>
  );
}
 