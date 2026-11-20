from ..extensions import db
from ..errors import NotFound, ConflictError
from sqlalchemy import select, func
from ..models.location import Location


class AdminLocationService:
    def _get(self, location_id):
        location = db.session.get(Location, location_id)

        if location is None:
            raise NotFound("Location not found")

        return location

    def _check_name_free(self, name, exclude_id=None):
        stmt = select(Location).where(func.lower(Location.name) == func.lower(name))

        if exclude_id is not None:
            stmt = stmt.where(Location.id != exclude_id)

        existing_location = db.session.scalar(stmt)

        if existing_location:
            raise ConflictError("Location already exists", code="LOCATION_EXISTS")

    def list_all(self):
        locations = db.session.scalars(select(Location).order_by(Location.id)).all()

        return locations

    def create(self, data):

        self._check_name_free(data["name"])

        location = Location(
            name=data["name"],
            delivery_fee=data["delivery_fee"],
            collection_point=data["collection_point"],
            is_active=data["is_active"],
        )

        db.session.add(location)
        db.session.commit()

        return location

    def update(self, location_id, data):
        location = self._get(location_id)

        if "name" in data:
            self._check_name_free(data["name"], exclude_id=location_id)

        for key, value in data.items():
            setattr(location, key, value)

        db.session.commit()

        return location
