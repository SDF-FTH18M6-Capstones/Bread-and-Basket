from dotenv import load_dotenv

load_dotenv()

import random
import string
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select, text
from app import create_app
from app.extensions import db
from app.models import (
    User,
    SellerProfile,
    Location,
    Product,
    Campaign,
    Order,
    OrderStatusHistory,
    Payment,
    Refund,
)
from app.models.enums import (
    UserRole,
    ApprovalStatus,
    ProductSource,
    CampaignStatus,
    FulfilmentType,
    OrderStatus,
    PaymentStatus,
    RefundReason,
)

app = create_app()
now = datetime.now(timezone.utc)
PLATFORM_CHARGE = 10
LIVE_EXCLUDED = [OrderStatus.CANCELLED, OrderStatus.REFUNDED]

# Same references every run, so screenshots and the demo script stay stable
rng = random.Random(2026)


def mpesa_ref():
    return "Q" + "".join(rng.choices(string.ascii_uppercase + string.digits, k=9))


def order_total(quantity, unit_price, platform_charge, logistics_charge):
    return quantity * (unit_price + platform_charge) + logistics_charge


def make_user(full_name, email, role, phone):
    user = User(full_name=full_name, email=email, phone=phone, role=role)
    user.set_password("test12345")
    return user


def make_profile(
    user, business_name, reg_no, address, status, reviewer=None, days_ago=0
):
    return SellerProfile(
        user=user,
        business_name=business_name,
        registration_number=reg_no,
        business_address=address,
        verification_status=status,
        reviewed_by=reviewer.id if reviewer else None,
        reviewed_at=now - timedelta(days=days_ago) if reviewer else None,
    )


def make_product(
    name,
    category,
    unit,
    wholesale,
    retail,
    stock,
    description,
    reviewer,
    seller_profile=None,
    status=ApprovalStatus.APPROVED,
    reason=None,
):
    if seller_profile is not None:
        assert (
            seller_profile.verification_status == ApprovalStatus.APPROVED
        ), "an unapproved seller cannot list products"
    reviewed = status != ApprovalStatus.PENDING
    return Product(
        seller_id=seller_profile.id if seller_profile else None,
        source=ProductSource.SELLER if seller_profile else ProductSource.PLATFORM,
        name=name,
        description=description,
        category=category,
        unit=unit,
        wholesale_price=wholesale,
        retail_price=retail,
        stock_quantity=stock,
        approval_status=status,
        rejection_reason=reason,
        reviewed_by=reviewer.id if reviewed else None,
        reviewed_at=now - timedelta(days=5) if reviewed else None,
    )


def make_campaign(
    product,
    admin,
    title,
    price,
    minimum,
    maximum,
    min_order,
    per_user,
    deadline,
    cutoff,
    status,
    closed_at=None,
    stock_confirmed_at=None,
):
    return Campaign(
        product_id=product.id,
        created_by=admin.id,
        title=title,
        campaign_price=price,
        platform_charge=PLATFORM_CHARGE,
        min_quantity=minimum,
        max_quantity=maximum,
        min_order_quantity=min_order,
        max_per_user=per_user,
        deadline=deadline,
        cancellation_cutoff=cutoff,
        status=status,
        closed_at=closed_at,
        stock_confirmed_at=stock_confirmed_at,
    )


def place_order(
    order_no,
    campaign,
    consumer,
    location,
    quantity,
    fulfilment,
    placed_at,
    reference,
    address=None,
):

    assert campaign.status in (
        CampaignStatus.ACTIVE,
        CampaignStatus.FULFILLING,
    ), "orders can only exist on active or fulfilling campaigns"
    assert location.is_active is not False, "orders can't use an inactive location"
    assert (fulfilment == FulfilmentType.DELIVERY) == bool(
        address
    ), "delivery orders need an address; collection orders must not have one"

    logistics = location.delivery_fee if fulfilment == FulfilmentType.DELIVERY else 0
    total = order_total(
        quantity, campaign.campaign_price, campaign.platform_charge, logistics
    )

    order = Order(
        order_no=order_no,
        campaign_id=campaign.id,
        consumer_id=consumer.id,
        quantity=quantity,
        unit_price=campaign.campaign_price,  # snapshot: frozen at order time
        platform_charge=campaign.platform_charge,  # snapshot, per unit
        logistics_charge=logistics,  # snapshot, flat per order
        total_amount=total,
        fulfilment=fulfilment,
        location_id=location.id,
        delivery_address=address,
        status=OrderStatus.PAID,
        created_at=placed_at,
    )
    db.session.add(order)
    db.session.flush()  # order.id now exists

    paid_at = placed_at + timedelta(seconds=30)
    payment = Payment(
        order_id=order.id,
        amount=total,
        reference=reference,
        status=PaymentStatus.SUCCESSFUL,
        paid_at=paid_at,
    )
    first_step = OrderStatusHistory(
        order_id=order.id,
        status=OrderStatus.PAID,
        note="Payment received",
        created_at=paid_at,
    )
    db.session.add_all([payment, first_step])
    db.session.flush()
    return order, payment


def advance(order, steps, by):
    """Moves the order through (status, note, when) steps, one history row each."""
    for status, note, when in steps:
        order.status = status
        db.session.add(
            OrderStatusHistory(
                order_id=order.id,
                status=status,
                note=note,
                updated_by=by.id if by else None,
                created_at=when,
            )
        )


def live_stats(campaign) -> tuple[int, int]:
    """Units and households from orders that are not cancelled or refunded."""
    units, households = db.session.execute(
        select(
            func.sum(Order.quantity), func.count(func.distinct(Order.consumer_id))
        ).where(
            Order.campaign_id == campaign.id,
            Order.status.not_in(LIVE_EXCLUDED),
        )
    ).one()
    return units or 0, households


with app.app_context():
    if app.config.get("DEBUG") is not True:
        raise SystemExit("Refusing to seed: this is not a development database")
    print("Resetting tables (ids restart at 1)")
    db.session.execute(
        text(
            "TRUNCATE refunds, payments, order_status_history, settlements, orders, "
            "campaigns, products, seller_profiles, notifications, users, locations "
            "RESTART IDENTITY CASCADE"
        )
    )

    # ------------------------------------------------------------------ users
    print("Creating users")
    cleo = make_user("Cleopas", "cleopas@test.com", UserRole.ADMIN, "+254700000001")

    achieng = make_user(
        "Achieng Otieno", "achieng@test.com", UserRole.CONSUMER, "+254712345678"
    )
    dan = make_user("Dan Kimani", "dan@test.com", UserRole.CONSUMER, "+254711000002")
    panther = make_user(
        "Panther Njoroge", "panther@test.com", UserRole.CONSUMER, "+254711000003"
    )
    wanjiku = make_user(
        "Wanjiku Mwangi", "wanjiku@test.com", UserRole.CONSUMER, "+254711000004"
    )
    brian = make_user(
        "Brian Odhiambo", "brian@test.com", UserRole.CONSUMER, "+254711000005"
    )
    faith = make_user(
        "Faith Wambui", "faith@test.com", UserRole.CONSUMER, "+254711000006"
    )
    kevin = make_user(
        "Kevin Mutua", "kevin@test.com", UserRole.CONSUMER, "+254711000007"
    )
    mercy = make_user(
        "Mercy Chebet", "mercy@test.com", UserRole.CONSUMER, "+254711000008"
    )
    omar = make_user("Omar Hassan", "omar@test.com", UserRole.CONSUMER, "+254711000009")
    grace = make_user(
        "Grace Akinyi", "grace@test.com", UserRole.CONSUMER, "+254711000010"
    )
    peter = make_user(
        "Peter Kariuki", "peter@test.com", UserRole.CONSUMER, "+254711000011"
    )
    lucy = make_user("Lucy Njeri", "lucy@test.com", UserRole.CONSUMER, "+254711000012")

    jelani = make_user(
        "Jelani Mwangi", "jelani@test.com", UserRole.SELLER, "+254722000001"
    )
    davy = make_user("Davy Ochieng", "davy@test.com", UserRole.SELLER, "+254722000002")
    keith = make_user("Keith Kamau", "keith@test.com", UserRole.SELLER, "+254722000003")
    amani = make_user(
        "Amani Wekesa", "amani@test.com", UserRole.SELLER, "+254722000004"
    )
    baraka = make_user(
        "Baraka Mutiso", "baraka@test.com", UserRole.SELLER, "+254722000005"
    )

    consumers = [
        achieng,
        dan,
        panther,
        wanjiku,
        brian,
        faith,
        kevin,
        mercy,
        omar,
        grace,
        peter,
        lucy,
    ]
    db.session.add_all([cleo, *consumers, jelani, davy, keith, amani, baraka])
    db.session.flush()

    # ------------------------------------------------------- seller profiles
    print("Creating seller profiles")
    jelani_profile = make_profile(
        jelani,
        "Jelani Grains Wholesalers",
        "SELL-123-456",
        "Gikomba Market, Stall 14, Nairobi",
        ApprovalStatus.APPROVED,
        cleo,
        10,
    )
    davy_profile = make_profile(
        davy,
        "Davy Fresh Supplies",
        "SELL-789-100",
        "Wakulima Market, Stall 22, Nairobi",
        ApprovalStatus.APPROVED,
        cleo,
        9,
    )
    amani_profile = make_profile(
        amani,
        "Amani Poultry & Dairy",
        "SELL-246-810",
        "Ruiru Bypass, Plot 7, Kiambu",
        ApprovalStatus.APPROVED,
        cleo,
        8,
    )
    baraka_profile = make_profile(
        baraka,
        "Baraka Fresh Produce",
        "SELL-135-790",
        "Marikiti Market, Stall 5, Nairobi",
        ApprovalStatus.APPROVED,
        cleo,
        7,
    )
    # Pending: shows the "waiting for approval" screen and the admin approvals queue
    keith_profile = make_profile(
        keith,
        "Kitengela Dairy Farm",
        "SELL-456-321",
        "Kitengela Town, Namanga Road",
        ApprovalStatus.PENDING,
    )
    db.session.add_all(
        [jelani_profile, davy_profile, amani_profile, baraka_profile, keith_profile]
    )
    db.session.flush()

    # -------------------------------------------------------------- locations
    print("Creating locations")
    nairobi_cbd = Location(
        name="Nairobi CBD",
        delivery_fee=100,
        collection_point="Moi Avenue pickup desk, opposite Kenya Archives",
    )
    kasarani = Location(
        name="Kasarani",
        delivery_fee=150,
        collection_point="Mwiki Road pickup point, next to Seasons stage",
    )
    westlands = Location(
        name="Westlands",
        delivery_fee=150,
        collection_point="Woodvale Grove pickup desk, ground floor",
    )
    rongai = Location(
        name="Rongai",
        delivery_fee=200,
        collection_point="Rongai main stage pickup point, Magadi Road",
    )
    kisumu = Location(
        name="Kisumu",
        delivery_fee=450,
        collection_point="Oginga Odinga Street pickup desk, Kisumu CBD",
    )
    # Inactive: shows the "Inactive" badge on the admin side; shoppers can't pick it
    thika = Location(
        name="Thika",
        delivery_fee=250,
        collection_point="Thika Town, Kenyatta Highway pickup desk",
        is_active=False,
    )
    db.session.add_all([nairobi_cbd, kasarani, westlands, rongai, kisumu, thika])
    db.session.flush()

    # Where each shopper gets deliveries (collection orders don't need one)
    ADDRESS = {
        achieng: "Mwiki Road, Apartment 4B, Kasarani",
        dan: "Woodvale Grove, House 12, Westlands",
        panther: "Thika Road, Zimmerman, Kasarani",
        wanjiku: "Magadi Road, Block C, Rongai",
        brian: "Kasarani Mwiki, Hse 21, Sunrise Estate",
        faith: "Parklands Road, Apartment 7C, Westlands",
        kevin: "Moi Avenue, Bazaar Plaza, 3rd floor, CBD",
        mercy: "Tom Mboya Street, Room 14, CBD",
        omar: "Rongai Kware, Gate B, House 5",
        grace: "Kenyatta Avenue, Mutual Building, CBD",
        peter: "Lower Kabete Road, Spring Valley, Westlands",
        lucy: "Ongata Rongai, Tumaini Estate, House 9",
    }

    # --------------------------------------------------------------- products
    # Every product belongs to a seller. The admin can't create products in the
    # app, so seeding "platform" products would show data no screen can make.
    print("Creating products")
    rice = make_product(
        "Pishori rice",
        "rice_grains",
        "1kg",
        130,
        170,
        500,
        "Long-grain aromatic Pishori rice from Mwea, packed in 1kg bags.",
        cleo,
        jelani_profile,
    )
    unga = make_product(
        "Maize flour",
        "flour",
        "2kg packet",
        145,
        170,
        400,
        "Sifted white maize flour for ugali.",
        cleo,
        jelani_profile,
    )
    sugar = make_product(
        "White sugar",
        "sugar",
        "1kg",
        180,
        205,
        600,
        "Refined white sugar for household use.",
        cleo,
        jelani_profile,
    )
    green_grams = make_product(
        "Green grams (ndengu)",
        "pulses",
        "1kg",
        185,
        220,
        300,
        "Clean, dried green grams.",
        cleo,
        jelani_profile,
    )
    wheat_flour = make_product(
        "Wheat flour",
        "flour",
        "2kg packet",
        195,
        240,
        300,
        "All-purpose wheat flour for chapati and baking.",
        cleo,
        jelani_profile,
    )
    oil = make_product(
        "Cooking oil",
        "cooking_oil",
        "2 litres",
        460,
        520,
        250,
        "Refined vegetable cooking oil, 2 litre bottle.",
        cleo,
        davy_profile,
    )
    beans = make_product(
        "Rosecoco beans",
        "pulses",
        "1kg",
        130,
        180,
        200,
        "Quality Rosecoco beans for everyday meals.",
        cleo,
        davy_profile,
        status=ApprovalStatus.PENDING,
    )
    onions = make_product(
        "Red onions",
        "vegetables",
        "5kg bag",
        420,
        560,
        120,
        "Firm red onions, graded and bagged.",
        cleo,
        davy_profile,
    )
    avocados = make_product(
        "Hass avocados",
        "fruits",
        "5kg tray",
        520,
        650,
        80,
        "Hass avocados, ready in 2 to 3 days.",
        cleo,
        davy_profile,
    )
    potatoes = make_product(
        "Irish potatoes",
        "vegetables",
        "10kg bag",
        550,
        750,
        90,
        "Irish potatoes, 10kg bag.",
        cleo,
        davy_profile,
        status=ApprovalStatus.REJECTED,
        reason="Please state the variety (e.g. Shangi or Markies) and the grade "
        "in the description, then resubmit.",
    )
    tomatoes = make_product(
        "Tomatoes",
        "vegetables",
        "5kg crate",
        450,
        600,
        70,
        "Ripe tomatoes, 5kg crate.",
        cleo,
        davy_profile,
    )
    eggs = make_product(
        "Eggs",
        "dairy_eggs",
        "tray of 30",
        410,
        500,
        150,
        "Fresh farm eggs, tray of 30.",
        cleo,
        amani_profile,
    )
    milk = make_product(
        "Long-life milk",
        "dairy_eggs",
        "12 x 500ml",
        700,
        840,
        100,
        "UHT whole milk, pack of 12 x 500ml.",
        cleo,
        amani_profile,
    )
    cabbages = make_product(
        "Cabbages",
        "vegetables",
        "bag of 5 heads",
        180,
        250,
        120,
        "Large green cabbages, bag of 5 heads.",
        cleo,
        baraka_profile,
    )
    carrots = make_product(
        "Carrots",
        "vegetables",
        "5kg bag",
        300,
        400,
        100,
        "Washed carrots, 5kg bag.",
        cleo,
        baraka_profile,
    )
    oranges = make_product(
        "Oranges",
        "fruits",
        "5kg bag",
        380,
        480,
        90,
        "Sweet Machakos oranges, 5kg bag.",
        cleo,
        baraka_profile,
    )
    ginger = make_product(
        "Ginger",
        "vegetables",
        "1kg",
        260,
        350,
        60,
        "Fresh ginger root, 1kg.",
        cleo,
        baraka_profile,
        status=ApprovalStatus.PENDING,
    )

    images = {
        rice: "rice.svg",
        unga: "maize-flour.svg",
        sugar: "sugar.svg",
        green_grams: "green-grams.svg",
        wheat_flour: "wheat-flour.svg",
        oil: "cooking-oil.svg",
        beans: "beans.svg",
        onions: "onions.webp",
        avocados: "avocados.webp",
        potatoes: "potatoes.webp",
        tomatoes: "tomatoes.webp",
        eggs: "eggs.svg",
        milk: "milk.svg",
        cabbages: "cabbage.webp",
        carrots: "carrots.webp",
        oranges: "oranges.webp",
        ginger: "ginger.webp",
    }
    for product, file_name in images.items():
        product.image_url = f"/images/products/{file_name}"

    db.session.add_all(list(images))
    db.session.flush()

    # -------------------------------------------------------------- campaigns
    print("Creating campaigns")
    h = timedelta
    # Every order-bearing campaign starts ACTIVE (or FULFILLING) so place_order
    # accepts it; the final status is set after its orders, like the real flow.

    # 1. Active, minimum already reached (36 / 20)
    c1 = make_campaign(
        rice,
        cleo,
        "Rice November Drive",
        130,
        20,
        200,
        2,
        20,
        now + h(days=3),
        now + h(days=1),
        CampaignStatus.ACTIVE,
    )
    # 2. Active, ending soon AND almost unlocked (26 / 30, needs 4)
    c2 = make_campaign(
        unga,
        cleo,
        "Unga Wholesale Share",
        145,
        30,
        150,
        2,
        10,
        now + h(hours=20),
        now + h(hours=8),
        CampaignStatus.ACTIVE,
    )
    # 3. Active, minimum passed (26 / 20): still taking orders up to the maximum
    c3 = make_campaign(
        oil,
        cleo,
        "Cooking Oil Family Deal",
        460,
        20,
        120,
        1,
        6,
        now + h(days=10),
        now + h(days=7),
        CampaignStatus.ACTIVE,
    )
    # 4. Draft: for the "activate" demo
    c4 = make_campaign(
        sugar,
        cleo,
        "White Sugar Wholesale Deal",
        180,
        50,
        300,
        3,
        10,
        now + h(days=30),
        now + h(days=27),
        CampaignStatus.DRAFT,
    )
    # 5. Successful, WAITING FOR STOCK: the seller must confirm before preparing
    c5 = make_campaign(
        green_grams,
        cleo,
        "Green Grams Bulk Deal",
        185,
        20,
        100,
        2,
        9,
        now - h(hours=20),
        now - h(days=2),
        CampaignStatus.ACTIVE,
    )
    # 6. Failed: everyone refunded
    c6 = make_campaign(
        avocados,
        cleo,
        "Hass Avocado Tray Share",
        520,
        20,
        60,
        1,
        5,
        now - h(days=5),
        now - h(days=8),
        CampaignStatus.ACTIVE,
    )
    # 7. Fulfilling: stock confirmed, orders at different steps
    c7 = make_campaign(
        tomatoes,
        cleo,
        "Tomato Crate Share (early November)",
        450,
        15,
        40,
        1,
        6,
        now - h(days=5),
        now - h(days=6),
        CampaignStatus.FULFILLING,
        closed_at=now - h(days=5),
        stock_confirmed_at=now - h(days=4),
    )
    # 8. Active, 12 / 15 (needs 3): THE live demo. It is the closest campaign
    #    achieng hasn't joined, so it's her "Help it unlock" banner; joining 3 unlocks it.
    c8 = make_campaign(
        tomatoes,
        cleo,
        "Tomato Crate Share",
        450,
        15,
        40,
        1,
        5,
        now + h(hours=30),
        now + h(hours=18),
        CampaignStatus.ACTIVE,
    )
    # 9. Completed: every order received, so the seller has real "Earned" money
    c9 = make_campaign(
        onions,
        cleo,
        "Red Onion Bulk Buy (October)",
        420,
        10,
        40,
        1,
        6,
        now - h(days=14),
        now - h(days=15),
        CampaignStatus.FULFILLING,
        closed_at=now - h(days=14),
        stock_confirmed_at=now - h(days=13),
    )
    # 10. Active, 7 / 10 (needs 3), deadline in 3 days. The FAILURE demo: the admin
    #     closes it early with "Close campaign now" → FAILED, 3 automatic refunds.
    #     (No campaign is left active past its deadline: with no scheduler, that
    #     state only exists until an admin closes it, and it confuses the shop page.)
    c10 = make_campaign(
        eggs,
        cleo,
        "Egg Tray Neighbourhood Deal",
        410,
        10,
        80,
        1,
        6,
        now + h(days=3),
        now + h(days=2),
        CampaignStatus.ACTIVE,
    )
    # 11. Active, minimum passed (17 / 15)
    c11 = make_campaign(
        milk,
        cleo,
        "Long-life Milk Monthly Pack",
        700,
        15,
        60,
        1,
        4,
        now + h(days=14),
        now + h(days=11),
        CampaignStatus.ACTIVE,
    )
    # 12. Active, minimum passed (34 / 30)
    c12 = make_campaign(
        wheat_flour,
        cleo,
        "Chapati Flour Share",
        195,
        30,
        150,
        2,
        10,
        now + h(days=5),
        now + h(days=3),
        CampaignStatus.ACTIVE,
    )
    # 13. Active, almost unlocked (16 / 20, needs 4), not ending soon
    c13 = make_campaign(
        cabbages,
        cleo,
        "Cabbage Bag Share",
        180,
        20,
        60,
        1,
        6,
        now + h(days=4),
        now + h(days=2),
        CampaignStatus.ACTIVE,
    )
    # 14. Active, minimum passed (28 / 25)
    c14 = make_campaign(
        oranges,
        cleo,
        "Machakos Oranges Deal",
        380,
        25,
        80,
        1,
        6,
        now + h(days=6),
        now + h(days=4),
        CampaignStatus.ACTIVE,
    )

    campaigns = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14]
    db.session.add_all(campaigns)
    db.session.flush()

    for c in campaigns:
        p = c.product
        assert (
            p.approval_status == ApprovalStatus.APPROVED
        ), f"{c.title}: product not approved"
        assert (
            p.wholesale_price == c.campaign_price < p.retail_price
        ), f"{c.title}: prices out of order, campaign price must be the same as wholesale price"
        assert (
            c.cancellation_cutoff < c.deadline
        ), f"{c.title}: cutoff must be before deadline"
        assert c.min_quantity <= c.max_quantity, f"{c.title}: minimum above maximum"

    # ----------------------------------------------------------------- orders
    print("Creating orders")
    COLLECT, DELIVER = FulfilmentType.COLLECTION, FulfilmentType.DELIVERY

    # ---- Original orders (unchanged: the README and checkpoints rely on them)
    o1, _ = place_order(
        "ODR-10001", c7, achieng, westlands, 2, COLLECT, now - h(days=9), "QGC2M4N8ZT"
    )
    advance(
        o1,
        [
            (OrderStatus.CONFIRMED, "Campaign reached its minimum", now - h(days=4)),
            (OrderStatus.PREPARING, None, now - h(days=3)),
            (
                OrderStatus.READY_FOR_COLLECTION,
                "Ready at Woodvale Grove pickup desk",
                now - h(days=1),
            ),
        ],
        cleo,
    )

    placed = now - h(days=2)
    o2, pay2 = place_order(
        "ODR-10002", c1, achieng, nairobi_cbd, 3, COLLECT, placed, "QGH5T8P2RD"
    )
    cancelled_at = placed + h(hours=1)
    advance(
        o2, [(OrderStatus.CANCELLED, "Cancelled by consumer", cancelled_at)], achieng
    )
    o2.cancelled_at = cancelled_at
    pay2.status = PaymentStatus.REFUNDED
    db.session.add(
        Refund(
            payment_id=pay2.id,
            order_id=o2.id,
            amount=pay2.amount,
            reason=RefundReason.CONSUMER_CANCELLED,
            processed_by=achieng.id,
            processed_at=cancelled_at,
        )
    )

    o3, _ = place_order(
        "ODR-10003",
        c1,
        achieng,
        kasarani,
        5,
        DELIVER,
        now - h(hours=20),
        "QGH7X2K9LM",
        ADDRESS[achieng],
    )
    o4, _ = place_order(
        "ODR-10004",
        c1,
        dan,
        westlands,
        10,
        DELIVER,
        now - h(hours=18),
        "QGJ3R6B1VX",
        ADDRESS[dan],
    )
    o5, _ = place_order(
        "ODR-10005",
        c1,
        panther,
        nairobi_cbd,
        12,
        COLLECT,
        now - h(hours=10),
        "QGK9D4W7NC",
    )
    o6, _ = place_order(
        "ODR-10006",
        c1,
        wanjiku,
        rongai,
        9,
        DELIVER,
        now - h(hours=6),
        "QGL2S8F5HY",
        ADDRESS[wanjiku],
    )

    o7, _ = place_order(
        "ODR-10007", c7, dan, nairobi_cbd, 6, COLLECT, now - h(days=8), "QGM6P1T3XA"
    )
    advance(
        o7,
        [
            (OrderStatus.CONFIRMED, "Campaign reached its minimum", now - h(days=4)),
            (OrderStatus.PREPARING, None, now - h(days=3)),
            (
                OrderStatus.READY_FOR_COLLECTION,
                "Ready at Moi Avenue pickup desk",
                now - h(days=1),
            ),
        ],
        cleo,
    )
    advance(
        o7,
        [(OrderStatus.COMPLETED, "Receipt confirmed by consumer", now - h(hours=12))],
        dan,
    )

    o8, _ = place_order(
        "ODR-10008",
        c7,
        panther,
        kasarani,
        5,
        DELIVER,
        now - h(days=7),
        "QGN4Z7C9KE",
        ADDRESS[panther],
    )
    advance(
        o8,
        [
            (OrderStatus.CONFIRMED, "Campaign reached its minimum", now - h(days=4)),
            (OrderStatus.PREPARING, None, now - h(days=3)),
            (OrderStatus.DISPATCHED, "Out for delivery", now - h(days=1)),
        ],
        cleo,
    )

    o9, _ = place_order(
        "ODR-10009",
        c7,
        wanjiku,
        rongai,
        4,
        DELIVER,
        now - h(days=6),
        "QGP8V2J6UB",
        "Ongata Rongai, Gate 3, Tuskys Road",
    )
    advance(
        o9,
        [
            (OrderStatus.CONFIRMED, "Campaign reached its minimum", now - h(days=4)),
            (OrderStatus.PREPARING, None, now - h(days=3)),
        ],
        cleo,
    )

    # Failed campaign: orders placed while it was active, then it missed its minimum,
    # so every order was refunded automatically (no person processed it).
    failed_at = c6.deadline
    for order_no, consumer, qty, ref, placed_at in [
        ("ODR-10010", achieng, 3, "QGR3H7M2WD", now - h(days=10)),
        ("ODR-10011", dan, 2, "QGS9K4N6PE", now - h(days=9)),
    ]:
        order, payment = place_order(
            order_no, c6, consumer, nairobi_cbd, qty, COLLECT, placed_at, ref
        )
        advance(
            order,
            [(OrderStatus.REFUNDED, "Campaign did not reach its minimum", failed_at)],
            None,
        )
        payment.status = PaymentStatus.REFUNDED
        db.session.add(
            Refund(
                payment_id=payment.id,
                order_id=order.id,
                amount=payment.amount,
                reason=RefundReason.CAMPAIGN_FAILED,
                processed_by=None,  # automatic refund
                processed_at=failed_at,
            )
        )
    c6.status = CampaignStatus.FAILED
    c6.closed_at = failed_at

    # ---- New orders. Order numbers continue from ODR-10012.
    next_no = iter(range(10012, 11000))

    def join(campaign, consumer, location, qty, fulfilment, placed_at):
        """A paid order, with an address only when it is delivered."""
        address = ADDRESS[consumer] if fulfilment == DELIVER else None
        return place_order(
            f"ODR-{next(next_no)}",
            campaign,
            consumer,
            location,
            qty,
            fulfilment,
            placed_at,
            mpesa_ref(),
            address,
        )

    def join_all(campaign, rows):
        """rows: (consumer, location, qty, fulfilment, hours_ago)"""
        return [
            join(campaign, consumer, location, qty, fulfilment, now - h(hours=ago))[0]
            for consumer, location, qty, fulfilment, ago in rows
        ]

    # 2. Unga: 26 / 30, ending in 20 hours
    join_all(
        c2,
        [
            (brian, kasarani, 8, DELIVER, 40),
            (grace, nairobi_cbd, 6, COLLECT, 30),
            (peter, westlands, 10, DELIVER, 22),
            (lucy, rongai, 2, COLLECT, 5),
        ],
    )

    # 3. Cooking oil: 26 / 20
    join_all(
        c3,
        [
            (brian, kasarani, 6, DELIVER, 60),
            (faith, westlands, 5, COLLECT, 48),
            (peter, westlands, 6, DELIVER, 30),
            (wanjiku, rongai, 5, COLLECT, 20),
            (omar, rongai, 2, COLLECT, 12),
            (mercy, nairobi_cbd, 2, DELIVER, 3),
        ],
    )

    # 5. Green grams: closed successfully 20 hours ago (23 / 20); orders confirmed,
    #    stock NOT confirmed yet, so "Mark preparing" stays locked for the admin.
    closed_c5 = c5.deadline
    for order in join_all(
        c5,
        [
            (dan, westlands, 6, COLLECT, 140),
            (faith, westlands, 8, DELIVER, 120),
            (omar, rongai, 4, COLLECT, 96),
            (lucy, rongai, 5, DELIVER, 72),
        ],
    ):
        advance(
            order,
            [(OrderStatus.CONFIRMED, "Campaign reached its minimum", closed_c5)],
            cleo,
        )
    c5.status = CampaignStatus.SUCCESSFUL
    c5.closed_at = closed_c5

    # 8. Tomatoes: 12 / 15. In the demo, achieng joins with 3 and unlocks it.
    join_all(
        c8,
        [
            (faith, westlands, 4, DELIVER, 26),
            (kevin, kasarani, 5, COLLECT, 14),
            (mercy, nairobi_cbd, 3, COLLECT, 4),
        ],
    )

    # 9. Onions: completed two weeks ago (14 / 10), every order received
    closed_c9 = c9.closed_at
    for order in join_all(
        c9,
        [
            (achieng, westlands, 3, COLLECT, 24 * 19),
            (brian, kasarani, 4, DELIVER, 24 * 18),
            (grace, nairobi_cbd, 2, COLLECT, 24 * 17),
            (peter, westlands, 5, DELIVER, 24 * 16),
        ],
    ):
        location = db.session.get(Location, order.location_id)
        last_step = (
            (OrderStatus.DISPATCHED, "Out for delivery", now - h(days=11))
            if order.fulfilment == DELIVER
            else (
                OrderStatus.READY_FOR_COLLECTION,
                f"Ready at {location.collection_point}",
                now - h(days=11),
            )
        )
        advance(
            order,
            [
                (OrderStatus.CONFIRMED, "Campaign reached its minimum", closed_c9),
                (OrderStatus.PREPARING, None, now - h(days=12)),
                last_step,
            ],
            cleo,
        )
        consumer = db.session.get(User, order.consumer_id)
        advance(
            order,
            [
                (
                    OrderStatus.COMPLETED,
                    "Receipt confirmed by consumer",
                    now - h(days=10),
                )
            ],
            consumer,
        )
    c9.status = CampaignStatus.COMPLETED

    # 10. Eggs: 7 / 10. Close it live → FAILED, 3 automatic refunds.
    join_all(
        c10,
        [
            (kevin, nairobi_cbd, 3, COLLECT, 50),
            (omar, rongai, 2, DELIVER, 36),
            (lucy, rongai, 2, COLLECT, 20),
        ],
    )

    # 11. Milk: 17 / 15
    join_all(
        c11,
        [
            (dan, westlands, 4, COLLECT, 70),
            (panther, kasarani, 3, DELIVER, 52),
            (kevin, nairobi_cbd, 4, COLLECT, 33),
            (lucy, rongai, 4, DELIVER, 18),
            (grace, nairobi_cbd, 2, DELIVER, 9),
        ],
    )

    # 12. Wheat flour: 34 / 30
    join_all(
        c12,
        [
            (grace, nairobi_cbd, 10, DELIVER, 44),
            (panther, kasarani, 6, COLLECT, 30),
            (wanjiku, rongai, 4, DELIVER, 20),
            (omar, rongai, 6, COLLECT, 15),
            (peter, westlands, 8, COLLECT, 7),
        ],
    )

    # 13. Cabbages: 16 / 20
    join_all(
        c13,
        [
            (dan, westlands, 5, DELIVER, 28),
            (panther, kasarani, 4, COLLECT, 19),
            (wanjiku, rongai, 4, COLLECT, 11),
            (faith, westlands, 3, DELIVER, 2),
        ],
    )

    # 14. Oranges: 28 / 25
    join_all(
        c14,
        [
            (kevin, kasarani, 6, COLLECT, 64),
            (faith, westlands, 6, DELIVER, 50),
            (lucy, rongai, 5, COLLECT, 38),
            (achieng, kasarani, 5, DELIVER, 26),
            (mercy, nairobi_cbd, 4, COLLECT, 16),
            (brian, kasarani, 2, DELIVER, 6),
        ],
    )

    db.session.flush()

    # ------------------------------------------------ check every system rule
    print("Checking the seed against the system rules")
    MUST_REACH_MIN = {
        CampaignStatus.SUCCESSFUL,
        CampaignStatus.FULFILLING,
        CampaignStatus.COMPLETED,
    }
    for c in campaigns:
        units, homes = live_stats(c)
        live = db.session.scalars(
            select(Order).where(
                Order.campaign_id == c.id, Order.status.not_in(LIVE_EXCLUDED)
            )
        ).all()

        assert units <= c.max_quantity, f"{c.title}: over its maximum"
        for o in live:
            assert o.quantity >= c.min_order_quantity, f"{o.order_no}: below min order"
        per_user = {}
        for o in live:
            per_user[o.consumer_id] = per_user.get(o.consumer_id, 0) + o.quantity
        if c.max_per_user:
            assert all(
                q <= c.max_per_user for q in per_user.values()
            ), f"{c.title}: a shopper is over the per-user limit"

        if c.status in MUST_REACH_MIN:
            assert (
                units >= c.min_quantity
            ), f"{c.title}: closed as a success below minimum"
        if c.status == CampaignStatus.FAILED:
            assert units == 0, f"{c.title}: failed campaign still has live orders"
        if c.status in (CampaignStatus.FULFILLING, CampaignStatus.COMPLETED):
            assert (
                c.stock_confirmed_at
            ), f"{c.title}: fulfilment without confirmed stock"
        if c.status == CampaignStatus.SUCCESSFUL:
            assert all(o.status == OrderStatus.CONFIRMED for o in live)
        if c.status == CampaignStatus.COMPLETED:
            assert all(o.status == OrderStatus.COMPLETED for o in live)
        if c.status == CampaignStatus.ACTIVE:
            assert all(o.status == OrderStatus.PAID for o in live)
        if c.status == CampaignStatus.DRAFT:
            assert not live, f"{c.title}: a draft can't have orders"

        print(
            f"  #{c.id:<3}{c.status.value:<11}{units:>4} / {c.min_quantity:<4}"
            f"{homes} households   {c.title}"
        )

    for c in campaigns:
        units, _ = live_stats(c)
        if c.status == CampaignStatus.ACTIVE:
            # Shoppers would see it in the lists but couldn't join it
            assert c.deadline > now, f"{c.title}: active but its deadline has passed"
            # Keep the "Almost unlocked" rail meaningful: only campaigns that are close
            if units < c.min_quantity:
                assert units >= 0.7 * c.min_quantity, (
                    f"{c.title}: below minimum but not close ({units}/{c.min_quantity}); "
                    "it would show under 'Almost unlocked'"
                )

    # A campaign is created before its first order (default would be "today")
    for c in campaigns:
        first_order = db.session.scalar(
            select(func.min(Order.created_at)).where(Order.campaign_id == c.id)
        )
        c.created_at = (first_order or now) - h(days=1)

    order_count = db.session.scalar(select(func.count(Order.id)))
    print(
        f"{order_count} orders, {len(consumers)} shoppers, {len(campaigns)} campaigns"
    )

    units1, homes1 = live_stats(c1)
    units7, homes7 = live_stats(c7)
    assert (units1, homes1) == (36, 4), "rice should be 36 units from 4 households"
    assert units7 == 17, "early-November tomatoes should be 17 units"

    db.session.commit()
    print("Done. Every account's password is test12345")
