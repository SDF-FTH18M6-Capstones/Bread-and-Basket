from flask_smorest import Blueprint
from flask.views import MethodView
from ..auth.decorators import role_required
from ..schemas.order import OrderCreateSchema, OrderDetailsSchema
from ..services.order_service import OrderService
from flask_jwt_extended import current_user
from ..models.enums import UserRole

blp = Blueprint("Orders", __name__, url_prefix="/api", description="Orders")


@blp.route("/orders")
class Orders(MethodView):
    @role_required(UserRole.CONSUMER)
    @blp.arguments(OrderCreateSchema)
    @blp.response(201, OrderDetailsSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, data):
        return OrderService().place_order(current_user, data)
