from .base import BaseModel

from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .enums import ApprovalStatus, pg_enum


class SellerProfile(BaseModel):
    __tablename__ = "seller_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    business_name: Mapped[str] = mapped_column(String(150))
    registration_number: Mapped[str] = mapped_column(String(60))
    business_address: Mapped[str] = mapped_column(String(255))
    verification_status: Mapped[ApprovalStatus] = mapped_column(
        pg_enum(ApprovalStatus, "verification_status"), server_default="pending"
    )
    rejection_reason: Mapped[str | None] = mapped_column(String(255))
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(
        back_populates="seller_profile", foreign_keys=[user_id]
    )
    products: Mapped[list["Product"]] = relationship(back_populates="seller_profile")
