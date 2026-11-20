from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class LocationSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    delivery_fee = fields.Int()
    collection_point = fields.Str()


class AdminLocationSchema(LocationSchema):
    is_active = fields.Bool()


class LocationCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    delivery_fee = fields.Int(required=True, validate=validate.Range(min=0, max=150))
    collection_point = fields.Str(required=True, validate=validate.Length(min=3))
    is_active = fields.Bool(load_default=True)


class LocationUpdateSchema(LocationCreateSchema):
    @validates_schema
    def not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("Send at least one field to change")
