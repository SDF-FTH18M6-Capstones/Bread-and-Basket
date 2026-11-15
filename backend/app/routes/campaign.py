from flask_smorest import Blueprint
from flask.views import MethodView
from ..schemas.campaigns import (
    CampaignQuerySchema,
    CampaignSummarySchema,
    CampaignDetailSchema,
)
from ..services.campaign_service import CampaignService
from flask_jwt_extended import jwt_required, get_current_user

blp = Blueprint("campaigns", __name__, url_prefix="/api", description="Campaigns")


@blp.route("/campaigns")
class Campaigns(MethodView):
    @blp.arguments(CampaignQuerySchema, location="query")
    @blp.response(200, CampaignSummarySchema(many=True))
    def get(self, args):
        return CampaignService().list_active(args)


@blp.route("/campaigns/<int:campaign_id>")
class CampaignsDetails(MethodView):
    @jwt_required(optional=True)
    @blp.response(200, CampaignDetailSchema)
    def get(self, campaign_id):
        return CampaignService().get_for_viewer(campaign_id, get_current_user())
