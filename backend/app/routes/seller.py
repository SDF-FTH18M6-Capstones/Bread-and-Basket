from flask_smorest import Blueprint
from flask.views import MethodView
from ..auth.decorators import role_required
from ..schemas.seller import (
    SellerCampaignOrdersSchema,
    SellerCampaignSchema,
    ProductCreateSchema,
    ProductUpdateSchema,
)
from ..schemas.product import SellerProductSchema
from ..services.seller import SellerService
from flask_jwt_extended import current_user
from ..models.enums import UserRole

blp = Blueprint("Seller", __name__, url_prefix="/api", description="Seller")


@blp.route("/seller/products")
class SellerProducts(MethodView):
    @role_required(UserRole.SELLER)
    @blp.response(200, SellerProductSchema(many=True))
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self):
        return SellerService().list_products(current_user)

    @role_required(UserRole.SELLER)
    @blp.arguments(ProductCreateSchema)
    @blp.response(201, SellerProductSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, data):
        return SellerService().create_product(data=data, user=current_user)


@blp.route("/seller/products/<int:product_id>")
class UpdateSellerProduct(MethodView):
    @role_required(UserRole.SELLER)
    @blp.arguments(ProductUpdateSchema(partial=True))
    @blp.response(200, SellerProductSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def patch(self, data, product_id):
        return SellerService().update_product(
            data=data, product_id=product_id, user=current_user
        )


@blp.route("/seller/campaigns")
class SellerCampaigns(MethodView):
    @role_required(UserRole.SELLER)
    @blp.response(200, SellerCampaignSchema(many=True))
    @blp.doc(security=[{"bearerAuth": []}])
    def get(
        self,
    ):
        return SellerService().list_campaigns(user=current_user)


@blp.route("/seller/campaigns/<int:campaign_id>/orders")
class SellerCampaignOrders(MethodView):
    @role_required(UserRole.SELLER)
    @blp.response(200, SellerCampaignOrdersSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self, campaign_id):
        return SellerService().campaign_orders(
            user=current_user, campaign_id=campaign_id
        )


@blp.route("/seller/campaigns/<int:campaign_id>/confirm-stock")
class SellerCampaign(MethodView):
    @role_required(UserRole.SELLER)
    @blp.response(200, SellerCampaignSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, campaign_id):
        return SellerService().confirm_stock(user=current_user, campaign_id=campaign_id)
