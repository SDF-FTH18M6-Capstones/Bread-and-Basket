from ..errors import BusinessRuleError, NotFound
from ..services.service_helpers import add_history
from ..models.enums import OrderStatus, CampaignStatus
from ..extensions import db
from ..models.campaigns import Campaign
from ..models.orders import Order
from sqlalchemy import select


class FulfilmentService:
    def _move(self, order, status, note, admin):
        if status not in order.next_statuses:
            raise BusinessRuleError("Invalid Status", code="INVALID_STATUS_STEP")

        campaign = order.campaign  # the relationship: no query needed

        if (
            status == OrderStatus.PREPARING
            and campaign.product.seller_id is not None
            and campaign.stock_confirmed_at is None
        ):
            raise BusinessRuleError(
                "The seller hasn't confirmed stock for this campaign yet.",
                code="STOCK_NOT_CONFIRMED",
            )

        order.status = status
        add_history(order.id, status=status, note=note, by=admin.id)

        if (
            status == OrderStatus.PREPARING
            and campaign.status == CampaignStatus.SUCCESSFUL
        ):
            campaign.status = CampaignStatus.FULFILLING

    def list_campaign_orders(self, campaign_id):
        return db.session.scalars(
            select(Order)
            .where(Order.campaign_id == campaign_id)
            .order_by(Order.created_at.asc())
        ).all()

    def update_order_status(self, order_id, data, admin):
        order = db.session.get(Order, order_id)

        if order is None:
            raise NotFound("Order not found")

        status = data["status"]
        note = data["note"]

        self._move(order=order, status=status, note=note, admin=admin)

        db.session.commit()

        return order

    def batch_update(self, campaign_id, data, admin):
        campaign = db.session.get(Campaign, campaign_id)

        if campaign is None:
            raise NotFound("Campaign not found")

        campaign_status = campaign.status

        updated, skipped = 0, 0

        if campaign_status not in (
            CampaignStatus.FULFILLING,
            CampaignStatus.SUCCESSFUL,
        ):
            raise BusinessRuleError(
                "Campaign is not successful", code="CAMPAIGN_NOT_SUCCESSFUL"
            )

        for order in campaign.active_orders:
            if data["status"] in order.next_statuses:
                self._move(
                    order=order,
                    status=data["status"],
                    note=data["note"],
                    admin=admin,
                )
                updated += 1

            else:
                skipped += 1

        db.session.commit()

        return {
            "updated": updated,
            "skipped": skipped,
            "campaign_status": campaign.status,
        }
