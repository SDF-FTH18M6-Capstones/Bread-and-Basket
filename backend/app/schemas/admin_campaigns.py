from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from ..models.enums import CampaignStatus
from .campaigns import CampaignSummarySchema
from datetime import timezone


class AdminCampaignQuerySchema(Schema):
    status = fields.Enum(CampaignStatus, by_value=True)


class AdminCampaignSchema(CampaignSummarySchema):
    platform_charge = fields.Int()
    min_order_quantity = fields.Int()
    max_per_user = fields.Int()
    cancellation_cutoff = fields.DateTime()
    closed_at = fields.DateTime()
    created_at = fields.DateTime()
    stock_confirmed_at = fields.DateTime()
    awaiting_stock = fields.Method("get_awaiting_stock")

    def get_awaiting_stock(self, campaign):
        return (
            campaign.status in (CampaignStatus.SUCCESSFUL, CampaignStatus.FULFILLING)
            and campaign.product.seller_id is not None
            and campaign.stock_confirmed_at is None
        )


class CampaignCreateSchema(Schema):
    product_id = fields.Int(required=True, validate=validate.Range(min=1))
    title = fields.Str(required=True, validate=validate.Length(min=3, max=150))
    platform_charge = fields.Int(load_default=10, validate=validate.Range(min=0))
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
