from .base import BaseModel
from sqlalchemy import String, text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from .enums import pg_enum, UserRole


class User(BaseModel):
  __tablename__ = "users"

  full_name: Mapped[str] = mapped_column(String(120))
  email: Mapped[str] = mapped_column(String(120), unique=True)
  phone: Mapped[str | None] = mapped_column(String(20))
  password_hash: Mapped[str] = mapped_column(String(255))
  role: Mapped[UserRole] = mapped_column(pg_enum(UserRole, "user_role"))
  is_active: Mapped[bool] = mapped_column(server_default=text("true"))
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )