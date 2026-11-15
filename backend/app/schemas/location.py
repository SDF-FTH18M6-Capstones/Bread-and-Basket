from marshmallow import Schema, fields


class LocationSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    delivery_fee = fields.Int()
    collection_point = fields.Str()
