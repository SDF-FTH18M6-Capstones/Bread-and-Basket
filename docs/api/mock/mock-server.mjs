import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 4010);
const PASSWORD = "test12345";
const PLATFORM_CHARGE = 10;
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const CATEGORIES = ["vegetables", "fruits", "rice_grains", "flour", "cooking_oil", "sugar", "pulses", "dairy_eggs"];
const LIVE = (o) => o.status !== "cancelled" && o.status !== "refunded";

// ----------------------------------------------------------------------------- helpers
const iso = (ms) => (ms == null ? null : new Date(ms + 3 * HOUR).toISOString().replace(/\.\d{3}Z$/, "+03:00"));
const ref = () => "QG" + Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const bad = (code, msg) => new ApiError(400, code, msg);
const notFound = (msg = "Not found.") => new ApiError(404, "NOT_FOUND", msg);
const forbidden = (msg = "You do not have permission to do this.") => new ApiError(403, "FORBIDDEN", msg);
const invalid = (field, msg) => new ApiError(422, "VALIDATION_FAILED", `${field}: ${msg}`);

// ----------------------------------------------------------------------------- data (mirrors seed.py)
let db;
function seed() {
  const now = Date.now();
  const user = (id, full_name, email, role, phone) => ({ id, full_name, email, role, phone, password: PASSWORD, created_at: now - 30 * DAY });
  const users = [
    user(1, "Cleopas", "cleopas@test.com", "admin", "+254700000001"),
    user(2, "Achieng Otieno", "achieng@test.com", "consumer", "+254712345678"),
    user(3, "Dan Kimani", "dan@test.com", "consumer", "+254711000002"),
    user(4, "Panther Njoroge", "panther@test.com", "consumer", "+254711000003"),
    user(5, "Wanjiku Mwangi", "wanjiku@test.com", "consumer", "+254711000004"),
    user(6, "Jelani Mwangi", "jelani@test.com", "seller", "+254722000001"),
    user(7, "Davy Ochieng", "davy@test.com", "seller", "+254722000002"),
    user(8, "Keith Kamau", "keith@test.com", "seller", "+254722000003"),
  ];
  const profile = (id, user_id, business_name, registration_number, business_address, verification_status, daysAgo) => ({
    id, user_id, business_name, registration_number, business_address, verification_status,
    rejection_reason: null,
    reviewed_by: verification_status === "pending" ? null : 1,
    reviewed_at: verification_status === "pending" ? null : now - daysAgo * DAY,
    created_at: now - (daysAgo + 2) * DAY,
  });
  const profiles = [
    profile(1, 6, "Jelani Grains Wholesalers", "SELL-123-456", "Gikomba Market, Stall 14, Nairobi", "approved", 10),
    profile(2, 7, "Davy Fresh Supplies", "SELL-789-100", "Wakulima Market, Stall 22, Nairobi", "approved", 9),
    profile(3, 8, "Kitengela Dairy Farm", "SELL-456-321", "Kitengela Town, Namanga Road", "pending", 0),
  ];
  const locations = [
    { id: 1, name: "Nairobi CBD", delivery_fee: 100, collection_point: "Moi Avenue pickup desk, opposite Kenya Archives", is_active: true },
    { id: 2, name: "Kasarani", delivery_fee: 150, collection_point: "Mwiki Road pickup point, next to Seasons stage", is_active: true },
    { id: 3, name: "Westlands", delivery_fee: 150, collection_point: "Woodvale Grove pickup desk, ground floor", is_active: true },
    { id: 4, name: "Rongai", delivery_fee: 200, collection_point: "Rongai main stage pickup point, Magadi Road", is_active: true },
    { id: 5, name: "Kisumu", delivery_fee: 450, collection_point: "Oginga Odinga Street pickup desk, Kisumu CBD", is_active: true },
  ];
  // [id, name, category, unit, wholesale, retail, stock, description, seller_id (null = platform), status, reason]
  const productRows = [
    [1, "Pishori rice", "rice_grains", "1kg", 130, 170, 500, "Long-grain aromatic Pishori rice from Mwea, packed in 1kg bags.", 1, "approved"],
    [2, "Maize flour", "flour", "2kg packet", 145, 170, 400, "Sifted white maize flour for ugali.", null, "approved"],
    [3, "Cooking oil", "cooking_oil", "2 litres", 460, 520, 250, "Refined vegetable cooking oil, 2 litre bottle.", 2, "approved"],
    [4, "White sugar", "sugar", "1kg", 180, 205, 600, "Refined white sugar for household use.", null, "approved"],
    [5, "Green grams (ndengu)", "pulses", "1kg", 185, 220, 300, "Clean, dried green grams.", 1, "approved"],
    [6, "Rosecoco beans", "pulses", "1kg", 130, 180, 200, "Quality Rosecoco beans for everyday meals.", 2, "pending"],
    [7, "Wheat flour", "flour", "2kg packet", 195, 240, 300, "All-purpose wheat flour for chapati and baking.", null, "approved"],
    [8, "Red onions", "vegetables", "5kg bag", 420, 560, 120, "Firm red onions, graded and bagged.", 2, "approved"],
    [9, "Hass avocados", "fruits", "5kg tray", 520, 650, 80, "Hass avocados, ready in 2 to 3 days.", 2, "approved"],
    [10, "Eggs", "dairy_eggs", "tray of 30", 410, 500, 150, "Fresh farm eggs, tray of 30.", null, "approved"],
    [11, "Long-life milk", "dairy_eggs", "12 x 500ml", 700, 840, 100, "UHT whole milk, pack of 12 x 500ml.", null, "approved"],
    [12, "Irish potatoes", "vegetables", "10kg bag", 550, 750, 90, "Irish potatoes, 10kg bag.", 2, "rejected", "Unit weight and photo missing. Please resubmit."],
    [13, "Tomatoes", "vegetables", "5kg crate", 450, 600, 70, "Ripe tomatoes, 5kg crate.", 2, "approved"],
  ];
  const products = productRows.map(([id, name, category, unit, wholesale_price, retail_price, stock_quantity, description, seller_id, approval_status, rejection_reason = null]) => ({
    id, name, category, unit, wholesale_price, retail_price, stock_quantity, description, seller_id,
    source: seller_id ? "seller" : "platform", image_url: null, approval_status, rejection_reason,
    reviewed_by: approval_status === "pending" ? null : 1,
    reviewed_at: approval_status === "pending" ? null : now - 5 * DAY,
    created_at: now - 8 * DAY,
  }));
  // [id, product_id, title, min, max, min_order, per_user, deadline, cutoff, status, closed_at, created_at]
  const campaignRows = [
    [1, 1, "Rice November Drive", 20, 200, 2, 20, now + 3 * DAY, now + 1 * DAY, "active", null, now - 4 * DAY],
    [2, 2, "Unga Wholesale Share", 30, 150, 2, 10, now + 36 * HOUR, now + 12 * HOUR, "active", null, now - 3 * DAY],
    [3, 3, "Cooking Oil Family Deal", 20, 120, 1, 6, now + 10 * DAY, now + 7 * DAY, "active", null, now - 2 * DAY],
    [4, 4, "White Sugar Wholesale Deal", 50, 300, 3, 10, now + 30 * DAY, now + 27 * DAY, "draft", null, now - 1 * DAY],
    [5, 5, "Green Grams Bulk Deal", 20, 100, 2, 9, now + 9 * DAY, now + 6 * DAY, "active", null, now - 2 * DAY],
    [6, 9, "Hass Avocado Tray Share", 20, 60, 1, 5, now - 5 * DAY, now - 8 * DAY, "failed", now - 5 * DAY, now - 14 * DAY],
    [7, 13, "Tomato Crate Share (early November)", 15, 40, 1, 6, now - 5 * DAY, now - 6 * DAY, "fulfilling", now - 5 * DAY, now - 12 * DAY],
    [8, 13, "Tomato Crate Share", 15, 40, 1, 5, now + 30 * HOUR, now + 18 * HOUR, "active", null, now - 1 * DAY],
  ];
  const campaigns = campaignRows.map(([id, product_id, title, min_quantity, max_quantity, min_order_quantity, max_per_user, deadline, cancellation_cutoff, status, closed_at, created_at]) => ({
    id, product_id, created_by: 1, title, campaign_price: products[product_id - 1].wholesale_price, platform_charge: PLATFORM_CHARGE,
    min_quantity, max_quantity, min_order_quantity, max_per_user, deadline, cancellation_cutoff, status, closed_at,
    stock_confirmed_at: status === "fulfilling" ? now - 4 * DAY : null, created_at,
  }));

  db = { users, profiles, locations, products, campaigns, orders: [], payments: [], refunds: [], history: [], ids: {} };
  db.ids = { users: 8, profiles: 3, locations: 5, products: 13, campaigns: 8, orders: 0, payments: 0, refunds: 0, history: 0 };

  // Orders, built the same way the real API builds them (snapshot prices, payment, first history row).
  const place = (order_no, campaign_id, consumer_id, location_id, quantity, fulfilment, placedAt, reference, delivery_address = null) => {
    const c = db.campaigns[campaign_id - 1];
    const loc = db.locations[location_id - 1];
    const logistics = fulfilment === "delivery" ? loc.delivery_fee : 0;
    const o = {
      id: ++db.ids.orders, order_no, campaign_id, consumer_id, quantity,
      unit_price: c.campaign_price, platform_charge: c.platform_charge, logistics_charge: logistics,
      total_amount: quantity * (c.campaign_price + c.platform_charge) + logistics,
      fulfilment, location_id, delivery_address, status: "paid", cancelled_at: null, created_at: placedAt,
    };
    db.orders.push(o);
    db.payments.push({ id: ++db.ids.payments, order_id: o.id, amount: o.total_amount, method: "simulated_mpesa", reference, status: "successful", paid_at: placedAt + 30e3 });
    addHistory(o, "paid", "Payment received", null, placedAt + 30e3);
    return o;
  };
  const steps = (o, list, by) => list.forEach(([status, note, at]) => { o.status = status; addHistory(o, status, note, by, at); });
  const fulfilmentSteps = (readyNote, finalStatus = "ready_for_collection") => [
    ["confirmed", "Campaign reached its minimum", now - 4 * DAY],
    ["preparing", null, now - 3 * DAY],
    [finalStatus, readyNote, now - 1 * DAY],
  ];

  const o1 = place("ODR-10001", 7, 2, 3, 2, "collection", now - 9 * DAY, "QGC2M4N8ZT");
  steps(o1, fulfilmentSteps("Ready at Woodvale Grove pickup desk"), 1);
  const o2 = place("ODR-10002", 1, 2, 1, 3, "collection", now - 2 * DAY, "QGH5T8P2RD");
  refundOrder(o2, "consumer_cancelled", 2, now - 2 * DAY + HOUR, "cancelled", "Cancelled by consumer");
  place("ODR-10003", 1, 2, 2, 5, "delivery", now - 20 * HOUR, "QGH7X2K9LM", "Mwiki Road, Apartment 4B, Kasarani");
  place("ODR-10004", 1, 3, 3, 10, "delivery", now - 18 * HOUR, "QGJ3R6B1VX", "Woodvale Grove, House 12, Westlands");
  place("ODR-10005", 1, 4, 1, 12, "collection", now - 10 * HOUR, "QGK9D4W7NC");
  place("ODR-10006", 1, 5, 4, 9, "delivery", now - 6 * HOUR, "QGL2S8F5HY", "Magadi Road, Block C, Rongai");
  const o7 = place("ODR-10007", 7, 3, 1, 6, "collection", now - 8 * DAY, "QGM6P1T3XA");
  steps(o7, fulfilmentSteps("Ready at Moi Avenue pickup desk"), 1);
  steps(o7, [["completed", "Receipt confirmed by consumer", now - 12 * HOUR]], 3);
  const o8 = place("ODR-10008", 7, 4, 2, 5, "delivery", now - 7 * DAY, "QGN4Z7C9KE", "Thika Road, Zimmerman, Kasarani");
  steps(o8, fulfilmentSteps("Out for delivery", "dispatched"), 1);
  const o9 = place("ODR-10009", 7, 5, 4, 4, "delivery", now - 6 * DAY, "QGP8V2J6UB", "Ongata Rongai, Gate 3, Tuskys Road");
  steps(o9, fulfilmentSteps(null).slice(0, 2), 1);
  for (const [no, consumer, qty, r, placed] of [["ODR-10010", 2, 3, "QGR3H7M2WD", now - 10 * DAY], ["ODR-10011", 3, 2, "QGS9K4N6PE", now - 9 * DAY]]) {
    const o = place(no, 6, consumer, 1, qty, "collection", placed, r);
    refundOrder(o, "campaign_failed", null, db.campaigns[5].deadline, "refunded", "Campaign did not reach its minimum");
  }
}

function addHistory(order, status, note, updated_by, at = Date.now()) {
  db.history.push({ id: ++db.ids.history, order_id: order.id, status, note, updated_by, created_at: at });
}
function refundOrder(order, reason, processed_by, at, newStatus, note) {
  const payment = db.payments.find((p) => p.order_id === order.id);
  payment.status = "refunded";
  db.refunds.push({ id: ++db.ids.refunds, payment_id: payment.id, order_id: order.id, amount: payment.amount, reason, processed_by, processed_at: at });
  order.status = newStatus;
  if (newStatus === "cancelled") order.cancelled_at = at;
  addHistory(order, newStatus, note, processed_by, at);
}

// ----------------------------------------------------------------------------- lookups and calculations
const byId = (table, id) => db[table].find((r) => r.id === Number(id));
const mustGet = (table, id, label) => byId(table, id) || (() => { throw notFound(`${label} not found.`); })();
const productOf = (c) => byId("products", c.product_id);
const profileOfUser = (u) => db.profiles.find((p) => p.user_id === u.id) || null;
const liveOrders = (c) => db.orders.filter((o) => o.campaign_id === c.id && LIVE(o));
const orderedQty = (c) => liveOrders(c).reduce((s, o) => s + o.quantity, 0);
const myQty = (c, userId) => liveOrders(c).filter((o) => o.consumer_id === userId).reduce((s, o) => s + o.quantity, 0);
const canJoin = (c) => c.status === "active" && c.deadline > Date.now() && orderedQty(c) < c.max_quantity;
const nextStatuses = (o) =>
  o.status === "confirmed" ? ["preparing"] : o.status === "preparing" ? [o.fulfilment === "delivery" ? "dispatched" : "ready_for_collection"] : [];

// ----------------------------------------------------------------------------- serializers (shapes from openapi.yaml)
const userJson = (u) => {
  const p = profileOfUser(u);
  return {
    id: u.id, full_name: u.full_name, phone: u.phone, email: u.email, role: u.role,
    seller: p ? { business_name: p.business_name, business_address: p.business_address, verification_status: p.verification_status, rejection_reason: p.rejection_reason } : null,
  };
};
const productSummary = (p) => ({ id: p.id, name: p.name, unit: p.unit, category: p.category, image_url: p.image_url, retail_price: p.retail_price });
const productDetail = (p) => ({
  ...productSummary(p), description: p.description, source: p.source,
  seller_name: p.seller_id ? byId("profiles", p.seller_id).business_name : "Bread & Basket",
});
const sellerProduct = (p) => ({
  ...productSummary(p), description: p.description, wholesale_price: p.wholesale_price, stock_quantity: p.stock_quantity,
  approval_status: p.approval_status, rejection_reason: p.rejection_reason, created_at: iso(p.created_at),
});
const adminProduct = (p) => {
  const s = p.seller_id ? byId("profiles", p.seller_id) : null;
  return { ...sellerProduct(p), source: p.source, seller: s ? { id: s.id, business_name: s.business_name, verification_status: s.verification_status } : null, reviewed_at: iso(p.reviewed_at) };
};
const campaignSummary = (c) => {
  const p = productOf(c);
  const ordered = orderedQty(c);
  return {
    id: c.id, title: c.title, status: c.status, campaign_price: c.campaign_price, min_quantity: c.min_quantity, max_quantity: c.max_quantity,
    deadline: iso(c.deadline), ordered_quantity: ordered, households: new Set(liveOrders(c).map((o) => o.consumer_id)).size,
    min_reached: ordered >= c.min_quantity, sold_out: ordered >= c.max_quantity, savings_per_unit: p.retail_price - c.campaign_price,
    product: productSummary(p),
  };
};
const campaignDetail = (c, user) => {
  const remaining = c.max_quantity - orderedQty(c);
  let my_quantity = null, max_orderable = null;
  if (user) {
    my_quantity = myQty(c, user.id);
    max_orderable = Math.max(0, c.max_per_user == null ? remaining : Math.min(remaining, c.max_per_user - my_quantity));
  }
  return {
    ...campaignSummary(c), platform_charge: c.platform_charge, min_order_quantity: c.min_order_quantity, max_per_user: c.max_per_user,
    cancellation_cutoff: iso(c.cancellation_cutoff), remaining_quantity: remaining, can_join: canJoin(c), my_quantity, max_orderable,
    product: productDetail(productOf(c)),
  };
};
const adminCampaign = (c) => ({
  ...campaignSummary(c), platform_charge: c.platform_charge, min_order_quantity: c.min_order_quantity, max_per_user: c.max_per_user,
  cancellation_cutoff: iso(c.cancellation_cutoff), closed_at: iso(c.closed_at), created_at: iso(c.created_at),
});
const locationJson = (l) => ({ id: l.id, name: l.name, delivery_fee: l.delivery_fee, collection_point: l.collection_point });
const refundJson = (o) => {
  const r = db.refunds.find((x) => x.order_id === o.id);
  return r ? { amount: r.amount, reason: r.reason, automatic: r.processed_by === null, processed_at: iso(r.processed_at) } : null;
};
const orderSummary = (o) => {
  const c = byId("campaigns", o.campaign_id);
  return {
    id: o.id, order_no: o.order_no, status: o.status, quantity: o.quantity, total_amount: o.total_amount, fulfilment: o.fulfilment,
    delivery_address: o.delivery_address, created_at: iso(o.created_at), cancellation_cutoff: iso(c.cancellation_cutoff),
    can_cancel: ["paid", "confirmed"].includes(o.status) && Date.now() <= c.cancellation_cutoff,
    location: locationJson(byId("locations", o.location_id)), campaign: campaignSummary(c), refund: refundJson(o),
  };
};
const orderDetail = (o) => {
  const p = db.payments.find((x) => x.order_id === o.id);
  return {
    ...orderSummary(o), unit_price: o.unit_price, platform_charge: o.platform_charge, logistics_charge: o.logistics_charge,
    payment: { reference: p.reference, status: p.status, amount: p.amount, paid_at: iso(p.paid_at) },
    history: db.history.filter((h) => h.order_id === o.id).sort((a, b) => a.created_at - b.created_at || a.id - b.id)
      .map((h) => ({ status: h.status, note: h.note, created_at: iso(h.created_at) })),
  };
};
const adminOrder = (o) => {
  const l = byId("locations", o.location_id);
  const u = byId("users", o.consumer_id);
  return {
    id: o.id, order_no: o.order_no, status: o.status, quantity: o.quantity, total_amount: o.total_amount, fulfilment: o.fulfilment,
    location: { id: l.id, name: l.name, collection_point: l.collection_point }, delivery_address: o.delivery_address,
    consumer: { id: u.id, full_name: u.full_name, phone: u.phone }, created_at: iso(o.created_at), next_statuses: nextStatuses(o),
  };
};
const adminSeller = (p) => {
  const u = byId("users", p.user_id);
  return {
    id: p.id, user: { id: u.id, full_name: u.full_name, email: u.email, phone: u.phone }, business_name: p.business_name,
    registration_number: p.registration_number, business_address: p.business_address, verification_status: p.verification_status,
    rejection_reason: p.rejection_reason, reviewed_at: iso(p.reviewed_at), created_at: iso(p.created_at),
  };
};

// ----------------------------------------------------------------------------- fake JWT (real format, NOT secure: mock only)
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const makeToken = (u) => {
  const t = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: String(u.id), role: u.role, iat: t, exp: t + 12 * 3600, jti: randomUUID(), type: "access" })}.mock-signature`;
};
function currentUser(req, { required }) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    if (required) throw new ApiError(401, "TOKEN_MISSING", "Please log in.");
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(header.slice(7).split(".")[1], "base64url").toString());
    if (payload.exp * 1000 < Date.now()) throw new ApiError(401, "TOKEN_EXPIRED", "Your session has expired. Please log in again.");
    const u = byId("users", payload.sub);
    if (!u || u.role !== payload.role) throw new Error("unknown user");
    return u;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(401, "TOKEN_INVALID", "Your session is invalid. Please log in again.");
  }
}
const requireRole = (req, ...roles) => {
  const u = currentUser(req, { required: true });
  if (!roles.includes(u.role)) throw forbidden();
  return u;
};

// ----------------------------------------------------------------------------- tiny request validation (422s)
function need(body, field, type, opts = {}) {
  const v = body[field];
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return undefined;
    throw invalid(field, "Missing data for required field.");
  }
  if (type === "int" && !(Number.isInteger(v))) throw invalid(field, "Not a valid integer.");
  if (type === "str" && typeof v !== "string") throw invalid(field, "Not a valid string.");
  if (type === "bool" && typeof v !== "boolean") throw invalid(field, "Not a valid boolean.");
  if (type === "date" && (typeof v !== "string" || Number.isNaN(Date.parse(v)))) throw invalid(field, "Not a valid datetime.");
  if (opts.min != null && type === "int" && v < opts.min) throw invalid(field, `Must be greater than or equal to ${opts.min}.`);
  if (opts.minLen != null && v.length < opts.minLen) throw invalid(field, `Shorter than minimum length ${opts.minLen}.`);
  if (opts.oneOf && !opts.oneOf.includes(v)) throw invalid(field, `Must be one of: ${opts.oneOf.join(", ")}.`);
  if (opts.pattern && !opts.pattern.test(v)) throw invalid(field, "String does not match expected pattern.");
  return type === "date" ? Date.parse(v) : v;
}
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9]{9,15}$/;

// ----------------------------------------------------------------------------- business actions
function register(body, role) {
  const full_name = need(body, "full_name", "str", { minLen: 2 });
  const phone = need(body, "phone", "str", { pattern: PHONE });
  const email = need(body, "email", "str", { pattern: EMAIL }).toLowerCase();
  const password = need(body, "password", "str", { minLen: 8 });
  let business;
  if (role === "seller") {
    business = {
      business_name: need(body, "business_name", "str", { minLen: 2 }),
      registration_number: need(body, "registration_number", "str", { minLen: 2 }),
      business_address: need(body, "business_address", "str", { minLen: 2 }),
    };
  }
  if (db.users.some((u) => u.email === email)) throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
  const u = { id: ++db.ids.users, full_name, email, role, phone, password, created_at: Date.now() };
  db.users.push(u);
  if (business) db.profiles.push({ id: ++db.ids.profiles, user_id: u.id, ...business, verification_status: "pending", rejection_reason: null, reviewed_by: null, reviewed_at: null, created_at: Date.now() });
  return { user: userJson(u), access_token: makeToken(u), token_type: "Bearer" };
}

function placeOrder(u, body) {
  const campaign_id = need(body, "campaign_id", "int");
  const quantity = need(body, "quantity", "int", { min: 1 });
  const fulfilment = need(body, "fulfilment", "str", { oneOf: ["delivery", "collection"] });
  need(body, "phone", "str", { pattern: PHONE });
  const location_id = need(body, "location_id", "int");
  const address = need(body, "delivery_address", "str", { optional: true });
  if (fulfilment === "delivery" && !address) throw invalid("delivery_address", "Required when fulfilment is delivery.");

  const c = mustGet("campaigns", campaign_id, "Campaign");
  if (c.status === "draft") throw notFound("Campaign not found.");
  const loc = byId("locations", location_id);
  if (!loc || !loc.is_active) throw bad("LOCATION_UNAVAILABLE", "This location is not available. Pick another one.");
  if (!(c.status === "active" && c.deadline > Date.now())) throw bad("CAMPAIGN_CLOSED", "This campaign is no longer taking orders.");
  if (quantity < c.min_order_quantity) throw bad("BELOW_MIN_ORDER_QUANTITY", `The minimum order for this campaign is ${c.min_order_quantity} units.`);
  const remaining = c.max_quantity - orderedQty(c);
  if (quantity > remaining) throw bad("NOT_ENOUGH_STOCK", remaining > 0 ? `Only ${remaining} units are left in this campaign.` : "This campaign is sold out.");
  if (c.max_per_user != null) {
    const left = c.max_per_user - myQty(c, u.id);
    if (quantity > left) throw bad("MAX_PER_USER_EXCEEDED", left > 0 ? `You can order at most ${left} more units of this campaign.` : "You have reached the limit for this campaign.");
  }
  const logistics = fulfilment === "delivery" ? loc.delivery_fee : 0;
  const now = Date.now();
  const o = {
    id: ++db.ids.orders, order_no: `ODR-${10000 + db.ids.orders}`, campaign_id: c.id, consumer_id: u.id, quantity,
    unit_price: c.campaign_price, platform_charge: c.platform_charge, logistics_charge: logistics,
    total_amount: quantity * (c.campaign_price + c.platform_charge) + logistics,
    fulfilment, location_id: loc.id, delivery_address: fulfilment === "delivery" ? address : null, status: "paid", cancelled_at: null, created_at: now,
  };
  db.orders.push(o);
  db.payments.push({ id: ++db.ids.payments, order_id: o.id, amount: o.total_amount, method: "simulated_mpesa", reference: ref(), status: "successful", paid_at: now });
  addHistory(o, "paid", "Payment received", null, now);
  return o;
}

function closeCampaign(c, adminId) {
  if (c.status !== "active") throw bad("CAMPAIGN_NOT_ACTIVE", "Only active campaigns can be closed.");
  const now = Date.now();
  const live = liveOrders(c);
  let confirmed = 0, refunded = 0;
  if (orderedQty(c) >= c.min_quantity) {
    c.status = "successful";
    for (const o of live.filter((o) => o.status === "paid")) { o.status = "confirmed"; addHistory(o, "confirmed", "Campaign reached its minimum", adminId, now); confirmed++; }
  } else {
    c.status = "failed";
    for (const o of live) { refundOrder(o, "campaign_failed", null, now, "refunded", "Campaign did not reach its minimum"); refunded++; }
  }
  c.closed_at = now;
  return { campaign: adminCampaign(c), outcome: c.status, orders_confirmed: confirmed, orders_refunded: refunded };
}

function moveOrder(o, status, note, adminId) {
  if (!nextStatuses(o).includes(status)) {
    let msg = `An order that is ${o.status.replaceAll("_", " ")} cannot be moved to ${status.replaceAll("_", " ")}.`;
    if (status === "dispatched" && o.fulfilment === "collection") msg = "A collection order cannot be marked as dispatched.";
    if (status === "ready_for_collection" && o.fulfilment === "delivery") msg = "A delivery order cannot be marked as ready for collection.";
    throw bad("INVALID_STATUS_STEP", msg);
  }
  o.status = status;
  addHistory(o, status, note ?? null, adminId);
  const c = byId("campaigns", o.campaign_id);
  if (status === "preparing" && c.status === "successful") c.status = "fulfilling";
}

function maybeCompleteCampaign(c) {
  const live = liveOrders(c);
  if (c.status === "fulfilling" && live.length && live.every((o) => o.status === "completed")) c.status = "completed";
}

function campaignFields(body, partial) {
  const opt = { optional: partial };
  const out = {};
  const set = (k, v) => { if (v !== undefined) out[k] = v; };
  set("title", need(body, "title", "str", { ...opt, minLen: 3 }));
  set("min_quantity", need(body, "min_quantity", "int", { ...opt, min: 1 }));
  set("max_quantity", need(body, "max_quantity", "int", { ...opt, min: 1 }));
  set("min_order_quantity", need(body, "min_order_quantity", "int", { optional: true, min: 1 }));
  if ("max_per_user" in body) out.max_per_user = body.max_per_user === null ? null : need(body, "max_per_user", "int", { min: 1 });
  set("platform_charge", need(body, "platform_charge", "int", { optional: true, min: 0 }));
  set("deadline", need(body, "deadline", "date", opt));
  set("cancellation_cutoff", need(body, "cancellation_cutoff", "date", { optional: true }));
  return out;
}
function checkCampaignRules(c) {
  const p = productOf(c);
  if (c.deadline <= Date.now()) throw bad("DEADLINE_IN_PAST", "The deadline must be in the future.");
  if (c.cancellation_cutoff > c.deadline) throw bad("CUTOFF_AFTER_DEADLINE", "The cancellation cutoff must be on or before the deadline.");
  if (c.min_quantity > c.max_quantity) throw bad("MIN_ABOVE_MAX", "The minimum quantity cannot be more than the maximum.");
  if (c.max_quantity > p.stock_quantity) throw bad("NOT_ENOUGH_STOCK", `The product only has ${p.stock_quantity} units in stock.`);
  if (c.min_order_quantity > c.max_quantity) throw bad("MIN_ORDER_ABOVE_MAX", "The minimum order cannot be more than the maximum quantity.");
  if (c.max_per_user != null && (c.max_per_user < c.min_order_quantity || c.max_per_user > c.max_quantity))
    throw bad("INVALID_MAX_PER_USER", "The per-shopper limit must be between the minimum order and the maximum quantity.");
}

function locationFields(body, partial) {
  const opt = { optional: partial };
  const out = {};
  const set = (k, v) => { if (v !== undefined) out[k] = v; };
  set("name", need(body, "name", "str", { ...opt, minLen: 2 }));
  set("delivery_fee", need(body, "delivery_fee", "int", { ...opt, min: 0 }));
  set("collection_point", need(body, "collection_point", "str", { ...opt, minLen: 3 }));
  set("is_active", need(body, "is_active", "bool", { optional: true }));
  if (out.name && db.locations.some((l) => l.name.toLowerCase() === out.name.toLowerCase() && l.id !== body.__id))
    throw new ApiError(409, "LOCATION_EXISTS", "A location with this name already exists.");
  return out;
}

// ----------------------------------------------------------------------------- routes
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/\{(\w+)\}/g, (_, k) => (keys.push(k), "(\\d+)")) + "/?$");
  routes.push({ method, re, keys, handler });
};
const sortBy = (arr, fn) => [...arr].sort((a, b) => fn(a) - fn(b));

// Accounts
route("POST", "/consumers", ({ body }) => [201, register(body, "consumer")]);
route("POST", "/wholesalers", ({ body }) => [201, register(body, "seller")]);
route("POST", "/login", ({ body }) => {
  const email = need(body, "email", "str", { pattern: EMAIL }).toLowerCase();
  const password = need(body, "password", "str");
  const u = db.users.find((x) => x.email === email);
  if (!u || u.password !== password) throw new ApiError(401, "INVALID_CREDENTIALS", "Wrong email or password.");
  return [200, { user: userJson(u), access_token: makeToken(u), token_type: "Bearer" }];
});
route("GET", "/me", ({ req }) => [200, userJson(currentUser(req, { required: true }))]);

// Public catalogue
route("GET", "/locations", () => [200, db.locations.filter((l) => l.is_active).map(locationJson)]);
route("GET", "/campaigns", ({ query }) => {
  const category = query.get("category"), q = query.get("q"), filter = query.get("filter");
  if (category && !CATEGORIES.includes(category)) throw invalid("category", `Must be one of: ${CATEGORIES.join(", ")}.`);
  if (filter && !["ending_soon", "almost_unlocked"].includes(filter)) throw invalid("filter", "Must be one of: ending_soon, almost_unlocked.");
  const now = Date.now();
  let list = db.campaigns.filter((c) => c.status === "active");
  if (category) list = list.filter((c) => productOf(c).category === category);
  if (q) list = list.filter((c) => `${c.title} ${productOf(c).name}`.toLowerCase().includes(q.toLowerCase()));
  if (filter === "ending_soon") list = list.filter((c) => c.deadline > now && c.deadline - now <= 48 * HOUR);
  if (filter === "almost_unlocked") list = list.filter((c) => orderedQty(c) < c.min_quantity);
  return [200, sortBy(list, (c) => c.deadline).map(campaignSummary)];
});
route("GET", "/campaigns/{id}", ({ req, params }) => {
  const u = currentUser(req, { required: false });
  const c = mustGet("campaigns", params.id, "Campaign");
  if (c.status === "draft" && u?.role !== "admin") throw notFound("Campaign not found.");
  return [200, campaignDetail(c, u?.role === "consumer" ? u : null)];
});

// Consumer orders
route("POST", "/orders", ({ req, body }) => [201, orderDetail(placeOrder(requireRole(req, "consumer"), body))]);
route("GET", "/orders", ({ req }) => {
  const u = requireRole(req, "consumer");
  return [200, sortBy(db.orders.filter((o) => o.consumer_id === u.id), (o) => -o.created_at).map(orderSummary)];
});
const myOrder = (req, id) => {
  const u = requireRole(req, "consumer");
  const o = byId("orders", id);
  if (!o || o.consumer_id !== u.id) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  return [u, o];
};
route("GET", "/orders/{id}", ({ req, params }) => [200, orderDetail(myOrder(req, params.id)[1])]);
route("POST", "/orders/{id}/cancel", ({ req, params }) => {
  const [u, o] = myOrder(req, params.id);
  const c = byId("campaigns", o.campaign_id);
  if (!["paid", "confirmed"].includes(o.status)) throw bad("ORDER_NOT_CANCELLABLE", `An order that is ${o.status.replaceAll("_", " ")} cannot be cancelled.`);
  if (Date.now() > c.cancellation_cutoff) throw bad("PAST_CANCELLATION_CUTOFF", "The cancellation cutoff for this order has passed.");
  refundOrder(o, "consumer_cancelled", u.id, Date.now(), "cancelled", "Cancelled by consumer");
  return [200, orderDetail(o)];
});
route("POST", "/orders/{id}/confirm-receipt", ({ req, params }) => {
  const [u, o] = myOrder(req, params.id);
  if (!["dispatched", "ready_for_collection"].includes(o.status)) throw bad("ORDER_NOT_READY", "This order has not been dispatched or made ready for collection yet.");
  o.status = "completed";
  addHistory(o, "completed", "Receipt confirmed by consumer", u.id);
  maybeCompleteCampaign(byId("campaigns", o.campaign_id));
  return [200, orderDetail(o)];
});

// Seller
const sellerOf = (req) => {
  const u = requireRole(req, "seller");
  return [u, profileOfUser(u)];
};
route("GET", "/seller/products", ({ req }) => {
  const [, prof] = sellerOf(req);
  return [200, sortBy(db.products.filter((p) => p.seller_id === prof.id), (p) => -p.id).map(sellerProduct)];
});
route("POST", "/seller/products", ({ req, body }) => {
  const [, prof] = sellerOf(req);
  if (prof.verification_status !== "approved") throw new ApiError(403, "SELLER_NOT_APPROVED", "Your seller account is waiting for approval.");
  const p = {
    id: ++db.ids.products, seller_id: prof.id, source: "seller",
    name: need(body, "name", "str", { minLen: 2 }), description: need(body, "description", "str", { optional: true }) ?? null,
    category: need(body, "category", "str", { oneOf: CATEGORIES }), unit: need(body, "unit", "str", { minLen: 1 }),
    image_url: need(body, "image_url", "str", { optional: true }) ?? null,
    wholesale_price: need(body, "wholesale_price", "int", { min: 1 }), retail_price: need(body, "retail_price", "int", { min: 1 }),
    stock_quantity: need(body, "stock_quantity", "int", { min: 0 }),
    approval_status: "pending", rejection_reason: null, reviewed_by: null, reviewed_at: null, created_at: Date.now(),
  };
  if (p.retail_price <= p.wholesale_price) throw bad("RETAIL_NOT_ABOVE_WHOLESALE", "The shop price must be higher than your wholesale price.");
  db.products.push(p);
  return [201, sellerProduct(p)];
});
route("GET", "/seller/campaigns", ({ req }) => {
  const [, prof] = sellerOf(req);
  const list = db.campaigns.filter((c) => c.status !== "draft" && productOf(c).seller_id === prof.id);
  return [200, sortBy(list, (c) => c.deadline).map(campaignSummary)];
});
route("GET", "/seller/campaigns/{id}/orders", ({ req, params }) => {
  const [, prof] = sellerOf(req);
  const c = byId("campaigns", params.id);
  if (!c || c.status === "draft" || productOf(c).seller_id !== prof.id) throw notFound("Campaign not found.");
  const group = (kind) => {
    const orders = liveOrders(c).filter((o) => o.fulfilment === kind);
    const byLoc = new Map();
    for (const o of orders) {
      const row = byLoc.get(o.location_id) || { location_id: o.location_id, location_name: byId("locations", o.location_id).name, units: 0, order_count: 0 };
      row.units += o.quantity; row.order_count += 1; byLoc.set(o.location_id, row);
    }
    return { total_units: orders.reduce((s, o) => s + o.quantity, 0), order_count: orders.length, locations: sortBy([...byLoc.values()], (r) => -r.units) };
  };
  return [200, { campaign: campaignSummary(c), delivery: group("delivery"), collection: group("collection") }];
});

// Admin: sellers and products
const statusFilter = (query, allowed) => {
  const s = query.get("status");
  if (s && !allowed.includes(s)) throw invalid("status", `Must be one of: ${allowed.join(", ")}.`);
  return s;
};
route("GET", "/admin/sellers", ({ req, query }) => {
  requireRole(req, "admin");
  const s = statusFilter(query, ["pending", "approved", "rejected"]);
  return [200, sortBy(db.profiles.filter((p) => !s || p.verification_status === s), (p) => p.created_at).map(adminSeller)];
});
const review = (row, status, adminId, reason = null) => {
  row.verification_status !== undefined ? (row.verification_status = status) : (row.approval_status = status);
  row.rejection_reason = reason;
  row.reviewed_by = adminId;
  row.reviewed_at = Date.now();
};
route("POST", "/admin/sellers/{id}/approve", ({ req, params }) => {
  const a = requireRole(req, "admin");
  const p = mustGet("profiles", params.id, "Seller");
  if (p.verification_status === "approved") throw bad("ALREADY_APPROVED", "This seller is already approved.");
  review(p, "approved", a.id);
  return [200, adminSeller(p)];
});
route("POST", "/admin/sellers/{id}/reject", ({ req, params, body }) => {
  const a = requireRole(req, "admin");
  const p = mustGet("profiles", params.id, "Seller");
  const reason = need(body, "reason", "str", { minLen: 3 });
  review(p, "rejected", a.id, reason);
  return [200, adminSeller(p)];
});
route("GET", "/admin/products", ({ req, query }) => {
  requireRole(req, "admin");
  const s = statusFilter(query, ["pending", "approved", "rejected"]);
  return [200, sortBy(db.products.filter((p) => !s || p.approval_status === s), (p) => p.created_at || p.id).map(adminProduct)];
});
route("POST", "/admin/products/{id}/approve", ({ req, params }) => {
  const a = requireRole(req, "admin");
  const p = mustGet("products", params.id, "Product");
  if (p.approval_status === "approved") throw bad("ALREADY_APPROVED", "This product is already approved.");
  if (p.seller_id && byId("profiles", p.seller_id).verification_status !== "approved")
    throw bad("SELLER_NOT_APPROVED", "Approve the seller before approving their products.");
  review(p, "approved", a.id);
  return [200, adminProduct(p)];
});
route("POST", "/admin/products/{id}/reject", ({ req, params, body }) => {
  const a = requireRole(req, "admin");
  const p = mustGet("products", params.id, "Product");
  const reason = need(body, "reason", "str", { minLen: 3 });
  review(p, "rejected", a.id, reason);
  return [200, adminProduct(p)];
});

// Admin: campaigns
const CAMPAIGN_STATUSES = ["draft", "active", "successful", "failed", "fulfilling", "completed", "cancelled"];
route("GET", "/admin/campaigns", ({ req, query }) => {
  requireRole(req, "admin");
  const s = statusFilter(query, CAMPAIGN_STATUSES);
  return [200, sortBy(db.campaigns.filter((c) => !s || c.status === s), (c) => -c.created_at).map(adminCampaign)];
});
route("POST", "/admin/campaigns", ({ req, body }) => {
  const a = requireRole(req, "admin");
  const product_id = need(body, "product_id", "int");
  const f = campaignFields(body, false);
  const p = byId("products", product_id);
  if (!p) throw notFound("Product not found.");
  if (p.approval_status !== "approved") throw bad("PRODUCT_NOT_APPROVED", "Only approved products can be used for a campaign.");
  const c = {
    id: ++db.ids.campaigns, product_id, created_by: a.id, campaign_price: p.wholesale_price, platform_charge: PLATFORM_CHARGE,
    min_order_quantity: 1, max_per_user: null, status: "draft", closed_at: null, stock_confirmed_at: null, created_at: Date.now(), ...f,
  };
  if (c.cancellation_cutoff === undefined) c.cancellation_cutoff = c.deadline - 3 * DAY;
  checkCampaignRules(c);
  db.campaigns.push(c);
  return [201, adminCampaign(c)];
});
route("PATCH", "/admin/campaigns/{id}", ({ req, params, body }) => {
  requireRole(req, "admin");
  const c = mustGet("campaigns", params.id, "Campaign");
  if (c.status !== "draft") throw bad("CAMPAIGN_NOT_DRAFT", "Only draft campaigns can be edited.");
  const f = campaignFields(body, true);
  if (!Object.keys(f).length) throw invalid("body", "Send at least one field to change.");
  checkCampaignRules({ ...c, ...f });
  Object.assign(c, f);
  return [200, adminCampaign(c)];
});
route("POST", "/admin/campaigns/{id}/activate", ({ req, params }) => {
  requireRole(req, "admin");
  const c = mustGet("campaigns", params.id, "Campaign");
  if (c.status !== "draft") throw bad("CAMPAIGN_NOT_DRAFT", "Only draft campaigns can be activated.");
  if (c.deadline <= Date.now()) throw bad("DEADLINE_IN_PAST", "The deadline has passed. Edit it before activating.");
  c.status = "active";
  return [200, adminCampaign(c)];
});
route("POST", "/admin/campaigns/{id}/cancel", ({ req, params }) => {
  requireRole(req, "admin");
  const c = mustGet("campaigns", params.id, "Campaign");
  if (!["draft", "active"].includes(c.status)) throw bad("CAMPAIGN_NOT_CANCELLABLE", `A ${c.status} campaign cannot be cancelled.`);
  if (liveOrders(c).length) throw bad("CAMPAIGN_HAS_ORDERS", "Shoppers have joined this campaign. Close it instead, so they are refunded.");
  c.status = "cancelled";
  c.closed_at = Date.now();
  return [200, adminCampaign(c)];
});
route("POST", "/admin/campaigns/{id}/close", ({ req, params }) => {
  const a = requireRole(req, "admin");
  return [200, closeCampaign(mustGet("campaigns", params.id, "Campaign"), a.id)];
});
route("GET", "/admin/campaigns/{id}/orders", ({ req, params }) => {
  requireRole(req, "admin");
  const c = mustGet("campaigns", params.id, "Campaign");
  return [200, sortBy(db.orders.filter((o) => o.campaign_id === c.id), (o) => o.created_at).map(adminOrder)];
});
route("POST", "/admin/campaigns/{id}/orders/status", ({ req, params, body }) => {
  const a = requireRole(req, "admin");
  const c = mustGet("campaigns", params.id, "Campaign");
  const status = need(body, "status", "str", { oneOf: ["preparing", "dispatched", "ready_for_collection"] });
  if (!["successful", "fulfilling"].includes(c.status)) throw bad("CAMPAIGN_NOT_SUCCESSFUL", "Only a successful campaign's orders can be fulfilled.");
  let updated = 0, skipped = 0;
  for (const o of liveOrders(c)) {
    if (nextStatuses(o).includes(status)) { moveOrder(o, status, body.note, a.id); updated++; } else skipped++;
  }
  return [200, { updated, skipped, campaign_status: c.status }];
});
route("POST", "/admin/orders/{id}/status", ({ req, params, body }) => {
  const a = requireRole(req, "admin");
  const o = mustGet("orders", params.id, "Order");
  const status = need(body, "status", "str", { oneOf: ["preparing", "dispatched", "ready_for_collection"] });
  moveOrder(o, status, body.note, a.id);
  return [200, adminOrder(o)];
});

// Admin: locations
route("GET", "/admin/locations", ({ req }) => (requireRole(req, "admin"), [200, db.locations.map((l) => ({ ...locationJson(l), is_active: l.is_active }))]));
route("POST", "/admin/locations", ({ req, body }) => {
  requireRole(req, "admin");
  const l = { id: ++db.ids.locations, is_active: true, ...locationFields(body, false) };
  db.locations.push(l);
  return [201, { ...locationJson(l), is_active: l.is_active }];
});
route("PATCH", "/admin/locations/{id}", ({ req, params, body }) => {
  requireRole(req, "admin");
  const l = mustGet("locations", params.id, "Location");
  const f = locationFields({ ...body, __id: l.id }, true);
  if (!Object.keys(f).length) throw invalid("body", "Send at least one field to change.");
  Object.assign(l, f);
  return [200, { ...locationJson(l), is_active: l.is_active }];
});

// Mock-only helpers
route("POST", "/__reset", () => (seed(), [200, { message: "Mock data reset to the seed state." }]));
route("GET", "/health", () => [200, { status: "ok", database: "mock" }]);

// ----------------------------------------------------------------------------- server
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Prefer",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};
function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const started = Date.now();
  let status, data;
  try {
    let body = {};
    if (raw) {
      try { body = JSON.parse(raw); } catch { throw new ApiError(400, "INVALID_JSON", "The request body is not valid JSON."); }
      if (typeof body !== "object" || Array.isArray(body) || body === null) throw invalid("body", "Expected a JSON object.");
    }
    const matches = routes.filter((r) => r.re.test(path));
    if (!matches.length) throw notFound(`No endpoint ${req.method} ${path}.`);
    const r = matches.find((m) => m.method === req.method);
    if (!r) throw new ApiError(405, "METHOD_NOT_ALLOWED", `${req.method} is not allowed on ${path}.`);
    const m = path.match(r.re);
    const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
    [status, data] = r.handler({ req, body, params, query: url.searchParams });
  } catch (e) {
    if (e instanceof ApiError) [status, data] = [e.status, { error: e.message, code: e.code }];
    else { console.error(e); [status, data] = [500, { error: "Something went wrong in the mock server.", code: "SERVER_ERROR" }]; }
  }
  console.log(`${req.method.padEnd(6)} ${path.padEnd(42)} ${status}  ${Date.now() - started}ms`);
  send(res, status, data);
});

seed();
server.listen(PORT, () => {
  console.log(`Bread & Basket mock API on http://localhost:${PORT}  (also under /api)`);
  console.log(`Log in as cleopas@ (admin), achieng@ (consumer), davy@ (seller), keith@ (pending seller) ... @test.com, password ${PASSWORD}`);
  console.log("POST /__reset to restore the seed data.");
});
