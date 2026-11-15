from marshmallow import Schema, fields, validate
from ..models.enums import CampaignStatus, ProductSource, UserRole
from flask_jwt_extended import get_current_user


class CampaignQuerySchema(Schema):
    category = fields.Str(
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
        )
    )
    q = fields.Str(
        validate=validate.Length(min=1, max=60),
    )
    filter = fields.Str(validate=validate.OneOf(["ending_soon", "almost_unlocked"]))


class ProductSummarySchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    unit = fields.Str()
    category = fields.Str()
    image_url = fields.Str()
    retail_price = fields.Int()


class ProductDetailSchema(ProductSummarySchema):
    description = fields.Str()
    source = fields.Enum(ProductSource, by_value=True)
    seller_name = fields.Method("get_seller_name")

    def get_seller_name(self, product):
        return (
            product.seller_profile.business_name
            if product.seller_profile
            else "Bread & Basket"
        )


class CampaignSummarySchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str()
    status = fields.Enum(CampaignStatus, by_value=True)
    campaign_price = fields.Int()
    min_quantity = fields.Int()
    max_quantity = fields.Int()
    deadline = fields.DateTime()
    ordered_quantity = fields.Int(dump_only=True)
    households = fields.Int(dump_only=True)
    min_reached = fields.Bool(dump_only=True)
    sold_out = fields.Bool(dump_only=True)
    savings_per_unit = fields.Int(dump_only=True)
    product = fields.Nested(
        ProductSummarySchema,
    )


class CampaignDetailSchema(CampaignSummarySchema):
    platform_charge = fields.Int()
    min_order_quantity = fields.Int()
    max_per_user = fields.Int()
    cancellation_cutoff = fields.DateTime(dump_only=True)
    remaining_quantity = fields.Int(dump_only=True)
    can_join = fields.Bool(dump_only=True)
    my_quantity = fields.Method("get_my_quantity", dump_only=True)
    max_orderable = fields.Method("get_max_orderable", dump_only=True)
    product = fields.Nested(
        ProductDetailSchema,
    )

    def _shopper(self):
        user = get_current_user()
        return user if user is not None and user.role == UserRole.CONSUMER else None

    def get_my_quantity(self, obj):
        user = self._shopper()
        return obj.quantity_held_by(user) if user else None

    def get_max_orderable(self, obj):
        user = self._shopper()
        return obj.max_orderable_for(user) if user else None
