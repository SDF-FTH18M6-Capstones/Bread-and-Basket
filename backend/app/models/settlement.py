from .base import BaseModel
from decimal import Decimal
from sqlalchemy import Numeric, CheckConstraint, UniqueConstraint, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from .enums import SettlementStatus, pg_enum



class Settlement(BaseModel):
  __tablename__ = "settlements"
  __table_args__ = (
    CheckConstraint("amount >= 0", name="chk_settlement_amount"),
    UniqueConstraint("seller_id", "campaign_id", name="uq_campaign_settlement")
  )

  seller_id: Mapped[int] = mapped_column(ForeignKey("seller_profiles.id"))
  campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"))
  amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
  status: Mapped[SettlementStatus] = mapped_column(
      pg_enum(SettlementStatus, "settlement_status"), server_default="pending"
  )
  settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))