from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import delete
from datetime import datetime, timedelta, timezone

from app import create_app
from app.extensions import db
from app.models import User, SellerProfile, Location
from app.models.enums import *

app = create_app()

with app.app_context():
    print("hello")

    # deleting to reset
    db.session.execute(delete(User))

    # reusable date
    now = datetime.now(timezone.utc)

    # creating users
    print("Creating one admin")
    cleo = User(
        full_name="Cleopas",
        email="cleopas@test.com",
        role=UserRole.ADMIN,
        created_at=now + timedelta(14),
    )
    cleo.set_password("cleo12345")

    print("Creating two consumers")
    dan = User(
        full_name="dan",
        email="dan@test.com",
        role=UserRole.CONSUMER,
        created_at=now + timedelta(14),
    )
    dan.set_password("dan12345")

    panther = User(
        full_name="Panther",
        email="panther@test.com",
        role=UserRole.CONSUMER,
        created_at=now + timedelta(14),
    )
    panther.set_password("panther12345")

    print("Creating two sellers")
    jelani = User(
        full_name="jelani",
        email="jelani@test.com",
        role=UserRole.SELLER,
        created_at=now + timedelta(14),
    )
    jelani.set_password("jelani12345")

    davy = User(
        full_name="davy",
        email="davy@test.com",
        role=UserRole.SELLER,
        created_at=now + timedelta(14),
    )
    davy.set_password("davy12345")

    # adding all users
    print("Adding users")
    db.session.add_all([cleo, dan, panther, jelani, davy])
    db.session.flush()

    # Creating seller profiles
    print("Creating seller profiles")
    jelani_profile = SellerProfile(
        user_id=jelani.id,
        business_name="Jelanis Bizz",
        registration_number="SELL-123-456",
        business_address="Baraka Estate",
        verification_status=ApprovalStatus.PENDING,
        created_at=now + timedelta(14),
    )

    jelani_profile = SellerProfile(
        user_id=davy.id,
        business_name="Davis Bizz",
        registration_number="SELL-789-100",
        business_address="Huruma Estate",
        reviewed_by=cleo.id,
        reviewed_at=now + timedelta(14),
        verification_status=ApprovalStatus.APPROVED,
        created_at=now + timedelta(14),
    )

    # creating locations
    nairobi = Location(
        name= "Nairobi",
        delivery_fee:100,
        collection_point="Moi Avenue pickup desk, opposite Kenya Archives",
        is_active=,
    )

nairobi = Location(
        name=,
        delivery_fee:,
        collection_point=,
        is_active=,
    )

nairobi = Location(
        name=,
        delivery_fee:,
        collection_point=,
        is_active=,
    )

nairobi = Location(
        name=,
        delivery_fee:,
        collection_point=,
        is_active=,
    )

nairobi = Location(
        name=,
        delivery_fee:,
        collection_point=,
        is_active=,
    )




