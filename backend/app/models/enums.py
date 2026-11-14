import enum
from sqlalchemy import Enum


class UserRole(enum.Enum):
    ADMIN = "admin"
    SELLER = "seller"
    CONSUMER = "consumer"


class ApprovalStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ProductSource(enum.Enum):
    SELLER = "seller"
    PLATFORM = "platform"


class CampaignStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SUCCESSFUL = "successful"
    FAILED = "failed"
    FULFILLING = "fulfilling"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FulfilmentType(enum.Enum):
    DELIVERY = "delivery"
    COLLECTION = "collection"


class OrderStatus(enum.Enum):
    PAID = "paid"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    DISPATCHED = "dispatched"
    READY_FOR_COLLECTION = "ready_for_collection"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(enum.Enum):
    SUCCESSFUL = "successful"
    REFUNDED = "refunded"


class RefundReason(enum.Enum):
    CONSUMER_CANCELLED = "consumer_cancelled"
    CAMPAIGN_FAILED = "campaign_failed"


class SettlementStatus(enum.Enum):
    PENDING = "pending"
    PAID = "paid"


def pg_enum(enum_cls, name):
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda e: [m.value for m in e],
    )
