from .base import BaseModel
from decimal import Decimal
from sqlalchemy import Numeric, CheckConstraint, func, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from .enums import RefundReason, pg_enum


class Refund(BaseModel):
  __tablename__ = "refunds"
  __table_args__ = (
    CheckConstraint("amount > 0", name="chk_refund_amount"),
  )

  payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), unique=True)
  order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
  amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
  reason: Mapped[RefundReason] = mapped_column(pg_enum(RefundReason, "refund_reason"))
  processed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
  processed_at: Mapped[datetime] = mapped_column(
      DateTime(timezone=True), server_default=func.now()
  )