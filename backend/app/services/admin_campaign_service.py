from ..models.enums import CampaignStatus, ApprovalStatus
from ..models.campaigns import Campaign
from ..extensions import db
from sqlalchemy import select
from ..errors import NotFound, BusinessRuleError
from ..models.products import Product
from datetime import datetime, timezone, timedelta
from .campaign_service import CampaignService


class AdminCampaignService:
    def _get(self, campaign_id, lock=False):
        stmt = select(Campaign).where(Campaign.id == campaign_id)

        if lock:
            stmt = stmt.with_for_update()

        campaign = db.session.scalar(stmt)

        if campaign is None:
            raise NotFound("Campaign not found")

        return campaign

    def _check_campaign_status(self, campaign_id):
        campaign = self._get(campaign_id)
        if campaign.status != CampaignStatus.DRAFT:
            raise BusinessRuleError(
                "Campaign is not a draft", code="CAMPAIGN_NOT_DRAFT"
            )

        return campaign

    def _check_deadline(self, campaign):
        now = datetime.now(timezone.utc)

        # check deadline
        if campaign.deadline <= now:
            raise BusinessRuleError(
                "Deadline should be in the future", code="DEADLINE_IN_PAST"
            )

    def _check_rules(self, campaign):
        # check product status
        if campaign.product.approval_status is not ApprovalStatus.APPROVED:
            raise BusinessRuleError(
                # "Product is not approved"
                f"{campaign.product.name} is not approved",
                code="PRODUCT_NOT_APPROVED",
            )

        # check deadline
        self._check_deadline(campaign)

        if (
            campaign.cancellation_cutoff
            and campaign.cancellation_cutoff > campaign.deadline
        ):
            raise BusinessRuleError(
                "Cuttoff should be before deadline", code="CUTOFF_AFTER_DEADLINE"
            )

        if campaign.min_quantity > campaign.max_quantity:
            raise BusinessRuleError(
                "Minimum quantity should be below maximum quantity",
                code="MIN_ABOVE_MAX",
            )

        if campaign.max_quantity > campaign.product.stock_quantity:
            raise BusinessRuleError(
                "Maximum quantity allocated is above stock quantity",
                code="NOT_ENOUGH_STOCK",
            )

        if campaign.min_order_quantity > campaign.max_quantity:
            raise BusinessRuleError(
                "Minimum order quantity is above maximum quantity",
                code="MIN_ORDER_ABOVE_MAX",
            )
        if (
            campaign.max_per_user
            and campaign.max_per_user < campaign.min_order_quantity
            or campaign.max_per_user > campaign.max_quantity
        ):
            raise BusinessRuleError(
                "Max per person should be between min order and max quantity",
                code="INVALID_MAX_PER_USER",
            )

    def list_all(self, args):
        stmt = select(Campaign)

        if "status" in args:
            stmt = stmt.where(Campaign.status == args["status"])

        return db.session.scalars(stmt.order_by(Campaign.created_at.desc())).all()

    def create(self, data, admin):
        # check for product
        product = db.session.scalar(
            select(Product).where(Product.id == data["product_id"])
        )

        if product is None:
            raise NotFound("Product does not exist")

        if "cancellation_cutoff" not in data:
            data["cancellation_cutoff"] = data["deadline"] - timedelta(days=3)

        # create campaign object
        campaign = Campaign(
            product_id=data["product_id"],
            title=data["title"],
            max_quantity=data["max_quantity"],
            min_quantity=data["min_quantity"],
            platform_charge=data["platform_charge"],
            min_order_quantity=data["min_order_quantity"],
            max_per_user=data["max_per_user"],
            deadline=data["deadline"],
            cancellation_cutoff=data["cancellation_cutoff"],
            # add system items
            campaign_price=product.wholesale_price,
            status=CampaignStatus.DRAFT,
            created_by=admin.id,
            product=product,
        )

        # check for issues
        self._check_rules(campaign)

        db.session.add(campaign)
        db.session.commit()

        return campaign

    def update(self, campaign_id, data):
        campaign = self._check_campaign_status(campaign_id)

        for key, value in data.items():
            setattr(campaign, key, value)

        self._check_rules(campaign)

        db.session.commit()

        return campaign

    def activate(self, campaign_id):
        campaign = self._check_campaign_status(campaign_id)

        # check deadline
        self._check_deadline(campaign)
        campaign.status = CampaignStatus.ACTIVE

        db.session.commit()

        return campaign

    def cancel(self, campaign_id):
        now = datetime.now(timezone.utc)

        campaign = self._get(campaign_id)
        if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.ACTIVE):
            raise BusinessRuleError(
                "Campaign is not a draft or active", code="CAMPAIGN_NOT_CANCELLABLE"
            )

        if len(campaign.active_orders) > 0:
            raise BusinessRuleError(
                "Campaign has live orders", code="CAMPAIGN_HAS_ORDERS"
            )

        campaign.status = CampaignStatus.CANCELLED
        campaign.closed_at = now

        db.session.commit()

        return campaign

    def close(self, campaign_id, admin):
        campaign = self._get(campaign_id)
        result = CampaignService().close_campaign(campaign, by=admin.id)

        return result
