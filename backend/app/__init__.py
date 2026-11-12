import os
from flask import Flask
from .config import CONFIGS
from .extensions import db, migrate, jwt, api


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

    from .health import blp as health_blp

    api.register_blueprint(health_blp)

    return app
