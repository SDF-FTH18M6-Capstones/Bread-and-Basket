from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from .campaigns import CampaignSummarySchema


class ProductCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=150))
    description = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=2000)
    )
    category = fields.Str(
        required=True,
        validate=validate.OneOf(
            [
                "vegetables",
                "fruits",
                "rice_grains",
                "flour",
                "cooking_oil",
                "sugar",
                "pulses",
                "dairy_eggs",
            ]
        ),
    )
    unit = fields.Str(required=True, validate=validate.Length(max=40))
    image_url = fields.Url(
        relative=True, require_tld=False, load_default=None, allow_none=True
    )
    wholesale_price = fields.Int(required=True, validate=validate.Range(min=1))
    retail_price = fields.Int(required=True, validate=validate.Range(min=1))
    stock_quantity = fields.Int(required=True, validate=validate.Range(min=0))


class ProductUpdateSchema(ProductCreateSchema):
    @validates_schema
    def not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("Send at least one field to change")


class SellerCampaignSchema(CampaignSummarySchema):
    stock_confirmed_at = fields.DateTime(allow_none=True)


class LocationUnitsSchema(Schema):
    location_id = fields.Int()
    location_name = fields.Str()
    units = fields.Int()
    order_count = fields.Int()


class FulfilmentGroupSchema(Schema):
    total_units = fields.Int()
    order_count = fields.Int()
    locations = fields.List(fields.Nested(LocationUnitsSchema))


class SellerCampaignOrdersSchema(Schema):
    campaign = fields.Nested(SellerCampaignSchema)
    delivery = fields.Nested(FulfilmentGroupSchema)
    collection = fields.Nested(FulfilmentGroupSchema)
