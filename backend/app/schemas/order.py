from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from ..models.enums import FulfilmentType, PaymentStatus, OrderStatus, RefundReason
from .location import LocationSchema
from .campaigns import CampaignSummarySchema


class OrderCreateSchema(Schema):
    campaign_id = fields.Int(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    fulfilment = fields.Enum(FulfilmentType, by_value=True, required=True)
    delivery_address = fields.Str()
    phone = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Regexp(
            r"^\+?[0-9]{9,15}$", error="Not a valid phone number."
        ),
    )
    location_id = fields.Int(required=True)

    @validates_schema
    def address_needed_for_delivery(self, data, **kwargs):
        if data.get("fulfilment") == FulfilmentType.DELIVERY and not data.get(
            "delivery_address"
        ):
            raise ValidationError(
                "Required when fulfilment is delivery.",
                field_name="delivery_address",
            )


class PaymentSchema(Schema):
    reference = fields.Str(dump_only=True, required=True)
    status = fields.Enum(PaymentStatus, by_value=True, required=True)
    amount = fields.Int(required=True)
    paid_at = fields.DateTime(required=True, dump_only=True)


class OrderStatusHistorySchema(Schema):
    status = fields.Enum(OrderStatus, by_value=True)
    note = fields.Str()
    created_at = fields.DateTime(dump_only=True)


class RefundSchema(Schema):
    amount = fields.Int()
    reason = fields.Enum(RefundReason, by_value=True)
    automatic = fields.Method("get_automatic", dump_only=True)
    processed_at = fields.DateTime()

    def get_automatic(self, refund):
        return refund.processed_by is None


class OrderSummarySchema(Schema):
    id = fields.Int(dump_only=True)
    order_no = fields.Str(dump_only=True)
    status = fields.Enum(OrderStatus, by_value=True)
    quantity = fields.Int()
    total_amount = fields.Int(dump_only=True)
    fulfilment = fields.Enum(FulfilmentType, by_value=True)
    delivery_address = fields.Str()
    created_at = fields.DateTime()
    cancellation_cutoff = fields.DateTime()
    can_cancel = fields.Bool(dump_only=True)
    location = fields.Nested(LocationSchema)
    campaign = fields.Nested(CampaignSummarySchema)
    refund = fields.Nested(RefundSchema)


class OrderDetailsSchema(OrderSummarySchema):
    unit_price = fields.Int()
    platform_charge = fields.Int()
    logistics_charge = fields.Int()
    payment = fields.Nested(PaymentSchema)
    history = fields.List(fields.Nested(OrderStatusHistorySchema))
