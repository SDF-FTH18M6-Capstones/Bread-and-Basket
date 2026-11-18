from marshmallow import Schema, fields, validate
from ..models.enums import ApprovalStatus, ProductSource


class SellerProductSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    unit = fields.Str()
    category = fields.Str()
    image_url = fields.Str()
    retail_price = fields.Int()
    description = fields.Str()
    wholesale_price = fields.Int()
    stock_quantity = fields.Int()
    approval_status = fields.Enum(ApprovalStatus, by_value=True)
    rejection_reason = fields.Str()
    created_at = fields.DateTime()


class ProductSellerSchema(Schema):
    id = fields.Int()
    business_name = fields.Str()
    verification_status = fields.Enum(ApprovalStatus, by_value=True)


class AdminProductSchema(SellerProductSchema):
    source = fields.Enum(ProductSource, by_value=True)
    seller = fields.Nested(
        ProductSellerSchema,
        attribute="seller_profile",
        allow_none=True,
    )
    reviewed_at = fields.DateTime()
