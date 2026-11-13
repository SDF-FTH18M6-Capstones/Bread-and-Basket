from .base import BaseModel
from datetime import datetime
from decimal import Decimal
from .enums import OrderStatus, FulfilmentType, pg_enum
from sqlalchemy import Numeric, DateTime, String, func, CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Order(BaseModel):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="chk_order_quantity"),
        CheckConstraint(
            "unit_price > 0 AND platform_charge >= 0 AND logistics_charge >= 0",
            name="chk_order_amounts",
        ),
        CheckConstraint(
            "fulfilment <> 'delivery' OR delivery_address IS NOT NULL",
            name="chk_delivery_address",
        ),
        CheckConstraint(
            "fulfilment <> 'collection' OR logistics_charge = 0",
            name="chk_collection_free",
        ),
        CheckConstraint(
            "total_amount = quantity * (unit_price + platform_charge) +"
            " logistics_charge",
            name="chk_total",
        ),
    )

    order_no: Mapped[str] = mapped_column(String(30), unique=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), index=True)
    consumer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    quantity: Mapped[int] = mapped_column()
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    platform_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    logistics_charge: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), server_default="0"
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    fulfilment: Mapped[FulfilmentType] = mapped_column(
        pg_enum(FulfilmentType, "fulfilment_type")
    )
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))
    delivery_address: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[OrderStatus] = mapped_column(
        pg_enum(OrderStatus, "order_status"), server_default="paid"
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="orders")
    consumer: Mapped["User"] = relationship(back_populates="orders")
    location: Mapped["Location"] = relationship()
    payment: Mapped["Payment"] = relationship(back_populates="order")
    history: Mapped[list["OrderStatusHistory"]] = relationship(
        back_populates="order", order_by="OrderStatusHistory.created_at"
    )
    refund: Mapped["Refund | None"] = relationship(back_populates="order")
