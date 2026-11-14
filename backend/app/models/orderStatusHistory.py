from .base import BaseModel
from sqlalchemy import String, func, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from .enums import OrderStatus, pg_enum


class OrderStatusHistory(BaseModel):
    __tablename__ = "order_status_history"

    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    status: Mapped[OrderStatus] = mapped_column(pg_enum(OrderStatus, "order_status"))
    note: Mapped[str | None] = mapped_column(String(255))
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    order: Mapped["Order"] = relationship(back_populates="history")
