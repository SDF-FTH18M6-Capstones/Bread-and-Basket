from .base import BaseModel
from datetime import datetime
from decimal import Decimal
from .enums import PaymentStatus, pg_enum
from sqlalchemy import Numeric, DateTime, String, func, CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column



class Payment(BaseModel):
  __tablename__ = "payments"
  __table_args__ = (
    CheckConstraint("amount > 0", name="chk_payment_amount"),
  )

  order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), unique=True)
  amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
  method: Mapped[str] = mapped_column(
      String(30), server_default="simulated_mpesa"
  )
  reference: Mapped[str | None] = mapped_column(String(60))
  status: Mapped[PaymentStatus] = mapped_column(
      pg_enum(PaymentStatus, "payment_status"), server_default="successful"
  )
  paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


