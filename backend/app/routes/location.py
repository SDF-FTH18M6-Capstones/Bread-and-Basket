from flask.views import MethodView
from ..schemas.location import LocationSchema
from flask_smorest import Blueprint
from ..services.location import LocationService

blp = Blueprint("locations", __name__, url_prefix="/api", description="Locations")


@blp.route("/locations")
class Locations(MethodView):
    @blp.response(200, LocationSchema(many=True))
    def get(self):
        return LocationService().get_locations()
