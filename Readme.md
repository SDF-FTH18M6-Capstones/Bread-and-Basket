# Bread & Basket

**Group buying for Kenyan households.** Neighbours join a campaign for a staple (rice, maize flour, cooking oil, tomatoes, and so on). If enough units are ordered before the deadline, everyone gets the wholesale price. If not, everyone is refunded automatically.

Bread & Basket connects three groups:

- **Shoppers** join campaigns, pay with M-Pesa (simulated), choose delivery or collection, and track their order to the door.
- **Wholesalers (sellers)** list products at wholesale prices, confirm they have the stock when a campaign succeeds, and see what they have earned.
- **Admins** approve sellers and products, run campaigns, manage delivery locations, and move orders through fulfilment.

The project is a **Flask + PostgreSQL REST API** with a **React (Vite) + Tailwind CSS** frontend. It was built as a Moringa School capstone, with a focus on object-oriented design and a clean service layer.

---

## Contents

1. [How it works](#how-it-works)
2. [Features by role](#features-by-role)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Getting started](#getting-started)
6. [Demo accounts](#demo-accounts)
7. [Demo walkthrough](#demo-walkthrough)
8. [Business rules](#business-rules)
9. [API overview](#api-overview)
10. [Running the tests](#running-the-tests)
11. [Troubleshooting](#troubleshooting)
12. [Future work](#future-work)
13. [Team](#team)

---

## How it works

```
 Admin creates a campaign            Shoppers join and pay           Deadline / admin closes
 (product, group price,     ──►      (quantity, delivery or    ──►   ┌─ minimum reached → SUCCESSFUL
  minimum & maximum units)            collection, M-Pesa)            └─ minimum missed  → FAILED, everyone refunded
                                                                                │
                                                                                ▼
 Shopper confirms receipt   ◄──   Admin: preparing → dispatched /   ◄──   Seller confirms stock
 → order COMPLETED                ready for collection                    (seller products only)
```

**Pricing for one unit:**

| Who            | Amount                                                                           |
| -------------- | -------------------------------------------------------------------------------- |
| Shopper pays   | `campaign_price + platform_charge` (+ the location's delivery fee, if delivered) |
| Seller earns   | `campaign_price` (their wholesale price)                                         |
| Platform keeps | `platform_charge`                                                                |

Prices are **snapshotted on each order**, so a later price change never alters an order that has already been paid.

---

## Features by role

### Shopper

- **Shop (dashboard):** active orders, campaigns that are almost unlocked, and campaigns ending soon.
- **Browse:** search from the navbar on any page, filter by category, and see live progress towards each campaign's minimum.
- **Join a campaign:** choose the quantity (within the campaign's limits), delivery address or collection point, see the price breakdown with savings against retail, then pay through a simulated M-Pesa prompt.
- **My orders:** a status timeline for each order, free cancellation before the campaign's cutoff, and **confirm receipt** when the goods arrive.
- **Profile:** account details (view only).

### Wholesaler (seller)

- **Registration and verification:** new sellers wait for admin approval before they can list products.
- **Products:** add products with wholesale and retail prices, stock and an image link. Each product goes to the admin for review. Rejected or pending products can be edited and resubmitted. Approved products are locked.
- **Dashboard:** what needs action now, and the campaigns currently supplied.
- **Campaign orders:** units per campaign, grouped by delivery location. Shopper details are hidden. **Confirm stock** once a campaign succeeds.
- **Earnings:** totals that are earned, in progress or still open, per campaign. These are worked out from campaign data; see [Future work](#future-work).

### Admin

- **Dashboard:** active campaigns, paid orders, revenue, pending approvals, and a "needs attention" list (overdue campaigns, fulfilment, stock status).
- **Approvals:** approve or reject sellers and products, with a reason that the seller can see.
- **Campaigns:** create and edit drafts, activate, cancel (only before anyone orders), and **close**. Closing works out the outcome and refunds everyone if the campaign failed.
- **Fulfilment:** move orders one at a time or in bulk: preparing → dispatched (delivery) or ready for collection. **"Mark preparing" stays locked until the seller confirms stock.**
- **Locations:** manage delivery and collection areas, delivery fees and collection points. Names must be unique, ignoring capital letters.

---

## Tech stack

| Layer        | Tools                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Backend      | Python 3.11, Flask, SQLAlchemy, Flask-Migrate (Alembic), marshmallow, Flask-JWT-Extended |
| Database     | PostgreSQL                                                                               |
| Frontend     | React 18, Vite, React Router, Tailwind CSS v4, lucide-react icons                        |
| API contract | OpenAPI 3.1 (`docs/openapi.yaml`) plus a Node mock server for frontend work              |
| Payments     | M-Pesa STK push **simulated** (no real money moves)                                      |

---

## Project structure

```
Bread-and-Basket/
├── backend/                            # Flask REST API
│   ├── app/
│   │   ├── models/                     # SQLAlchemy models: User, SellerProfile, Product,
│   │   │                               #   Campaign, Order, OrderStatusHistory, Payment, Location
│   │   ├── routes/                     # Blueprints: the thin HTTP layer
│   │   ├── services/                   # Business rules: load → check → change → commit
│   │   │   ├── approval_service.py     #   approve / reject sellers and products
│   │   │   ├── admin_campaign_service.py  # create, activate, cancel, close campaigns
│   │   │   ├── admin_orders.py         #   fulfilment steps and the stock-confirmation gate
│   │   │   ├── admin_location_service.py  # delivery / collection locations
│   │   │   └── seller.py               #   seller products, campaigns, confirm stock
│   │   └── schemas/                    # marshmallow input and output schemas
│   ├── migrations/                     # database migration history
│   ├── seed.py                         # demo users, products, campaigns and orders
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── Bread and Basket frontend/      # React + Vite app
│       ├── public/images/products/     # product and category pictures
│       ├── src/
│       │   ├── api/                    # client.js (fetch wrapper) + one file per area
│       │   ├── components/             # Navbar, BottomTabs, Layout, CampaignCard, modals, ...
│       │   ├── hooks/                  # useAuth
│       │   ├── lib/                    # productImages, orderStatus, formatting helpers
│       │   ├── features/                  # consumer, seller and admin pages
│       │   ├── navConfig.js            # sidebar and bottom-tab links for each role
│       │   └── index.css               # Tailwind theme colours
│       ├── package.json
│       └── .env.example
└── docs/
    ├── openapi.yaml                    # API contract (31 endpoints, with examples)
    └── mock-server.mjs                 # mock API, so the frontend can run without a database
```

---

## Getting started

### Prerequisites

| Tool       | Version              |
| ---------- | -------------------- |
| Python     | 3.11+                |
| Node.js    | 18+ (comes with npm) |
| PostgreSQL | 14+                  |
| Git        | any recent version   |

**Ubuntu, all at once:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib python3-venv python3-pip git
```

`node -v` must show 18 or higher. If it doesn't:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 1. Clone the repo

```bash
git clone https://github.com/SDF-FTH18M6-Capstones/Bread-and-Basket.git
cd Bread-and-Basket
```

### 2. Create the database (once)

```bash
sudo systemctl start postgresql
sudo -u postgres psql
```

At the `postgres=#` prompt, run these one at a time:

```sql
CREATE USER bread_user WITH PASSWORD 'bread123';
CREATE DATABASE bread_basket OWNER bread_user;
\q
```

`OWNER bread_user` matters. On PostgreSQL 15 and later, the app can't create tables without it.

Check the connection. It asks for the password, then shows `bread_basket=>`:

```bash
psql -h localhost -U bread_user -d bread_basket
```

### 3. Backend

```bash
cd backend

python3 -m venv venv
source venv/bin/activate              # (venv) should now show in your prompt

pip install -r requirements.txt

cp .env.example .env                  # then fill in the values (see below)

flask db upgrade                      # create the tables
python seed.py                        # load the demo data
flask run --debug                     # start the API
```

The API runs at:
**http://localhost:5000**.

Check it with **http://localhost:5000/api/health**.
Check it with **http://localhost:5000/api/docs**.

#### Backend environment variables (`backend/.env`)

| Variable         | What it is                 | Example                                                        |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`   | Database connection string | `postgresql://bread_user:bread123@localhost:5432/bread_basket` |
| `SECRET_KEY`     | Flask secret key           | a long random string                                           |
| `JWT_SECRET_KEY` | Signs login tokens         | a long random string                                           |

To make a random string: `python3 -c "import secrets; print(secrets.token_hex(32))"`

> **Migrations:** only run `flask db upgrade`. Run it on setup, and again after any `git pull` that brings new files in `migrations/`. Only the person who changes a model runs `flask db migrate`, and they commit the new file.

### 4. Frontend

Open a **second terminal**:

```bash
cd "frontend/Bread and Basket frontend"

npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**.

#### Frontend environment variables (`.env`)

| Variable         | What it does                                                                           | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `VITE_API_URL`   | The API the frontend talks to                                                          | `http://localhost:5000/api` (Flask) or `http://localhost:4010/api` (mock server) |
| `VITE_USE_MOCKS` | `true` uses built-in mock data, so no backend is needed. `false` calls `VITE_API_URL`. | `false` for the real backend                                                     |

**Restart `npm run dev` after changing `.env`.** Vite only reads it when it starts.

### Optional: run the frontend without a database

```bash
cd frontend/Bread and Basket frontend
npm run mock
# mock API on http://localhost:4010
```

Set `VITE_API_URL=http://localhost:4010/api` and restart the frontend. The mock follows the same contract as Flask (`docs/openapi.yaml`), so pages behave the same.

---

## Demo accounts

Created by `python seed.py`. Run it again at any time to reset all the data.

| Role    | Email                                                  | Password     | Notes                                                                           |
| ------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------- |
| Admin   | `cleopas@test.com`                                     | `<password>` |                                                                                 |
| Seller  | `davy@test.com`                                        | `<password>` | Approved. Oil, beans (pending), onions, avocados, potatoes (rejected), tomatoes |
| Seller  | `jelani@test.com`                                      | `<password>` | Approved. Rice, green grams                                                     |
| Seller  | `keith@test.com`                                       | `<password>` | **Pending approval**, so he sees the waiting screen                             |
| Shopper | `achieng@test.com`                                     | `<password>` | Has an order ready for collection                                               |
| Shopper | `wanjiku@test.com`, `dan@test.com`, `panther@test.com` | `<password>` | Orders at different fulfilment steps                                            |

**Seeded campaigns worth knowing:**

- **Rice:** active, minimum reached.
- **Unga and sugar:** platform products, with no seller.
- **Tomatoes (campaign 8):** active, 12 of 15 units.
- **Tomatoes (campaign 7):** in fulfilment, stock confirmed.
- **Avocados:** failed and refunded.

---

## Demo walkthrough

A full flow, in about 5 minutes:

1. **Shopper (achieng):** browse, open the tomato campaign (12/15), join with 3 units, and pay with M-Pesa. The minimum is now reached.
2. **Admin:** Campaigns → Tomatoes → **Close campaign now**. It becomes _Successful_. "Mark preparing" is **locked**, waiting for the seller.
3. **Seller (davy):** Campaign orders → see the units per location → **Confirm stock**.
4. **Admin:** Refresh. It shows "Seller confirmed stock". Then **Mark preparing**, followed by **Mark dispatched** or **Ready for collection**.
5. **Shopper:** My orders → the timeline shows each step → **Confirm receipt**.
6. **Seller:** Earnings. When all orders are completed, the amount moves from _In progress_ to _Earned_.

To show a **failure**: close a campaign that is below its minimum. Every paid order is refunded automatically.

---

## Business rules

**Campaign lifecycle**

```
draft ──activate──► active ──close──┬──► successful ──first order preparing──► fulfilling ──all orders completed──► completed
  │                   │             └──► failed (all live orders refunded)
  └──cancel──►  cancelled ◄──cancel (only while nobody has ordered)
```

**Order lifecycle**

```
paid ──campaign succeeds──► confirmed ──► preparing ──┬──► dispatched ────────────┬──► completed (shopper confirms)
  │                                                    └──► ready_for_collection ──┘
  ├──campaign fails──► refunded
  └──shopper cancels before the cutoff──► cancelled
```

**Key rules, enforced in the service layer:**

- Sellers and products must be **approved by an admin** before they can be used in a campaign.
- An approved product **can't be edited**. Editing a pending or rejected product sends it back for review.
- The wholesale price must be **below** the retail price.
- An order must respect the campaign's **minimum order quantity**, **maximum per user** and **remaining units**.
- **An order can't move to _preparing_ until the seller confirms stock.** Platform products (no seller) are exempt. Stock can be confirmed **once**, and only for a successful or fulfilling campaign.
- A seller only ever sees **their own** products and campaigns. Anyone else's returns **404, not 403**, so nothing leaks about whether it exists. Sellers never see shopper names or phone numbers.
- Location names are unique, **ignoring capital letters**.

---

## API overview

The full contract, with request and response examples for every endpoint, is in **`docs/openapi.yaml`**. You can open it in Swagger Editor or Redoc. All paths are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Area              | What it covers                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health            | `GET /api/health`                                                                                                                                                     |
| Auth              | register (shopper or seller), log in, current user                                                                                                                    |
| Public            | categories, active campaigns (search and filter), campaign detail, locations                                                                                          |
| Shopper           | place an order (with simulated M-Pesa), my orders, cancel, confirm receipt                                                                                            |
| Seller            | `GET/POST /seller/products`, `PATCH /seller/products/{id}`, `GET /seller/campaigns`, campaign orders grouped by location, `POST /seller/campaigns/{id}/confirm-stock` |
| Admin: approvals  | list pending sellers and products, approve, reject with a reason                                                                                                      |
| Admin: campaigns  | list, create, edit draft, activate, cancel, close (returns the outcome and the refund count)                                                                          |
| Admin: fulfilment | campaign orders, move one order, bulk-move a campaign's orders                                                                                                        |
| Admin: locations  | list, create, edit, deactivate                                                                                                                                        |

**Errors** always have the same shape. `code` is stable, so the frontend can react to it:

```json
{
  "error": {
    "code": "STOCK_NOT_CONFIRMED",
    "message": "The seller hasn't confirmed stock for this campaign yet."
  }
}
```

---

## Running the tests

```bash
cd backend
source venv/bin/activate
pytest -v
```

The tests cover the business rules: closing a campaign (success vs failure and refunds), the stock-confirmation gate, product editing rules, order limits, and unique location names.

---

## Troubleshooting

| Problem                                            | Fix                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `flask: command not found` / `ModuleNotFoundError` | The virtual environment isn't active. Run `source venv/bin/activate`.                                |
| `error: externally-managed-environment` (pip)      | The same cause: activate the venv first.                                                             |
| `Peer authentication failed`                       | Add `-h localhost` to `psql`, or check `DATABASE_URL` uses `@localhost`.                             |
| `password authentication failed`                   | The password in `DATABASE_URL` doesn't match the one in `CREATE USER`.                               |
| `permission denied for schema public`              | Run `sudo -u postgres psql -c "ALTER DATABASE bread_basket OWNER TO bread_user;"`                    |
| `relation "users" does not exist`                  | Run `flask db upgrade`, then `python seed.py`.                                                       |
| `Connection refused` on port 5432                  | Run `sudo systemctl start postgresql`.                                                               |
| `Could not locate a Flask application`             | Add `FLASK_APP=<entry file>` to `backend/.env`.                                                      |
| The frontend shows network errors / no data        | Is the backend running? Is `VITE_API_URL` right? Did you restart `npm run dev` after editing `.env`? |
| Port 5000 in use                                   | Run `flask run --port 5001` and update `VITE_API_URL`.                                               |
| A password with `@ # /` breaks `DATABASE_URL`      | Use a password with letters and numbers only.                                                        |

---

## Future work

- **Seller payouts:** an admin "mark paid" (`seller_paid_at` on campaigns), later automated with **M-Pesa B2C**. Today, Earnings shows what was sold, not what was paid out.
- **Real M-Pesa (Daraja API):** STK push with a callback URL, replacing the simulation.
- **Image upload:** Cloudinary unsigned uploads. Today, images are added by link.
- **Automatic campaign closing:** a scheduler (for example APScheduler or a cron job) to close campaigns at their deadline. Today, the admin closes them.
- **Notifications:** SMS or email when a campaign unlocks, fails, or an order moves.
- **`GET /admin/summary`:** one endpoint for the admin dashboard numbers, instead of one request per campaign.
- **Profile editing** and password reset.
- **Review history:** keep every approval and rejection, not only the latest.

---

## Team

| Name    | Role                                   |
| ------- | -------------------------------------- |
| Cleopas | Scrum master · backend lead            |
| Duncan  | frontend                               |
| Panther | frontend                               |
| Jelani  | frontend                               |

Built for the **Moringa School** Software Development capstone, November 2026.
