import os
from flask import Flask
from .config import CONFIGS
from .extensions import db, migrate, jwt, api, bcrypt
from flask import jsonify
from .errors import AppError
from .routes.auth import blp as auth_blp
from .routes.campaign import blp as campaign_blp
from .routes.location import blp as location_blp


def create_app(config_class=None):
    if config_class is None:
        config_class = CONFIGS[os.environ.get("APP_ENV", "development")]
    config_class.validate()

    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    api.init_app(app)
    bcrypt.init_app(app)

    @app.errorhandler(AppError)
    def handle_app_error(e):
        return jsonify(error=e.message, code=e.code), e.status_code

    @app.errorhandler(422)
    def handle_validation_error(e):
        messages = e.data.get("messages", {}) if hasattr(e, "data") else {}
        location_errors = next(iter(messages.values()), {})
        field, errors = next(
            iter(location_errors.items()), ("request", ["Invalid input."])
        )
        return (
            jsonify(
                error=f"{field}: {errors[0]}",
                code="VALIDATION_FAILED",
            ),
            422,
        )

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify(error="Please log in.", code="TOKEN_MISSING"), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return (
            jsonify(
                error="Your session is invalid. Please log in again",
                code="TOKEN_INVALID",
            ),
            401,
        )

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return (
            jsonify(
                error="Your session has expired. Please log in again",
                code="TOKEN_EXPIRED",
            ),
            401,
        )

    @jwt.user_lookup_loader
    def load_user(_jwt_header, jwt_payload):
        from .models import User

        return db.session.get(User, int(jwt_payload["sub"]))

    from . import models
    from .health import blp as health_blp

    api.register_blueprint(health_blp)
    api.register_blueprint(auth_blp)
    api.register_blueprint(campaign_blp)
    api.register_blueprint(location_blp)

    return app
