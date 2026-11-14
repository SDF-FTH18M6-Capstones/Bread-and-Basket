from marshmallow import Schema, fields, validate
from ..models.enums import ApprovalStatus, UserRole


class ConsumerRegisterSchema(Schema):
    full_name = fields.Str(required=True)
    phone = fields.Str(required=True)
    email = fields.Email(required=True)
    password = fields.Str(
        required=True, load_only=True, validate=validate.Length(min=8)
    )


class WholesalerRegisterSchema(Schema):
    full_name = fields.Str(required=True)
    phone = fields.Str(required=True)
    email = fields.Email(required=True)
    password = fields.Str(
        required=True, load_only=True, validate=validate.Length(min=8)
    )
    business_name = fields.Str(required=True)
    registration_number = fields.Str(required=True)
    business_address = fields.Str(required=True)


class UserLoginSchema(Schema):
    email = fields.Str(required=True)
    password = fields.Str(
        required=True,
        load_only=True,
    )


class SellerSummarySchema(Schema):
    business_name = fields.Str()
    business_address = fields.Str()
    verification_status = fields.Enum(ApprovalStatus, by_value=True)
    rejection_reason = fields.Str(allow_none=True)


class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    full_name = fields.Str()
    phone = fields.Str(allow_none=True)
    email = fields.Email()
    role = fields.Enum(UserRole, by_value=True)
    seller = fields.Nested(
        SellerSummarySchema, attribute="seller_profile", allow_none=True
    )


class AuthResponseSchema(Schema):
    user = fields.Nested(UserSchema, required=True)
    access_token = fields.Str(required=True)
    token_type = fields.Str(required=True)
