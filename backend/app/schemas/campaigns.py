from marshmallow import Schema, fields, validate
from ..models.enums import CampaignStatus, ProductSource
from datetime import datetime


class CampaignQuerySchema(Schema):
    category = fields.Str(
        validate=validate.OneOf(
            [
                "vegetables"
                "fruits"
                "rice_grains"
                "flour"
                "cooking_oil"
                "sugar"
                "pulses"
                "dairy_eggs"
            ]
        )
    )
    q = fields.Str(
        allow_none=True,
    )
    filter = fields.Str(validate=validate.OneOf(["ending_soon" "almost_unlocked"]))


class LocationSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    delivery_fee = fields.Int(required=True)
    collection_point = fields.Str(required=True)


class ProductSummarySchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    unit = fields.Str(required=True)
    category = fields.Str(required=True)
    image_url = fields.Str()
    retail_price = fields.Int(required=True)


class ProductDetailSchema(ProductSummarySchema):
    description = fields.Str()
    source = fields.Enum(ProductSource, required=True)
    seller_name = fields.Str(required=True)


class CampaignSummarySchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    status = fields.Enum(CampaignStatus, by_value=True)
    campaign_price = fields.Int(required=True)
    min_quantity = fields.Int(required=True)
    max_quantity = fields.Int(required=True)
    deadline = fields.DateTime(
        required=True,
    )
    ordered_quantity = fields.Int(dump_only=True)
    households = fields.Int(dump_only=True)
    min_reached = fields.Bool(dump_only=True)
    sold_out = fields.Bool(dump_only=True)
    savings_per_unit = fields.Int(dump_only=True)
    product = fields.Nested(ProductSummarySchema, required=True)


class CampaignDetailSchema(CampaignSummarySchema):
    platform_charge = fields.Int(required=True)
    min_order_quantity = fields.Int(required=True)
    max_per_user = fields.Int()
    cancellation_cutoff = fields.Str(dump_only=True)
    remaining_quantity = fields.Int(dump_only=True)
    can_join = fields.Bool(dump_only=True)
    my_quantity = fields.Int(dump_only=True)
    max_orderable = fields.Int(dump_default=True)
    product = fields.Nested(ProductDetailSchema, required=True)
