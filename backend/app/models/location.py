from .base import BaseModel
from decimal import Decimal
from sqlalchemy import String, Numeric, text, CheckConstraints
from sqlalchemy.orm import Mapped, mapped_column


class Location(BaseModel):
    __tablename__ = "locations"

    name: Mapped[str] = mapped_column(String(100))
    deliver_fee = Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default=0)
    collection_point = Mapped[str] = mapped_column(String(100))
    is_active = Mapped[bool] = mapped_column(server_default=text("true"))
