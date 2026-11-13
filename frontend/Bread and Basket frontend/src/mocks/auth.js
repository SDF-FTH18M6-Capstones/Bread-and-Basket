import { ApiError } from "../api/client";

const users = [
  {
    id: 1,
    full_name: "Wanjiku Kamau",
    phone: "0712345678",
    email: "consumer@test.com",
    password: "password123",
    role: "consumer",
  },
  {
    id: 2,
    full_name: "Peter Mwangi",
    phone: "0722000111",
    email: "seller@test.com",
    password: "password123",
    role: "seller",
  },
  {
    id: 3,
    full_name: "Platform Admin",
    phone: "0700000000",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
  },
];

const wait = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

function authResponse(user, message) {
  const { id, full_name, phone, email, role } = user;
  return {
    message,
    user: { id, full_name, phone, email, role },
    access_token: `mock-token-${id}`,
    token_type: "Bearer",
  };
}

export async function login({ email, password }) {
  await wait();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!found || found.password !== password) {
    throw new ApiError("Wrong email or password.", 401);
  }
  return authResponse(found, "Welcome back.");
}

export async function registerConsumer({ full_name, phone, email, password }) {
  await wait();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new ApiError("That email is already registered.", 409);
  }
  const created = {
    id: Date.now(),
    full_name,
    phone,
    email,
    password,
    role: "consumer",
  };
  users.push(created);
  return authResponse(created, "Account created.");
}
