from sqlalchemy import select
from ..models.orders import Order
from ..models.location import Location
from ..models.campaigns import Campaign
from ..models.payments import Payment
from ..models.refunds import Refund
from ..models.orderStatusHistory import OrderStatusHistory
from ..models.enums import (
    CampaignStatus,
    FulfilmentType,
    OrderStatus,
    PaymentStatus,
    RefundReason,
)
from ..errors import NotFound, BusinessRuleError
from ..extensions import db
from .service_helpers import add_history
from datetime import datetime, timezone
from .payments import SimulatedMpesaGateway
from uuid import uuid4


class OrderService:
    def place_order(self, user, data):
        campaign = db.session.scalar(
            select(Campaign).where(Campaign.id == data["campaign_id"]).with_for_update()
        )

        if campaign is None or campaign.status == CampaignStatus.DRAFT:
            raise NotFound("Campaign not Found.")

        location = db.session.get(Location, data["location_id"])

        if location is None or not location.is_active:
            raise BusinessRuleError(
                "This location is not available. Pick another one.",
                code="LOCATION_UNAVAILABLE",
            )

        if (
            campaign.status != CampaignStatus.ACTIVE
            or campaign.deadline <= datetime.now(timezone.utc)
        ):
            raise BusinessRuleError(
                "This campaign is no longer taking orders", code="CAMPAIGN_CLOSED"
            )

        if data["quantity"] < campaign.min_order_quantity:
            raise BusinessRuleError(
                f"The minimum order for this campaign is {campaign.min_order_quantity} units.",
                code="BELOW_MIN_ORDER_QUANTITY",
            )
        if data["quantity"] > campaign.remaining_quantity:
            raise BusinessRuleError(
                f"Only {campaign.remaining_quantity} units are left in this campaign.",
                code="NOT_ENOUGH_STOCK",
            )
        if data["quantity"] > campaign.max_orderable_for(user):
            raise BusinessRuleError(
                f"You can order at most {campaign.max_orderable_for(user)} more units of this campaign.",
                code="MAX_PER_USER_EXCEEDED",
            )

        logistics_charge = 0

        if data["fulfilment"] == FulfilmentType.DELIVERY:
            logistics_charge = location.delivery_fee
            delivery_address = data["delivery_address"]
        else:
            delivery_address = None

        total_amount = (
            data["quantity"] * (campaign.campaign_price + campaign.platform_charge)
            + logistics_charge
        )
        phone_number = data["phone"]

        reference = SimulatedMpesaGateway().charge(phone_number, total_amount)

        # order
        order = Order(
            order_no=f"TMP-{uuid4().hex[:20]}",
            campaign_id=data["campaign_id"],
            consumer_id=user.id,
            quantity=data["quantity"],
            unit_price=campaign.campaign_price,
            platform_charge=campaign.platform_charge,
            logistics_charge=logistics_charge,
            total_amount=total_amount,
            fulfilment=data["fulfilment"],
            location_id=location.id,
            delivery_address=delivery_address,
            status=OrderStatus.PAID,
            cancelled_at=None,
        )
        db.session.add(order)
        db.session.flush()

        order.order_no = f"ODR-{10000 + order.id}"

        # payments
        payment = Payment(
            order_id=order.id,
            amount=total_amount,
            reference=reference,
            status=PaymentStatus.SUCCESSFUL,
        )

        add_history(
            order.id,
            OrderStatus.PAID,
            "Payment received",
        )

        db.session.add(payment)
        db.session.commit()

        return order

    def list_my_orders(self, user):
        order_consumer_id = user.id
        orders = db.session.scalars(
            select(Order)
            .where(Order.consumer_id == order_consumer_id)
            .order_by(Order.created_at.desc())
        ).all()

        return orders

    def get_viewer_order(self, order_id, user):
        order = db.session.get(Order, order_id)

        if order is None or order.consumer_id != user.id:
            raise NotFound("Order not found", code="ORDER_NOT_FOUND")

        return order

    def cancel_order(self, order_id, user):
        order = self.get_viewer_order(order_id, user)

        if order.status not in (OrderStatus.PAID, OrderStatus.CONFIRMED):
            raise BusinessRuleError(
                f"An order that is {order.status.value} cannot be cancelled.",
                code="ORDER_NOT_CANCELLABLE",
            )
        now = datetime.now(timezone.utc)

        if now > order.cancellation_cutoff:
            raise BusinessRuleError(
                "This order can no longer be cancelled ",
                code="PAST_CANCELLATION_CUTOFF",
            )

        order.status = OrderStatus.CANCELLED
        order.cancelled_at = now
        order.payment.status = PaymentStatus.REFUNDED

        refund = Refund(
            payment_id=order.payment.id,
            order_id=order.id,
            amount=order.payment.amount,
            reason=RefundReason.CONSUMER_CANCELLED,
            processed_by=user.id,
        )

        add_history(order.id, OrderStatus.CANCELLED, "Cancelled by consumer", user.id)

        db.session.add(refund)
        db.session.commit()

        return order

    def confirm_receipt(self, order_id, user):
        order = self.get_viewer_order(order_id, user)

        if order.status not in (
            OrderStatus.DISPATCHED,
            OrderStatus.READY_FOR_COLLECTION,
        ):
            raise BusinessRuleError("Order is not ready", code="ORDER_NOT_READY")

        order.status = OrderStatus.COMPLETED

        add_history(
            order.id,
            OrderStatus.COMPLETED,
            "Receipt confirmed by consumer",
            user.id,
        )

        db.session.commit()

        return order
