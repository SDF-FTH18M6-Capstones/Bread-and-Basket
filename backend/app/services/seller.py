from ..extensions import db
from ..models.campaigns import Campaign
from ..models.products import Product
from ..errors import NotFound, ForbiddenError, BusinessRuleError
from ..models.enums import CampaignStatus, FulfilmentType, ApprovalStatus, ProductSource
from sqlalchemy import select
from datetime import datetime, timezone


class SellerService:
    def _profile(self, user):
        profile = user.seller_profile
        return profile

    def _get_my_campaign(self, user, campaign_id):
        campaign = db.session.scalar(
            select(Campaign)
            .join(Campaign.product)
            .where(
                Campaign.id == campaign_id,
                Campaign.status != CampaignStatus.DRAFT,
                Product.seller_id == self._profile(user).id,
            )
        )

        if campaign is None:
            raise NotFound("Campaign not found")

        return campaign

    def _group(self, orders):
        total_units = 0
        order_count = 0

        location_map = {}
        for order in orders:
            total_units += order.quantity
            order_count += 1

            if order.location_id not in location_map:
                new_location = {
                    "location_id": order.location_id,
                    "location_name": order.location.name,
                    "units": order.quantity,
                    "order_count": 1,
                }

                location_map[order.location_id] = new_location
            else:
                existing_location = location_map[order.location_id]
                existing_location["units"] += order.quantity
                existing_location["order_count"] += 1

        sorted_locations = sorted(
            location_map.values(), key=lambda x: x["units"], reverse=True
        )
        return {
            "total_units": total_units,
            "order_count": order_count,
            "locations": sorted_locations,
        }

    def list_products(self, user):
        sellers_profile = self._profile(user)

        if sellers_profile is None:
            raise NotFound("User profile not found")

        sellers_profile_id = sellers_profile.id

        products = db.session.scalars(
            select(Product)
            .where(Product.seller_id == sellers_profile_id)
            .order_by(Product.created_at.desc())
        ).all()

        return products

    def create_product(self, user, data):
        profile = self._profile(user)
        if profile.verification_status != ApprovalStatus.APPROVED:
            raise ForbiddenError("Seller is not approved", code="SELLER_NOT_APPROVED")

        retail_price = data["retail_price"]
        wholesale_price = data["wholesale_price"]

        if retail_price <= wholesale_price:
            raise BusinessRuleError(
                "Retail should be above wholesale", code="RETAIL_NOT_ABOVE_WHOLESALE"
            )

        product = Product(
            name=data["name"],
            description=data["description"],
            seller_id=profile.id,
            source=ProductSource.SELLER,
            category=data["category"],
            unit=data["unit"],
            image_url=data["image_url"],
            wholesale_price=wholesale_price,
            retail_price=retail_price,
            stock_quantity=data["stock_quantity"],
        )

        db.session.add(product)
        db.session.commit()

        return product

    def update_product(self, product_id, data, user):
        product = db.session.get(Product, product_id)

        if product is None or product.seller_id != self._profile(user).id:
            raise NotFound("Product not found")

        if product.approval_status == ApprovalStatus.APPROVED:
            raise BusinessRuleError(
                "Approved products can't be edited", code="PRODUCT_NOT_EDITABLE"
            )

        for key, value in data.items():
            setattr(product, key, value)

        if product.retail_price <= product.wholesale_price:
            raise BusinessRuleError(
                "Retail should be above wholesale", code="RETAIL_NOT_ABOVE_WHOLESALE"
            )

        product.approval_status = ApprovalStatus.PENDING
        product.rejection_reason = None
        db.session.commit()

        return product

    def list_campaigns(self, user):
        profile = self._profile(user)

        campaigns = db.session.scalars(
            select(Campaign)
            .join(Campaign.product)
            .where(
                Product.seller_id == profile.id, Campaign.status != CampaignStatus.DRAFT
            )
            .order_by(Campaign.deadline.asc())
        ).all()

        return campaigns

    def campaign_orders(self, user, campaign_id):
        campaign = self._get_my_campaign(user, campaign_id)
        live_orders = campaign.active_orders

        delivery_orders = [
            o for o in live_orders if o.fulfilment == FulfilmentType.DELIVERY
        ]

        collection_orders = [
            o for o in live_orders if o.fulfilment == FulfilmentType.COLLECTION
        ]

        delivery = self._group(delivery_orders)
        collection = self._group(collection_orders)

        return {"campaign": campaign, "delivery": delivery, "collection": collection}

    def confirm_stock(self, user, campaign_id):
        campaign = self._get_my_campaign(user, campaign_id)

        if campaign.status not in (
            CampaignStatus.SUCCESSFUL,
            CampaignStatus.FULFILLING,
        ):
            raise BusinessRuleError(
                "Campaign is not successful nor fulfilling", code="CAMPAIGN_NOT_READY"
            )

        if campaign.stock_confirmed_at:
            raise BusinessRuleError(
                "Stock already confirmed", code="STOCK_ALREADY_CONFIRMED"
            )

        campaign.stock_confirmed_at = datetime.now(timezone.utc)

        db.session.commit()

        return campaign
