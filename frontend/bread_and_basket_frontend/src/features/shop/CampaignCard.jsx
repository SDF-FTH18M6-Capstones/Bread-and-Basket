import { Link } from "react-router-dom";

import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import { isEndingSoon, kes, timeLeft } from "../../lib/format";
import { productImage } from "../../lib/productImages";

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

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="group block h-full w-full min-w-0 rounded-[18px] bg-white p-2.5 no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(19,61,39,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
      aria-label={`View ${campaign.title} campaign details`}
    >
      <article className="flex h-full flex-col gap-1.5">
        <div className="relative h-[140px] overflow-hidden rounded-[14px] bg-canvas sm:h-[150px]">
          {campaign.product ? (
            <img
              src={productImage(campaign.product)}
              alt={campaign.product.name}
              loading="lazy"
              className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="grid size-full place-items-center bg-canvas text-5xl font-bold text-forest/30"
              aria-hidden="true"
            >
              {product.name[0]}
            </div>
          )}

          <Badge tone={state.tone} className="absolute left-2 top-2 shadow-sm">
            {state.text}
          </Badge>
        </div>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
          <span className="text-[17px] font-bold leading-none text-forest">
            {kes(campaign.campaign_price)}
          </span>
          <span className="text-xs text-muted line-through">
            {kes(product.retail_price)}
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight text-ink">
          {product.name}
        </h3>

        <p className="truncate text-xs text-muted">
          {product.unit} · {timeLeft(campaign.deadline)}
        </p>

        {/* mt-auto pins progress to the bottom, so it lines up across a row */}
        <div className="mt-auto flex flex-col gap-1 pt-1">
          <ProgressBar
            value={campaign.ordered_quantity}
            min={campaign.min_quantity}
            max={campaign.max_quantity}
            label={`${campaign.ordered_quantity} of ${campaign.max_quantity} joined, minimum ${campaign.min_quantity}`}
          />

          <p className="text-xs tabular-nums text-muted">
            {campaign.ordered_quantity}/{campaign.max_quantity} joined
          </p>
        </div>
      </article>
    </Link>
  );
}
