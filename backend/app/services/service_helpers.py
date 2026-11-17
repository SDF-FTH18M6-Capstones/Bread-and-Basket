from ..models.orderStatusHistory import OrderStatusHistory
from ..extensions import db


def add_history(order_id, status, note, by=None):
    db.session.add(
        OrderStatusHistory(order_id=order_id, status=status, note=note, updated_by=by)
    )
