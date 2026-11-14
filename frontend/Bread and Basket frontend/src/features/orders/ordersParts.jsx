import { useState } from 'react'
import {
  CATEGORY_ICON, REFUND_REASON, TONES,
  formatDateTime, formatMoney, formatRelative, imageUrl, progressSteps, statusOf, withArea,
} from './orders'

/* Shared pieces for the orders list and the order tracking page */

export const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2'
export const btnSuccess =
  'inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2'
export const btnDanger =
  'inline-flex items-center justify-center rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-red-700 hover:border-red-700 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700'

export function StatusBadge({ status, className = '' }) {
  const st = statusOf(status)
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[st.tone]} ${className}`}>
      {st.label}
    </span>
  )
}

export function ProductThumb({ product, faded = false, large = false }) {
  const [broken, setBroken] = useState(false)
  const src = imageUrl(product.image_url)
  const size = large ? 'h-20 w-20 sm:h-24 sm:w-24 text-4xl' : 'h-[52px] w-[52px] sm:h-16 sm:w-16 text-2xl sm:text-3xl'
  const base = `${size} shrink-0 rounded-xl ${faded ? 'opacity-60 grayscale' : ''}`
  if (src && !broken) {
    return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={`${base} object-cover`} />
  }
  return (
    <div aria-hidden="true" className={`${base} grid place-items-center bg-orange-100`}>
      {CATEGORY_ICON[product.category] || '🧺'}
    </div>
  )
}

export function ProgressSteps({ order }) {
  const steps = progressSteps(order)
  const done = order.status === 'completed'
  const current = Math.max(0, steps.findIndex((s) => s.key === order.status))
  return (
    <ol aria-label="Order progress" className="mt-2 grid grid-cols-5">
      {steps.map((s, i) => {
        const complete = done || i < current
        const isNow = !done && i === current
        return (
          <li key={s.key} aria-current={isNow ? 'step' : undefined} className="relative pt-5 text-center text-[11px] sm:text-xs">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-2.5 h-0.5 w-full ${complete || isNow ? 'bg-emerald-600' : 'bg-stone-200'}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-1/2 top-1 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 ${
                complete
                  ? 'border-emerald-600 bg-emerald-600'
                  : isNow
                    ? 'border-emerald-600 bg-white ring-4 ring-emerald-100'
                    : 'border-stone-300 bg-white'
              }`}
            />
            <span className={complete ? 'text-stone-900' : isNow ? 'font-semibold text-stone-900' : 'text-stone-400'}>
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function DriveProgress({ campaign: c, now }) {
  if (c.status === 'successful') {
    return (
      <p className="rounded-xl bg-stone-100 px-3.5 py-3 text-sm">
        🎉 This drive reached its target. Your order will be prepared soon.
      </p>
    )
  }
  if (c.status !== 'active') return null

  const max = Math.max(1, c.max_quantity)
  const pct = Math.min(100, (c.ordered_quantity / max) * 100)
  const minPct = Math.min(100, (c.min_quantity / max) * 100)
  const needed = Math.max(0, c.min_quantity - c.ordered_quantity)
  const closes = new Date(c.deadline) > now ? `closes ${formatRelative(c.deadline, now)}` : 'closed'
  const headline = c.sold_out
    ? 'This drive is sold out and going ahead.'
    : c.min_reached
      ? 'Minimum reached. This drive is going ahead.'
      : `${needed} more needed by ${formatDateTime(c.deadline)} for this drive to go ahead. If it doesn't get there, you're refunded automatically.`

  return (
    <div className="rounded-xl bg-stone-100 px-3.5 py-3">
      <p className="text-sm">{headline}</p>
      <div
        role="progressbar"
        aria-label="Units ordered in this drive"
        aria-valuemin={0}
        aria-valuemax={c.max_quantity}
        aria-valuenow={c.ordered_quantity}
        aria-valuetext={`${c.ordered_quantity} of ${c.max_quantity} ordered, ${c.min_quantity} needed`}
        className="relative mt-2.5 h-2 rounded-full bg-stone-200"
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${c.min_reached ? 'bg-emerald-600' : 'bg-orange-600'}`}
          style={{ width: `${pct}%` }}
        />
        <div
          title={`Minimum: ${c.min_quantity}`}
          className="absolute -bottom-1 -top-1 w-0.5 bg-stone-500"
          style={{ left: `${minPct}%` }}
        />
      </div>
      <p className="mt-2 text-[13px] text-stone-500">
        {c.households} household{c.households === 1 ? '' : 's'} joined · {c.ordered_quantity} of {c.max_quantity} ×{' '}
        {c.product.unit} ordered · {closes}
      </p>
    </div>
  )
}

export function Fulfilment({ order: o }) {
  const delivery = o.fulfilment === 'delivery'
  const highlight = o.status === (delivery ? 'dispatched' : 'ready_for_collection')
  const label = delivery ? 'Delivery to' : highlight ? 'Ready to collect at' : 'Collect from'
  const place = delivery
    ? withArea(o.delivery_address, o.location.name)
    : withArea(o.location.collection_point, o.location.name)
  return (
    <div className={`flex gap-2.5 text-sm ${highlight ? 'rounded-xl bg-emerald-50 px-3 py-2.5' : ''}`}>
      <span aria-hidden="true" className="w-5 shrink-0 text-center">{delivery ? '🚚' : '📍'}</span>
      <div>
        <span className="block text-xs text-stone-500">{label}</span>
        {place}
      </div>
    </div>
  )
}

export function RefundNote({ order }) {
  const r = order.refund
  return (
    <div className="border-l-[3px] border-stone-200 py-0.5 pl-3 text-sm">
      {r ? (
        <>
          {REFUND_REASON[r.reason] || 'Order cancelled'}. {r.automatic ? 'Refunded automatically' : 'Refunded'}{' '}
          <b className="tabular-nums">{formatMoney(r.amount)}</b>.
          <span className="block text-[13px] text-stone-500">Processed {formatDateTime(r.processed_at)}</span>
        </>
      ) : (
        "Refund pending. We'll update this order once it's processed."
      )}
    </div>
  )
}

export function Loading({ count = 3, height = 'h-44' }) {
  return (
    <div className="mt-6 grid gap-4" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-2xl bg-stone-200`} />
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, text, children }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center">
      {icon && <div aria-hidden="true" className="mb-2 text-4xl">{icon}</div>}
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="mb-5 mt-1.5 text-stone-500">{text}</p>
      {children}
    </div>
  )
}

export function ErrorState({ error, loginUrl, onRetry, backUrl }) {
  const signedOut = error.status === 401
  const forbidden = error.status === 403
  const notFound = error.status === 404
  return (
    <div role="alert">
      <EmptyState
        icon={signedOut ? '🔑' : forbidden ? '🚫' : notFound ? '🔍' : '🧺'}
        title={
          signedOut ? 'You’re signed out'
            : forbidden ? 'Not available for this account'
              : notFound ? 'Order not found'
                : 'Something went wrong'
        }
        text={error.message}
      >
        {signedOut && <a href={loginUrl} className={btnPrimary}>Log in</a>}
        {notFound && backUrl && <a href={backUrl} className={btnPrimary}>Back to my orders</a>}
        {!signedOut && !forbidden && !notFound && onRetry && (
          <button type="button" onClick={onRetry} className={btnPrimary}>Try again</button>
        )}
      </EmptyState>
    </div>
  )
}

export function DemoNote() {
  return (
    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Showing sample orders. This page isn't connected to the API.
    </p>
  )
}