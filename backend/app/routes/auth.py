from flask.views import MethodView
from flask_smorest import Blueprint
from ..schemas.auth import (
    ConsumerRegisterSchema,
    WholesalerRegisterSchema,
    AuthResponseSchema,
    UserLoginSchema,
    UserSchema,
)
from ..services.auth_service import AuthService
from flask_jwt_extended import jwt_required, current_user
from ..auth.decorators import role_required

blp = Blueprint("auth", __name__, url_prefix="/api", description="Accounts")


@blp.route("/consumers")
class RegisterConsumer(MethodView):

    @blp.arguments(ConsumerRegisterSchema)
    @blp.response(201, AuthResponseSchema)
    def post(self, data):
        return AuthService().register_consumer(data)


@blp.route("/wholesalers")
class RegisterSeller(MethodView):

    @blp.arguments(WholesalerRegisterSchema)
    @blp.response(201, AuthResponseSchema)
    def post(self, data):
        return AuthService().register_wholesaler(data)


@blp.route("/login")
class LoginUser(MethodView):
    @blp.arguments(UserLoginSchema)
    @blp.response(200, AuthResponseSchema)
    def post(self, data):
        return AuthService().login(data["email"], data["password"])


@blp.route("/me")
class Me(MethodView):

    @jwt_required()
    @blp.response(200, UserSchema)
    @blp.doc(security=[{"bearerAuth": []}])
    def get(self):
        return current_user
