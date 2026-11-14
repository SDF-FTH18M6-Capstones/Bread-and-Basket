from .base import BaseModel
from datetime import datetime
from sqlalchemy import String, ForeignKey, Boolean, func, DateTime
from sqlalchemy.orm import Mapped, mapped_column



class Notification(BaseModel):
  __tablename__ = "notifications"

  user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
  message: Mapped[str] = mapped_column(String(255))
  is_read: Mapped[bool] = mapped_column(Boolean, server_default="false")
  created_at: Mapped[datetime] = mapped_column(
      DateTime(timezone=True), server_default=func.now()
  )