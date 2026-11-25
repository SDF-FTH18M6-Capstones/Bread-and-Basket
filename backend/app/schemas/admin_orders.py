from marshmallow import Schema, fields, validate
from ..models.enums import (
    OrderStatus,
    FulfilmentType,
    CampaignStatus,
    RefundReason,
    PaymentStatus,
)
from .location import LocationSchema
from .auth import UserSchema
from datetime import timezone


class StatusUpdateSchema(Schema):
    status = fields.Enum(
        OrderStatus,
        by_value=True,
        required=True,
        validate=validate.OneOf(
            [
                OrderStatus.PREPARING,
                OrderStatus.DISPATCHED,
                OrderStatus.READY_FOR_COLLECTION,
            ],
            error="Must be one of: preparing, dispatched, ready for collection",
        ),
    )
    note = fields.Str(
        allow_none=True, validate=validate.Length(max=255), load_default=None
    )


class AdminPaymentSchema(Schema):
    reference = fields.Str()
    amount = fields.Int()
    status = fields.Enum(PaymentStatus, by_value=True)
    paid_at = fields.AwareDateTime(default_timezone=timezone.utc, allow_none=True)


class AdminRefundSchema(Schema):
    amount = fields.Int()
    reason = fields.Enum(RefundReason, by_value=True)
    processed_at = fields.AwareDateTime(default_timezone=timezone.utc)
    # True when the system refunded it (failed campaign); False when a person did
    automatic = fields.Method("get_automatic")

    def get_automatic(self, refund):
        return refund.processed_by is None


class AdminOrderSchema(Schema):
    id = fields.Int(dump_only=True)
    order_no = fields.Str(dump_only=True)
    status = fields.Enum(OrderStatus, by_value=True)
    quantity = fields.Int()
    total_amount = fields.Int(dump_only=True)
    fulfilment = fields.Enum(FulfilmentType, by_value=True)
    location = fields.Nested(LocationSchema, only=("id", "name", "collection_point"))
    delivery_address = fields.Str(allow_none=True)
    consumer = fields.Nested(UserSchema, only=("id", "full_name", "phone"))
    created_at = fields.DateTime()
    next_statuses = fields.List(
        fields.Enum(
            OrderStatus,
            by_value=True,
        )
    )
    payment = fields.Nested(AdminPaymentSchema, allow_none=True)
    refund = fields.Nested(AdminRefundSchema, allow_none=True)


class BatchStatusResultSchema(Schema):
    updated = fields.Int()
    skipped = fields.Int()
    campaign_status = fields.Enum(CampaignStatus, by_value=True)
