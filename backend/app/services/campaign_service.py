from ..models import Product, Campaign
from ..models.enums import CampaignStatus
from sqlalchemy import select, or_
from ..extensions import db
from datetime import timezone, datetime, timedelta
from ..errors import NotFound
from ..models.enums import UserRole


class CampaignService:
    def list_active(self, args):
        now = datetime.now(timezone.utc)

        stmt = (
            select(Campaign)
            .join(Campaign.product)
            .where(Campaign.status == CampaignStatus.ACTIVE)
        )

        # fetch campaigns based on category
        if "category" in args:
            stmt = stmt.where(Product.category == args["category"])

        if "q" in args:
            stmt = stmt.where(
                or_(
                    Campaign.title.ilike(f"%{args['q']}%"),
                    Product.name.ilike(f"%{args['q']}%"),
                )
            )

        if args.get("filter") == "ending_soon":
            stmt = stmt.where(
                Campaign.deadline > now, Campaign.deadline <= now + timedelta(hours=48)
            )

        campaigns = db.session.scalars(stmt.order_by(Campaign.deadline)).all()

        if args.get("filter") == "almost_unlocked":
            campaigns = [campaign for campaign in campaigns if not campaign.min_reached]

        return campaigns

    def get_for_viewer(self, campaign_id, user):
        campaign = db.session.get(Campaign, campaign_id)
        is_admin = user is not None and user.role == UserRole.ADMIN

        if campaign is None or (
            campaign.status == CampaignStatus.DRAFT and not is_admin
        ):
            raise NotFound("Campaign not found")

        return campaign
