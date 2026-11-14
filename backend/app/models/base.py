from typing import Any
from sqlalchemy import Identity
from sqlalchemy.orm import Mapped, mapped_column
from ..extensions import db


class BaseModel(db.Model):
    __abstract__ = True

    id: Mapped[int] = mapped_column(Identity(), primary_key=True)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)

    def __repr__(self):
        return f"<{type(self).__name__} {self.id}>"
