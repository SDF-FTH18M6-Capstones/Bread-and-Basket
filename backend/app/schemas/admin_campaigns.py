from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from ..models.enums import CampaignStatus
from .campaigns import CampaignSummarySchema
from datetime import timezone, timedelta


class AdminCampaignQuerySchema(Schema):
    status = fields.Enum(CampaignStatus, by_value=True)


class AdminCampaignSchema(CampaignSummarySchema):
    platform_charge = fields.Int()
    min_order_quantity = fields.Int()
    max_per_user = fields.Int()
    cancellation_cutoff = fields.DateTime()
    closed_at = fields.DateTime()
    created_at = fields.DateTime()


class CampaignCreateSchema(Schema):
    product_id = fields.Int(required=True, validate=validate.Range(min=1))
    title = fields.Str(required=True, validate=validate.Length(min=3, max=150))
    platform_charge = fields.Int(load_default=10)
    max_quantity = fields.Int(required=True, validate=validate.Range(min=1))
    min_order_quantity = fields.Int(load_default=1, validate=validate.Range(min=1))
    min_quantity = fields.Int(required=True, validate=validate.Range(min=1))
    max_per_user = fields.Int(
        allow_none=True, validate=validate.Range(min=1), load_default=None
    )
    deadline = fields.AwareDateTime(required=True, default_timezone=timezone.utc)
    cancellation_cutoff = fields.AwareDateTime(default_timezone=timezone.utc)


class CampaignUpdateSchema(CampaignCreateSchema):
    @validates_schema
    def not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("Send at least one field to change")


class CampaignCloseResultSchema(Schema):
    campaign = fields.Nested(AdminCampaignSchema)
    outcome = fields.Str()
    orders_confirmed = fields.Int()
    orders_refunded = fields.Int()
