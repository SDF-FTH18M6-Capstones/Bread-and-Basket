from marshmallow import Schema, fields, validate
from ..models.enums import OrderStatus, FulfilmentType, CampaignStatus
from .location import LocationSchema
from .auth import UserSchema


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


class BatchStatusResultSchema(Schema):
    updated = fields.Int()
    skipped = fields.Int()
    campaign_status = fields.Enum(CampaignStatus, by_value=True)
