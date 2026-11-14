import os
from flask import Flask
from .config import CONFIGS
from .extensions import db, migrate, jwt, api, bycrypt
from flask import jsonify
from .errors import AppError


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
    bycrypt.init_app(app)

    @app.errorhandler(AppError)
    def handle_app_error(e):
        return jsonify(error=e.message, code=e.code), e.status_code

    @app.errorhandler(422)
    def handle_validation_error(e):
        message = (
            e.data.get("messages", {}).get("json", {}) if hasattr(e, "data") else {}
        )
        field, errors = next(iter(message.items()), ("request", ["Invalid input."]))

        return jsonify(error=f"{field}: {errors[0]}", code="VALIDATION_FAILED")

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

    from . import models
    from .health import blp as health_blp

    api.register_blueprint(health_blp)

    return app
