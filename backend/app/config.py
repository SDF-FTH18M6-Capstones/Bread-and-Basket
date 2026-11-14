import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)  # default to 12 hours

    # For flask smorest to read and add in docs
    API_TITLE = "Bread And Basket API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/"
    OPENAPI_SWAGGER_UI_PATH = "/docs"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"

    REQUIRED = ["SQLALCHEMY_DATABASE_URI"]

    @classmethod
    def validate(cls):
        missing = [name for name in cls.REQUIRED if not getattr(cls, name, None)]
        if missing:
            raise RuntimeError(
                f"{cls.__name__} is missing: {', '.join(missing)}. Check your .env"
            )


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL")


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("PRODUCTION_DATABASE_URL")
    REQUIRED = [
        "SQLALCHEMY_DATABASE_URI",
        "JWT_SECRET_KEY",
    ]


CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
