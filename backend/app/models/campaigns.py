from .base import BaseModel
from decimal import Decimal
from sqlalchemy import String, Numeric, CheckConstraint, func, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .enums import CampaignStatus, pg_enum
from datetime import datetime, timezone


class Campaign(BaseModel):
    __tablename__ = "campaigns"
    __table_args__ = (
        CheckConstraint(
            "campaign_price > 0 AND platform_charge >= 0", name="chk_campaign_price"
        ),
        CheckConstraint(
            "min_quantity >= 1 AND min_quantity <= max_quantity", name="chk_qty"
        ),
        CheckConstraint(
            "min_order_quantity >= 1 AND min_order_quantity <= max_quantity AND (max_per_user IS NULL OR (min_order_quantity <= max_per_user AND max_per_user <= max_quantity))",
            name="chk_order_qty",
        ),
        CheckConstraint("cancellation_cutoff <= deadline", name="chk_cutoff"),
    )

    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(150))
    campaign_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    platform_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    min_quantity: Mapped[int] = mapped_column()
    max_quantity: Mapped[int] = mapped_column()
    min_order_quantity: Mapped[int] = mapped_column(server_default="1")
    max_per_user: Mapped[int | None] = mapped_column()
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cancellation_cutoff: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[CampaignStatus] = mapped_column(
        pg_enum(CampaignStatus, "campaign_status"), server_default="draft"
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stock_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    product: Mapped["Product"] = relationship(back_populates="campaigns")
    orders: Mapped[list["Order"]] = relationship(back_populates="campaign")

    # calculated properties

    @property
    def active_orders(self) -> list:
        return [order for order in self.orders if order.is_live]

    @property
    def ordered_quantity(self) -> int:
        return sum(order.quantity for order in self.active_orders)

    @property
    def households(self) -> int:
        return len({order.consumer_id for order in self.active_orders})

    @property
    def min_reached(self) -> bool:
        return self.ordered_quantity >= self.min_quantity

    @property
    def sold_out(self) -> bool:
        return self.ordered_quantity >= self.max_quantity

    @property
    def savings_per_unit(self) -> Decimal:
        return self.product.retail_price - self.campaign_price

    @property
    def remaining_quantity(self) -> int:
        return self.max_quantity - self.ordered_quantity

    @property
    def can_join(self) -> bool:
        return (
            self.status == CampaignStatus.ACTIVE
            and self.deadline > datetime.now(timezone.utc)
            and not self.sold_out
        )

    def quantity_held_by(self, user) -> int:
        return sum(
            order.quantity
            for order in self.active_orders
            if order.consumer_id == user.id
        )

    def max_orderable_for(self, user) -> int:
        left_in_campaign = self.remaining_quantity
        if self.max_per_user is None:
            return max(0, left_in_campaign)
        left_for_user = self.max_per_user - self.quantity_held_by(user)
        return max(0, min(left_in_campaign, left_for_user))
