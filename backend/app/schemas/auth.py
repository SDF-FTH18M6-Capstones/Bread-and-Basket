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
        required=True, load_only=True, validate=validate.Length(min=8)
    )


class SellerProfileSchema(Schema):
    id = fields.Int(required=True, dump_only=True)
    user_id = fields.Int(required=True, dump_only=True)
    business_name = fields.Str(required=True)
    registration_number = fields.Str(required=True)
    business_address = fields.Str(required=True)
    verification_status = fields.Enum(
        ApprovalStatus, validate=validate.OneOf(ApprovalStatus), by_value=True
    )
    rejection_reason = fields.Str()
    reviewed_by = fields.Int()
    reviewed_at = fields.Str()
    created_at = fields.Str()


class UserSchema(Schema):
    id = fields.Int(required=True, dump_only=True)
    full_name = fields.Str(required=True)
    phone = fields.Str(required=True)
    email = fields.Email(required=True)
    password_hash = fields.Str(required=True, load_only=True)
    role = fields.Enum(UserRole, validate=validate.OneOf(UserRole), by_value=True)
    is_active = fields.Bool(required=True)
    created_at = fields.DateTime(required=True, dump_only=True)
    seller_profile = fields.Nested(SellerProfileSchema)


class AuthResponseSchema(Schema):
    user = fields.Nested(UserSchema, required=True)
    access_token = fields.Str(required=True)
    token_type = fields.Str(required=True)
