from datetime import datetime, timezone

from sqlalchemy import select

from ..errors import BusinessRuleError, NotFound
from ..extensions import db
from ..models.enums import ApprovalStatus
from ..models.products import Product
from ..models.seller_profiles import SellerProfile


class ApprovalService:

    def _get_seller_profile(self, seller_id):
        profile = db.session.get(SellerProfile, seller_id)
        if profile is None:
            raise NotFound("Seller not found")
        return profile

    def _get_product(self, product_id):
        product = db.session.get(Product, product_id)
        if product is None:
            raise NotFound("Product not found")
        return product

    def _ensure_not_approved(self, current_status, label):
        if current_status == ApprovalStatus.APPROVED:
            raise BusinessRuleError(
                f"{label} is already approved", code="ALREADY_APPROVED"
            )

    def _ensure_seller_approved(self, product):
        seller_profile = product.seller_profile
        if (
            seller_profile is not None
            and product.seller_profile.verification_status != ApprovalStatus.APPROVED
        ):
            raise BusinessRuleError(
                "Seller must be approved before approving this product",
                code="SELLER_NOT_APPROVED",
            )

    def _stamp_review(self, target, admin, status, reason=None):
        target.reviewed_by = admin.id
        target.reviewed_at = datetime.now(timezone.utc)
        target.rejection_reason = reason if status == ApprovalStatus.REJECTED else None

    def list_sellers(self, args):
        stmt = select(SellerProfile)

        if "status" in args:
            stmt = stmt.where(SellerProfile.verification_status == args["status"])

        return db.session.scalars(stmt.order_by(SellerProfile.created_at.asc())).all()

    def approve_seller(self, seller_id, admin):
        profile = self._get_seller_profile(seller_id)

        self._ensure_not_approved(profile.verification_status, "Seller")

        profile.verification_status = ApprovalStatus.APPROVED
        self._stamp_review(profile, admin, ApprovalStatus.APPROVED)
        db.session.commit()

        return profile

    def reject_seller(self, seller_id, admin, data):
        profile = self._get_seller_profile(seller_id)
        reason = data["reason"]

        profile.verification_status = ApprovalStatus.REJECTED
        self._stamp_review(profile, admin, ApprovalStatus.REJECTED, reason)
        db.session.commit()
        return profile

    def list_products(self, args):
        stmt = select(Product)
        if "status" in args:
            stmt = stmt.where(Product.approval_status == args["status"])
        return db.session.scalars(stmt.order_by(Product.created_at.asc())).all()

    def approve_product(self, product_id, admin):
        product = self._get_product(product_id)
        self._ensure_not_approved(product.approval_status, "Product")
        self._ensure_seller_approved(product)

        product.approval_status = ApprovalStatus.APPROVED
        self._stamp_review(product, admin, ApprovalStatus.APPROVED)
        db.session.commit()
        return product

    def reject_product(self, product_id, admin, data):
        product = self._get_product(product_id)
        reason = data["reason"]

        product.approval_status = ApprovalStatus.REJECTED
        self._stamp_review(product, admin, ApprovalStatus.REJECTED, reason)
        db.session.commit()
        return product
