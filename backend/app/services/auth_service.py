from ..extensions import db
from ..models import User, SellerProfile
from ..errors import ConflictError, InvalidCredentials
from flask_jwt_extended import create_access_token
from ..models.enums import UserRole


class AuthService:
    def register_consumer(self, data):
        if db.session.scalar(db.select(User).filter_by(email=data["email"])):
            raise ConflictError("An account with this email exists")

        consumer = User(
            full_name=data["full_name"],
            phone=data["phone"],
            email=data["email"],
            role=UserRole.CONSUMER,
        )

        consumer.set_password(data["password"])
        db.session.add(consumer)
        db.session.commit()

        return self._auth_response(consumer)

    def register_wholesaler(self, data):
        if db.session.scalar(db.select(User).filter_by(email=data["email"])):
            raise ConflictError("An account with this email exists")

        seller = User(
            full_name=data["full_name"],
            phone=data["phone"],
            email=data["email"],
            role=UserRole.SELLER,
        )

        seller_profile = SellerProfile(
            user=seller,
            business_name=data["business_name"],
            registration_number=data["registration_number"],
            business_address=data["business_address"],
        )

        seller.set_password(data["password"])
        db.session.add_all([seller, seller_profile])
        db.session.commit()

        return self._auth_response(seller)

    def login(self, email, password):
        user = db.session.scalar(db.select(User).filter_by(email=email))

        if user is None or not user.check_password(password):
            raise InvalidCredentials("Wrong email or password")

        return self._auth_response(user)

    def _auth_response(self, user):
        token = create_access_token(
            identity=str(user.id), additional_claims={"role": user.role.value}
        )

        return {"user": user, "access_token": token, "token_type": "Bearer"}
