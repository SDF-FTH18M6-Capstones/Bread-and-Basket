# Bread & Basket: Demo Script

**Length:** about 10 minutes, plus questions <!-- TODO: confirm time slot -->
**Story:** one campaign, seen from all three sides: a wholesaler supplies it, an admin runs it, a shopper buys from it.

| Part | Presenter | Time |
|------|-----------|------|
| 0. Intro and setup | <!-- name --> | 1 min |
| 1. Wholesaler path | <!-- name --> | 2 min |
| 2. Admin path | <!-- name --> | 3 min |
| 3. Shopper path | <!-- name --> | 3 min |
| 4. Wrap-up and questions | <!-- name --> | 1 min + Q&A |

---

## Before the demo (do this 30 minutes before)

- [ ] Pull the latest `main` on the demo laptop
- [ ] Reset the database to a fresh seed:
  ```bash
  cd backend
  source venv/bin/activate
  flask db upgrade
  python seed.py
  flask run
  ```
- [ ] Start the frontend in a second terminal: `npm run dev`
- [ ] Open these tabs, logged in, in this order:
  1. Wholesaler: <!-- seed email -->
  2. Admin: <!-- seed email -->
  3. Shopper: <!-- seed email -->
  4. Landing page, logged out
- [ ] Phone with M-Pesa sandbox / test number ready <!-- TODO: confirm how payment is demoed -->
- [ ] Screen recording and screenshots folder open in the background (see Fallback)
- [ ] Laptop charged, notifications off, browser zoom at 125%

---

## 0. Intro and setup (1 min)

**Say:** "Bread & Basket lets neighbours buy together. Local sellers run live campaigns, shoppers join and pay with M-Pesa, and the order is delivered or collected once the campaign closes. We'll follow one campaign from all three sides."

**Show:** the landing page, logged out. Point out that you can browse live campaigns without an account.

---

## 1. Wholesaler path (2 min)

**Switch to:** the Wholesaler tab.

1. **Submit a product.** Fill in name, price, photo, then submit.
   **Say:** "A wholesaler lists a product. It doesn't go live until an admin approves it."
2. **See a campaign's orders by delivery and collection.** Open a campaign that already has orders from the seed data.
   **Say:** "Here the wholesaler sees exactly what to pack, split into home delivery and pick-up."

---

## 2. Admin path (3 min)

**Switch to:** the Admin tab.

1. **Approve a seller and a product.** Approve the product the wholesaler just submitted.
2. **Create and activate a campaign** using that product. Set a target and an end date.
   **Say:** "A campaign only succeeds if enough people join before it closes."
3. **Close a failing campaign and show the automatic refunds.** Pick the seeded campaign that's below target, close it, and show the refund status on its orders.
   **Say:** "If a campaign fails, nobody loses money. Refunds go out automatically."
4. **Move orders through fulfilment.** On a successful campaign, move an order from *Paid* → *Packed* → *Out for delivery* / *Ready for collection* → *Completed*.

---

## 3. Shopper path (3 min)

**Switch to:** the Shopper tab.

1. **Browse** live campaigns and open the one the admin just activated.
2. **Join the campaign** and choose delivery or collection.
3. **Pay** with M-Pesa.
   **Say:** "Payment is by M-Pesa, the way people here actually pay."
4. **Track the order.** Open *My orders* and show the progress steps.
5. **Cancel one order.** Cancel a different, still-cancellable order from the seed data and show the refund note.

---

## 4. Wrap-up (1 min)

**Say:** "So that's one campaign end to end: the wholesaler supplies it, the admin runs it, the shopper buys from it, and if it fails everyone is refunded automatically. Built with Flask and React. Happy to take questions."

---

## Fallback plan

| If… | Then… |
|-----|-------|
| **Wi-Fi fails** | Switch the frontend to mock data: set `VITE_USE_MOCKS=true` in `.env`, restart `npm run dev`, and continue. Say "we're on mock data now" and keep going. |
| **M-Pesa payment hangs** | Don't wait more than 10 seconds. Show the screenshot of a completed payment, then carry on from *My orders*. |
| **The demo laptop fails** | Play the screen recording from the backup laptop or a phone, and narrate over it. |
| **One step breaks** | Say "let me show you what that looks like", open the screenshot for that step, and move to the next step. |

**Prepare beforehand:**
- [ ] A screen recording of the full run, start to finish (saved on two devices)
- [ ] Screenshots of every numbered step above, in one folder, named in order (`01-landing.png`, `02-submit-product.png`, …)

---

## Rehearsal log

Run the whole script start to finish from a freshly seeded database, timed.

| # | Date | Total time | What went wrong | Fixed? |
|---|------|-----------|-----------------|--------|
| 1 | | | | |
| 2 | | | | |