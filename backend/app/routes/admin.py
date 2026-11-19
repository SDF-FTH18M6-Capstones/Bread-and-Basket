from flask_smorest import Blueprint
from flask.views import MethodView
from ..auth.decorators import role_required
from ..schemas.admin import AdminSellerSchema, RejectSchema, ApprovalStatusQuerySchema
from ..schemas.admin_campaigns import (
    AdminCampaignSchema,
    AdminCampaignQuerySchema,
    CampaignCreateSchema,
    CampaignUpdateSchema,
    CampaignCloseResultSchema,
)
from ..schemas.product import AdminProductSchema
from ..services.approval_service import ApprovalService
from ..services.admin_campaign_service import AdminCampaignService
from flask_jwt_extended import current_user
from ..models.enums import UserRole

blp = Blueprint("Admin", __name__, url_prefix="/api", description="Admin")


@blp.route("/admin/sellers")
class SellerList(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.arguments(ApprovalStatusQuerySchema, location="query")
    @blp.response(200, AdminSellerSchema(many=True))
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self, args):
        return ApprovalService().list_sellers(args)


@blp.route("/admin/sellers/<int:seller_id>/approve")
class ApprovePendingSeller(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.response(200, AdminSellerSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, seller_id):
        return ApprovalService().approve_seller(seller_id=seller_id, admin=current_user)


@blp.route("/admin/sellers/<int:seller_id>/reject")
class RejectPendingSellers(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.arguments(RejectSchema)
    @blp.response(200, AdminSellerSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, data, seller_id):
        return ApprovalService().reject_seller(
            data=data, seller_id=seller_id, admin=current_user
        )


@blp.route("/admin/products")
class ProductList(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.arguments(ApprovalStatusQuerySchema, location="query")
    @blp.response(200, AdminProductSchema(many=True))
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self, args):
        return ApprovalService().list_products(args)


@blp.route("/admin/products/<int:product_id>/approve")
class ApprovePendingProduct(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.response(200, AdminProductSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, product_id):
        return ApprovalService().approve_product(
            product_id=product_id, admin=current_user
        )


@blp.route("/admin/products/<int:product_id>/reject")
class RejectPendingProduct(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.arguments(RejectSchema)
    @blp.response(200, AdminProductSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, data, product_id):
        return ApprovalService().reject_product(
            data=data, product_id=product_id, admin=current_user
        )


@blp.route("/admin/campaigns")
class AdminCampaign(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.arguments(AdminCampaignQuerySchema, location="query")
    @blp.response(200, AdminCampaignSchema(many=True))
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self, args):
        return AdminCampaignService().list_all(args)

    @role_required(UserRole.ADMIN)
    @blp.arguments(CampaignCreateSchema)
    @blp.response(201, AdminCampaignSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, data):
        return AdminCampaignService().create(data=data, admin=current_user)


@blp.route("/admin/campaigns/<int:campaign_id>")
class CampaignUpdate(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.arguments(CampaignUpdateSchema(partial=True, exclude=("product_id",)))
    @blp.response(200, AdminCampaignSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def patch(self, data, campaign_id):
        return AdminCampaignService().update(campaign_id=campaign_id, data=data)


@blp.route("/admin/campaigns/<int:campaign_id>/activate")
class CampaignActivate(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.response(200, AdminCampaignSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, campaign_id):
        return AdminCampaignService().activate(campaign_id=campaign_id)


@blp.route("/admin/campaigns/<int:campaign_id>/cancel")
class CampaignCancel(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.response(200, AdminCampaignSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, campaign_id):
        return AdminCampaignService().cancel(campaign_id=campaign_id)


@blp.route("/admin/campaigns/<int:campaign_id>/close")
class CampaignClose(MethodView):
    @role_required(UserRole.ADMIN)
    @blp.response(200, CampaignCloseResultSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def post(self, campaign_id):
        return AdminCampaignService().close(campaign_id=campaign_id, admin=current_user)
