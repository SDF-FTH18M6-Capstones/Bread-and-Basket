// Shared helpers for the orders pages: API calls, labels, formatting, demo data.

/* ---------------- Settings ---------------- */
export const API_BASE = '/api' // proxy /api to http://localhost:5000 in vite.config.js
const LOCALE = 'en-KE'
const TIME_ZONE = 'Africa/Nairobi'

export function getToken() {
  // Change this if your login stores the JWT under another key
  try {
    return localStorage.getItem('access_token') || localStorage.getItem('token')
  } catch {
    return null
  }
}

export const isDemoUrl = () => new URLSearchParams(window.location.search).has('demo')

/* ---------------- Formatting ---------------- */
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'KES', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE,
})
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

export const formatMoney = (n) => money.format(Number(n) || 0)
export const formatDateTime = (iso) => (iso ? dateTime.format(new Date(iso)) : '')

export function formatRelative(iso, now) {
  const diff = new Date(iso) - now
  const abs = Math.abs(diff)
  const HOUR = 36e5
  const DAY = 864e5
  if (abs < HOUR) return relative.format(Math.round(diff / 6e4), 'minute')
  if (abs < 2 * DAY) return relative.format(Math.round(diff / HOUR), 'hour')
  return relative.format(Math.round(diff / DAY), 'day')
}

// Avoid "Kasarani, Kasarani" when the address already names the area
export function withArea(text, area) {
  if (!text) return area || ''
  if (!area || text.toLowerCase().includes(area.toLowerCase())) return text
  return `${text}, ${area}`
}

export function imageUrl(path) {
  if (!path) return null
  try {
    return new URL(path, new URL(API_BASE, window.location.href)).href
  } catch {
    return path
  }
}

/* ---------------- Order rules ---------------- */
export const TONES = {
  info: 'bg-sky-100 text-sky-800',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
  neutral: 'bg-stone-200 text-stone-600',
  danger: 'bg-red-100 text-red-700',
}

export const ORDER_STATUS = {
  paid: { label: 'Paid', tone: 'info', group: 'active' },
  confirmed: { label: 'Confirmed', tone: 'info', group: 'active' },
  preparing: { label: 'Being prepared', tone: 'warning', group: 'active' },
  dispatched: { label: 'Out for delivery', tone: 'warning', group: 'active' },
  ready_for_collection: { label: 'Ready to collect', tone: 'success', group: 'active' },
  completed: { label: 'Completed', tone: 'neutral', group: 'completed' },
  cancelled: { label: 'Cancelled', tone: 'danger', group: 'closed' },
  refunded: { label: 'Refunded', tone: 'danger', group: 'closed' },
}
export const statusOf = (s) => ORDER_STATUS[s] || { label: String(s), tone: 'neutral', group: 'active' }

// Wording for the status history timeline
export const HISTORY_TEXT = {
  paid: 'Payment received',
  confirmed: 'Order confirmed',
  preparing: 'Being prepared',
  dispatched: 'Out for delivery',
  ready_for_collection: 'Ready to collect',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const CATEGORY_ICON = {
  vegetables: '🥬', fruits: '🍎', rice_grains: '🌾', flour: '🍞',
  cooking_oil: '🫒', sugar: '🍬', pulses: '🫘', dairy_eggs: '🥚',
}

export const REFUND_REASON = {
  consumer_cancelled: 'You cancelled this order',
  campaign_failed: "The drive didn't reach its minimum",
}

export function progressSteps(order) {
  const delivery = order.fulfilment === 'delivery'
  return [
    { key: 'paid', label: 'Paid' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'preparing', label: 'Preparing' },
    delivery ? { key: 'dispatched', label: 'On the way' } : { key: 'ready_for_collection', label: 'Ready' },
    { key: 'completed', label: delivery ? 'Delivered' : 'Collected' },
  ]
}

// Server's can_cancel already checks the cutoff; re-check in case the page was left open
export const canCancelNow = (order, now) => Boolean(order.can_cancel) && new Date(order.cancellation_cutoff) > now
// confirm-receipt is allowed once the order is dispatched or ready_for_collection
export const canConfirmReceipt = (order) => order.status === 'dispatched' || order.status === 'ready_for_collection'

/* ---------------- API ---------------- */
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', signal } = {}) {
  const token = getToken()
  if (!token) throw new ApiError(401, 'Please log in to see your orders.', 'UNAUTHORIZED')

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, "We couldn't reach Bread & Basket. Check your connection and try again.")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const fallback =
      res.status === 401 ? 'Please log in again.'
        : res.status === 403 ? 'Only consumer accounts can do this.'
          : res.status === 404 ? "We couldn't find that order."
            : 'Something went wrong. Please try again.'
    throw new ApiError(res.status, body.error || fallback, body.code)
  }
  return res.json()
}

/** GET /orders — the caller's orders, newest first */
export async function fetchMyOrders({ signal } = {}) {
  if (isDemoUrl()) return demo.list()
  const data = await request('/orders', { signal })
  if (!Array.isArray(data)) throw new ApiError(200, 'The server sent an unexpected response.')
  return data
}

/** GET /orders/{order_id} — one order with payment and status history */
export function fetchOrder(orderId, { signal } = {}) {
  if (isDemoUrl()) return demo.get(orderId)
  return request(`/orders/${encodeURIComponent(orderId)}`, { signal })
}

/** POST /orders/{order_id}/cancel — returns the cancelled order with its refund */
export function cancelOrder(orderId) {
  if (isDemoUrl()) return demo.cancel(orderId)
  return request(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' })
}

/** POST /orders/{order_id}/confirm-receipt — returns the completed order */
export function confirmReceipt(orderId) {
  if (isDemoUrl()) return demo.confirm(orderId)
  return request(`/orders/${encodeURIComponent(orderId)}/confirm-receipt`, { method: 'POST' })
}

// Strip the detail-only fields so list items look like GET /orders items
export function toSummary(order) {
  const { unit_price, platform_charge, logistics_charge, payment, history, ...summary } = order
  return summary
}

/* ---------------- Demo mode (?demo) — sample data from the API docs ---------------- */
export const SAMPLE_NOW = new Date('2026-11-12T12:00:00+03:00')

const rice = {
  id: 1, title: 'Rice November Drive', status: 'active', campaign_price: 130,
  min_quantity: 20, max_quantity: 200, deadline: '2026-11-16T18:00:00+03:00',
  ordered_quantity: 36, households: 4, min_reached: true, sold_out: false, savings_per_unit: 40,
  product: { id: 1, name: 'Pishori rice', unit: '1kg', category: 'rice_grains', image_url: '/uploads/pishori-rice.webp', retail_price: 170 },
}

const SAMPLE_DETAILS = [
  {
    id: 3, order_no: 'ODR-10003', status: 'paid', quantity: 5,
    unit_price: 130, platform_charge: 10, logistics_charge: 150, total_amount: 850,
    fulfilment: 'delivery', delivery_address: 'Mwiki Road, Apartment 4B, Kasarani',
    created_at: '2026-11-12T10:30:00+03:00', cancellation_cutoff: '2026-11-13T18:00:00+03:00',
    can_cancel: true, refund: null,
    location: { id: 2, name: 'Kasarani', delivery_fee: 150, collection_point: 'Mwiki Road pickup point, next to Seasons stage' },
    campaign: rice,
    payment: { reference: 'QGH7X2K9LM', status: 'successful', amount: 850, paid_at: '2026-11-12T10:30:42+03:00' },
    history: [{ status: 'paid', note: null, created_at: '2026-11-12T10:30:42+03:00' }],
  },
  {
    id: 2, order_no: 'ODR-10002', status: 'cancelled', quantity: 3,
    unit_price: 130, platform_charge: 10, logistics_charge: 0, total_amount: 420,
    fulfilment: 'collection', delivery_address: null,
    created_at: '2026-11-12T10:00:00+03:00', cancellation_cutoff: '2026-11-13T18:00:00+03:00',
    can_cancel: false,
    refund: { amount: 420, reason: 'consumer_cancelled', automatic: false, processed_at: '2026-11-12T11:05:00+03:00' },
    location: { id: 1, name: 'Nairobi CBD', delivery_fee: 100, collection_point: 'Moi Avenue pickup desk, opposite Kenya Archives' },
    campaign: rice,
    payment: { reference: 'QGH5T8P2RD', status: 'refunded', amount: 420, paid_at: '2026-11-12T10:00:31+03:00' },
    history: [
      { status: 'paid', note: null, created_at: '2026-11-12T10:00:31+03:00' },
      { status: 'cancelled', note: 'Cancelled by customer', created_at: '2026-11-12T11:05:00+03:00' },
    ],
  },
  {
    id: 1, order_no: 'ODR-10001', status: 'ready_for_collection', quantity: 2,
    unit_price: 450, platform_charge: 10, logistics_charge: 0, total_amount: 920,
    fulfilment: 'collection', delivery_address: null,
    created_at: '2026-11-03T09:15:00+03:00', cancellation_cutoff: '2026-11-07T18:00:00+03:00',
    can_cancel: false, refund: null,
    location: { id: 3, name: 'Westlands', delivery_fee: 150, collection_point: 'Woodvale Grove pickup desk, ground floor' },
    campaign: {
      id: 7, title: 'Tomato Crate Share (early November)', status: 'fulfilling', campaign_price: 450,
      min_quantity: 15, max_quantity: 40, deadline: '2026-11-08T18:00:00+03:00',
      ordered_quantity: 17, households: 4, min_reached: true, sold_out: false, savings_per_unit: 150,
      product: { id: 13, name: 'Tomatoes', unit: '5kg crate', category: 'vegetables', image_url: null, retail_price: 600 },
    },
    payment: { reference: 'QGC2M4N8ZT', status: 'successful', amount: 920, paid_at: '2026-11-03T09:15:30+03:00' },
    history: [
      { status: 'paid', note: null, created_at: '2026-11-03T09:15:30+03:00' },
      { status: 'confirmed', note: 'Drive reached its minimum', created_at: '2026-11-08T18:00:00+03:00' },
      { status: 'preparing', note: null, created_at: '2026-11-10T08:30:00+03:00' },
      { status: 'ready_for_collection', note: 'Bring your order number', created_at: '2026-11-11T14:00:00+03:00' },
    ],
  },
]

const demo = (() => {
  let store = null
  const db = () => (store ??= JSON.parse(JSON.stringify(SAMPLE_DETAILS)))
  const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms))
  const find = (id) => {
    const o = db().find((x) => String(x.id) === String(id))
    if (!o) throw new ApiError(404, "We couldn't find that order.", 'NOT_FOUND')
    return o
  }
  const copy = (x) => JSON.parse(JSON.stringify(x))
  return {
    async list() { await wait(300); return copy(db().map(toSummary)) },
    async get(id) { await wait(300); return copy(find(id)) },
    async cancel(id) {
      await wait()
      const o = find(id)
      if (!canCancelNow(o, SAMPLE_NOW)) throw new ApiError(400, 'This order can no longer be cancelled.', 'CANNOT_CANCEL')
      const at = SAMPLE_NOW.toISOString()
      Object.assign(o, {
        status: 'cancelled', can_cancel: false,
        refund: { amount: o.total_amount, reason: 'consumer_cancelled', automatic: false, processed_at: at },
        payment: { ...o.payment, status: 'refunded' },
      })
      o.history.push({ status: 'cancelled', note: 'Cancelled by customer', created_at: at })
      return copy(o)
    },
    async confirm(id) {
      await wait()
      const o = find(id)
      if (!canConfirmReceipt(o)) throw new ApiError(400, "This order can't be marked as received yet.", 'CANNOT_CONFIRM')
      o.status = 'completed'
      o.history.push({ status: 'completed', note: 'Receipt confirmed by customer', created_at: SAMPLE_NOW.toISOString() })
      return copy(o)
    },
  }
})()