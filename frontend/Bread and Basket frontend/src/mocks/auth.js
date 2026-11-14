import { ApiError } from "../api/client";

// Fake users shaped like the API contract (see User and SellerProfile in openapi.yaml).
// Lives in memory only, so a page refresh resets it.
const users = [
  {
    id: 1,
    full_name: "Wanjiku Kamau",
    phone: "0712345678",
    email: "consumer@test.com",
    password: "password123",
    role: "consumer",
    seller: null,
  },
  {
    id: 2,
    full_name: "Peter Mwangi",
    phone: "0722000111",
    email: "seller@test.com",
    password: "password123",
    role: "seller",
    seller: {
      business_name: "Mwangi Wholesalers",
      business_address: "Gikomba Market, Stall 14, Nairobi",
      verification_status: "approved",
      rejection_reason: null,
    },
  },
  {
    id: 3,
    full_name: "Platform Admin",
    phone: "0700000000",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
    seller: null,
  },
];

const wait = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

// Same shape as AuthResponse in the contract. The password is never sent back.
function authResponse(account) {
  const { id, full_name, phone, email, role, seller } = account;
  return {
    user: { id, full_name, phone, email, role, seller },
    access_token: `mock-token-${id}`,
    token_type: "Bearer",
  };
}

function emailTaken(email) {
  return users.some((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function login({ email, password }) {
  await wait();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!found || found.password !== password) {
    throw new ApiError("Wrong email or password.", 401, {}, "UNAUTHORIZED");
  }
  return authResponse(found);
}

export async function registerConsumer({ full_name, phone, email, password }) {
  await wait();
  if (emailTaken(email)) {
    throw new ApiError(
      "An account with this email already exists.",
      409,
      {},
      "EMAIL_TAKEN",
    );
  }
  const created = {
    id: Date.now(),
    full_name,
    phone,
    email,
    password,
    role: "consumer",
    seller: null,
  };
  users.push(created);
  return authResponse(created);
}

// A new wholesaler starts as "pending" until an admin approves the account.
export async function registerWholesaler({
  full_name,
  phone,
  email,
  password,
  business_name,
  business_address,
}) {
  await wait();
  if (emailTaken(email)) {
    throw new ApiError(
      "An account with this email already exists.",
      409,
      {},
      "EMAIL_TAKEN",
    );
  }
  const created = {
    id: Date.now(),
    full_name,
    phone,
    email,
    password,
    role: "seller",
    seller: {
      business_name,
      business_address,
      verification_status: "pending",
      rejection_reason: null,
    },
  };
  users.push(created);
  return authResponse(created);
}
