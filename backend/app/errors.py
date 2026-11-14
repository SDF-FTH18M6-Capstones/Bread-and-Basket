class AppError(Exception):
    # defaults
    status_code = 400
    code = "BAD REQUEST"

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class InvalidCredentials(AppError):
    status_code = 401
    code = "INVALID_CREDENTIALS"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


# defaults; each subclass overrides
class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
