from dotenv import load_dotenv

load_dotenv()

from datetime import datetime, timedelta, timezone
from sqlalchemy import func, text
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


def live_stats(campaign):
    """Units and households from orders that are not cancelled or refunded."""
    return db.session.execute(
        db.select(
            func.sum(Order.quantity), func.count(func.distinct(Order.consumer_id))
        ).where(
            Order.campaign_id == campaign.id,
            Order.status.not_in([OrderStatus.CANCELLED, OrderStatus.REFUNDED]),
        )
    ).one()


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
    jelani = make_user(
        "Jelani Mwangi", "jelani@test.com", UserRole.SELLER, "+254722000001"
    )
    davy = make_user("Davy Ochieng", "davy@test.com", UserRole.SELLER, "+254722000002")
    keith = make_user("Keith Kamau", "keith@test.com", UserRole.SELLER, "+254722000003")
    db.session.add_all([cleo, achieng, dan, panther, wanjiku, jelani, davy, keith])
    db.session.flush()

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
    keith_profile = make_profile(
        keith,
        "Kitengela Dairy Farm",
        "SELL-456-321",
        "Kitengela Town, Namanga Road",
        ApprovalStatus.PENDING,
    )
    db.session.add_all([jelani_profile, davy_profile, keith_profile])
    db.session.flush()

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
    db.session.add_all([nairobi_cbd, kasarani, westlands, rongai, kisumu])
    db.session.flush()

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
    sugar = make_product(
        "White sugar",
        "sugar",
        "1kg",
        180,
        205,
        600,
        "Refined white sugar for household use.",
        cleo,
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
    wheat_flour = make_product(
        "Wheat flour",
        "flour",
        "2kg packet",
        195,
        240,
        300,
        "All-purpose wheat flour for chapati and baking.",
        cleo,
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
    eggs = make_product(
        "Eggs",
        "dairy_eggs",
        "tray of 30",
        410,
        500,
        150,
        "Fresh farm eggs, tray of 30.",
        cleo,
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
        reason="Unit weight and photo missing. Please resubmit.",
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
    db.session.add_all(
        [
            rice,
            unga,
            oil,
            sugar,
            green_grams,
            beans,
            wheat_flour,
            onions,
            avocados,
            eggs,
            milk,
            potatoes,
            tomatoes,
        ]
    )
    db.session.flush()

    print("Creating campaigns")
    h = timedelta
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
    c2 = make_campaign(
        unga,
        cleo,
        "Unga Wholesale Share",
        145,
        30,
        150,
        2,
        10,
        now + h(hours=36),
        now + h(hours=12),
        CampaignStatus.ACTIVE,
    )
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
    c5 = make_campaign(
        green_grams,
        cleo,
        "Green Grams Bulk Deal",
        185,
        20,
        100,
        2,
        9,
        now + h(days=9),
        now + h(days=6),
        CampaignStatus.ACTIVE,
    )
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
        CampaignStatus.ACTIVE,  # active while people order; marked FAILED after the orders below
    )
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
    campaigns = [c1, c2, c3, c4, c5, c6, c7, c8]
    db.session.add_all(campaigns)
    db.session.flush()

    for c in campaigns:
        p = db.session.get(Product, c.product_id)
        assert (
            p.approval_status == ApprovalStatus.APPROVED
        ), f"{c.title}: product not approved"
        assert (
            p.wholesale_price == c.campaign_price < p.retail_price
        ), f"{c.title}: prices out of order, campaign price must be the same as wholesale price"

    print("Creating orders")
    COLLECT, DELIVER = FulfilmentType.COLLECTION, FulfilmentType.DELIVERY

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
        "Mwiki Road, Apartment 4B, Kasarani",
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
        "Woodvale Grove, House 12, Westlands",
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
        "Magadi Road, Block C, Rongai",
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
        "Thika Road, Zimmerman, Kasarani",
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
    failed_orders = []
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
        failed_orders.append(order)
    c6.status = CampaignStatus.FAILED
    c6.closed_at = failed_at

    db.session.flush()

    for o in (o1, o2, o3, o4, o5, o6, o7, o8, o9, *failed_orders):
        print(
            f"{o.order_no}  {o.status.value:<22} qty={o.quantity:<3} total={o.total_amount}"
        )
    units1, homes1 = live_stats(c1)
    units7, homes7 = live_stats(c7)
    print(
        f"Rice campaign:   {units1} live units, {homes1} households (expect 36 and 4)"
    )
    print(f"Tomato campaign: {units7} live units, {homes7} households (min is 15)")

    db.session.commit()
    print("Done")
