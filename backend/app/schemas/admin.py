from marshmallow import Schema, fields, validate
from ..models.enums import ApprovalStatus
from .auth import UserSchema


class RejectSchema(Schema):
    reason = fields.Str(required=True, validate=validate.Length(min=3, max=255))


class ApprovalStatusQuerySchema(
    Schema,
):
    status = fields.Enum(ApprovalStatus, by_value=True)


class AdminSellerSchema(Schema):
    id = fields.Int(dump_only=True)
    user = fields.Nested(UserSchema, only=("id", "full_name", "email", "phone"))
    business_name = fields.Str()
    registration_number = fields.Str()
    business_address = fields.Str()
    verification_status = fields.Enum(ApprovalStatus, by_value=True)
    rejection_reason = fields.Str()
    reviewed_at = fields.DateTime()
    created_at = fields.DateTime()
