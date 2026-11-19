from ..models import Product, Campaign
from sqlalchemy import select, or_
from ..extensions import db
from datetime import timezone, datetime, timedelta
from ..errors import NotFound, BusinessRuleError
from ..models.enums import UserRole, OrderStatus, CampaignStatus, RefundReason
from .service_helpers import add_history, refund_order


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

    def close_due_campaigns(self):
        """Close every active campaign whose deadline has passed. Returns one result per campaign."""
        now = datetime.now(timezone.utc)

        campaigns = db.session.scalars(
            select(Campaign)
            .where(Campaign.status == CampaignStatus.ACTIVE, Campaign.deadline <= now)
            .with_for_update()
        ).all()

        results = []

        for campaign in campaigns:
            results.append(self.close_campaign(campaign))

        return results

    def close_campaign(self, campaign, by=None):
        if campaign.status != CampaignStatus.ACTIVE:
            raise BusinessRuleError(
                "Cannot close a campaign that's not active", code="CAMPAIGN_NOT_ACTIVE"
            )

        now = datetime.now(timezone.utc)
        orders_confirmed, orders_refunded = 0, 0

        if campaign.min_reached:
            campaign.status = CampaignStatus.SUCCESSFUL
            outcome = CampaignStatus.SUCCESSFUL.value

            for order in campaign.orders:
                if order.status == OrderStatus.PAID:
                    order.status = OrderStatus.CONFIRMED
                    add_history(
                        order.id,
                        OrderStatus.CONFIRMED,
                        "Campaign reached its minimum",
                        by,
                    )
                    orders_confirmed += 1

        else:
            campaign.status = CampaignStatus.FAILED
            outcome = CampaignStatus.FAILED.value

            for order in campaign.active_orders:
                print("we were touched")
                if order.status == OrderStatus.PAID:
                    refund_order(
                        order,
                        RefundReason.CAMPAIGN_FAILED,
                        OrderStatus.REFUNDED,
                        "Campaign did not reach its minimum",
                        by,
                    )
                    orders_refunded += 1

        campaign.closed_at = now
        db.session.commit()

        return {
            "campaign": campaign,
            "outcome": outcome,
            "orders_confirmed": orders_confirmed,
            "orders_refunded": orders_refunded,
        }
