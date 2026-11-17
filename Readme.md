# Bread and Basket

Bread and Basket is a marketplace web app that connects shoppers with local sellers of bread, groceries and everyday goods.
Shoppers browse products, place orders and track each order through to delivery; sellers manage their listings and fulfil orders; admins oversee users and activity.
The project has a Flask + PostgreSQL REST API backend and a React (Vite) frontend.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ (comes with npm) |
| Git | any recent version |
| PostgreSQL | 14+ |

## Project structure

```
Bread-and-Basket/
├── backend/                         # Flask API
├── frontend/
│   └── Bread and Basket frontend/   # React + Vite app
└── docs/
```

## 1. Clone the repo

```bash
git clone https://github.com/SDF-FTH18M6-Capstones/Bread-and-Basket.git
cd Bread-and-Basket
```

## 2. Backend setup

```bash
cd backend

# create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# create your environment file, then fill in the values
cp .env.example .env

# create the database tables
flask db upgrade

# load sample data (users, products, orders)
python seed.py

# start the API
flask run
```

The API now runs at **http://localhost:5000**.

### Backend environment variables (`backend/.env`)

| Variable | What it is | Example |
|----------|-----------|---------|
| `DATABASE_URL` | Database connection string | `postgresql://user:password@localhost:5432/bread_and_basket` |
| `SECRET_KEY` | Flask secret key | any long random string |
| `JWT_SECRET_KEY` | Signs login tokens | any long random string |

## 3. Frontend setup

Open a **second terminal** (or the only one, if you're running the frontend alone):

```bash
cd "frontend/Bread and Basket frontend"

npm install

# create your environment file
cp .env.example .env

npm run dev
```

Open **http://localhost:5173** in your browser.

### Frontend environment variables (`.env`)

| Variable | What it does | Value in `.env.example` |
|----------|-------------|---------|
| `VITE_USE_MOCKS` | `true` uses built-in mock data, so **no backend is needed**. Set to `false` to call the real API. | `true` |
| `VITE_API_URL` | The backend API address, only used when `VITE_USE_MOCKS=false`. | `http://localhost:5000/api` |

To run against the Flask backend instead of the mocks, make sure the backend is running, then set this in `.env`:

```env
VITE_USE_MOCKS=false
```

Restart `npm run dev` after changing `.env`.

## Troubleshooting

- **`flask: command not found`**: the virtual environment isn't active. Run `source venv/bin/activate` again.
- **`flask db upgrade` fails to connect**: check that PostgreSQL is running and `DATABASE_URL` in `.env` is correct.
- **Frontend loads but shows no data / network errors**: check that the backend is running and that `VITE_API_URL` points at it. Restart `npm run dev` after any `.env` change.
- **Port already in use**: run the backend on another port with `flask run --port 5001`, and update `VITE_API_URL` to match.