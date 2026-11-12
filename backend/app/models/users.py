from .base import BaseModel
from sqlalchemy import String, Numeric, text, CheckConstraints
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from enum import Enum


class User(BaseModel):
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100))
    phone: Mapped[int] = mapped_column(int(10, 2))
    password_has: Mapped[str] = mapped_column()
    role: Mapped[Enum] = mapped_column(Enum("admin", "seller", "consumer"))
    is_active: Mapped[bool] = mapped_column(server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column()
