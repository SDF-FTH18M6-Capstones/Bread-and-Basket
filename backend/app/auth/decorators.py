from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from ..errors import ForbiddenError
from ..models.enums import UserRole


def role_required(*roles):
    allowed = {r.value if isinstance(r, UserRole) else r for r in roles}

    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            if get_jwt().get("role") not in allowed:
                raise ForbiddenError("You do not have permission to access this")

            return view(*args, **kwargs)

        return wrapper

    return decorator
