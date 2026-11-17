from flask_smorest import Blueprint
from flask.views import MethodView
from ..auth.decorators import role_required
from ..schemas.order import OrderCreateSchema, OrderDetailsSchema, OrderSummarySchema
from ..services.order_service import OrderService
from flask_jwt_extended import current_user, get_current_user
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


@blp.route("/orders")
class OrdersSummary(MethodView):
    @role_required(UserRole.CONSUMER)
    @blp.response(200, OrderSummarySchema(many=True))
    @blp.doc(security=[{"bearerAuth": []}])
    def get(
        self,
    ):
        return OrderService().list_my_orders(current_user)


@blp.route("/orders/<int:order_id>")
class OrderDetails(MethodView):
    @role_required(UserRole.CONSUMER)
    @blp.response(200, OrderDetailsSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self, order_id):
        return OrderService().get_viewer_order(order_id, get_current_user())
