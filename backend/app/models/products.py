from .base import BaseModel
from decimal import Decimal
from sqlalchemy import (
    String,
    Numeric,
    Text,
    CheckConstraint,
    func,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .enums import ApprovalStatus, ProductSource, pg_enum


class Product(BaseModel):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint(
            "(source = 'platform' AND seller_id IS NULL) OR (source = 'seller' AND seller_id IS NOT NULL)",
            name="chk_source",
        ),
        CheckConstraint(
            "wholesale_price > 0 AND retail_price > wholesale_price", name="chk_prices"
        ),
        CheckConstraint("stock_quantity >= 0", name="chk_stock"),
    )

    seller_id: Mapped[int | None] = mapped_column(
        ForeignKey("seller_profiles.id"), index=True
    )
    source: Mapped[ProductSource] = mapped_column(
        pg_enum(ProductSource, "product_source")
    )
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40))
    unit: Mapped[str] = mapped_column(String(40))
    image_url: Mapped[str | None] = mapped_column(String(255))
    wholesale_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    retail_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    stock_quantity: Mapped[int] = mapped_column(server_default="0")
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        pg_enum(ApprovalStatus, "approval_status"), server_default="pending"
    )
    rejection_reason: Mapped[str | None] = mapped_column(String(255))
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    seller_profile: Mapped["SellerProfile | None"] = relationship(
        back_populates="products"
    )
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="product")
