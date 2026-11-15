from ..extensions import db
from ..models.location import Location


class LocationService:
    def get_locations(self):
        return db.session.scalars(db.select(Location).where(Location.is_active)).all()
