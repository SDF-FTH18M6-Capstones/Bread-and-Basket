from flask.views import MethodView
from flask_smorest import Blueprint
from sqlalchemy import text
from .extensions import db

blp = Blueprint(
    "health", __name__, url_prefix="/api/health", description="Is the server alive?"
)


@blp.route("/")
class Health(MethodView):
    def get(self):
        db.session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok"}
