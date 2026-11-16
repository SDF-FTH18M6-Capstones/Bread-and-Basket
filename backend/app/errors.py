class AppError(Exception):
    # defaults
    status_code = 400
    code = "BAD_REQUEST"

    def __init__(self, message, code=None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


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


class NotFound(AppError):
    status_code = 404
    code = "NOT_FOUND"


class BusinessRuleError(AppError):
    status_code = 400
