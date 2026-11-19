from ..models.orderStatusHistory import OrderStatusHistory
from ..models.refunds import Refund
from ..extensions import db
from ..models.enums import OrderStatus, PaymentStatus
from datetime import datetime, timezone


def add_history(order_id, status, note, by=None):
    db.session.add(
        OrderStatusHistory(order_id=order_id, status=status, note=note, updated_by=by)
    )


def refund_order(order, reason, new_status, note, by=None):
    """Refund an order in full"""
    print("An order came through here")
    print(f"Order referrence: {order.order_no}")
    print(f"Amount refunded: {order.payment.amount}")
    order.payment.status = PaymentStatus.REFUNDED
    db.session.add(
        Refund(
            payment_id=order.payment.id,
            order_id=order.id,
            amount=order.payment.amount,
            reason=reason,
            processed_by=by,
        )
    )
    order.staus = new_status

    if new_status is OrderStatus.CANCELLED:
        order.cancelled_at = datetime.now(timezone.utc)

    add_history(order.id, new_status, note, by)
