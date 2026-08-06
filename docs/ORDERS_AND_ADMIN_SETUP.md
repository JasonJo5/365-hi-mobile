# Reservations & Staff Admin Panel — Setup Guide

This adds two pieces on top of the existing customer account portal
(`account.html`, see `FIRESTORE_SETUP.md`):

- **`reserve.html`** — customers reserve a plan online (name, phone,
  birthdate, payment method) before coming into the store.
- **`admin.html`** — a staff-only panel that replaces the Google Sheet as
  the day-to-day way customer data gets entered. Staff see today's queue of
  reservations, click **Activate**, add the ARC number, and the customer is
  live in Firestore immediately — no more waiting on the hourly Apps Script
  sync. The same panel handles plan renewals and walk-ins with no online
  reservation at all.

The Google Sheet + Apps Script sync (`google-apps-script-sync.gs`) still
works exactly as before if you want to keep using it for bulk edits or
accounting exports — it's just no longer required for routine sign-ups.

## How it fits together

```
Customer                    Netlify Function              Firestore
--------                    -----------------              ---------
reserve.html  ─────POST───▶ create-order.js        ─────▶  orders/{autoId}
                                                             status: "reserved"

Staff (admin.html)
  Today's Queue ───POST───▶ admin-list-orders.js   ◀─────  orders (read)
  Activate      ───POST───▶ admin-upsert-customer.js ────▶ customers/{phone}
                                                       └──▶ orders/{id} → "activated"
  Customers tab ───POST───▶ admin-search-customers.js ◀──  customers (read)
  Edit/Renew    ───POST───▶ admin-upsert-customer.js ────▶ customers/{phone}
                                                       └──▶ planHistory (archive)
```

Nothing here talks to Firestore directly from the browser — every function
uses the Firebase Admin SDK, same as `lookup-customer.js` already did. The
new functions share two small helper files:

- `netlify/functions/utils/firebase-admin-init.js` — same Admin SDK init
  `lookup-customer.js` uses, pulled out so it isn't duplicated five times.
- `netlify/functions/utils/admin-auth.js` — the shared staff-password check.

## Part 1 — Set the staff password

1. In Netlify: **Site configuration > Environment variables > Add a variable**.
2. Name it `ADMIN_PASSWORD`, value = whatever password staff should use to
   log into `admin.html`. Pick something real — this is the only thing
   standing between the public internet and your customer database.
3. Redeploy. `admin.html` is reachable at your normal site URL
   (`yoursite.com/admin.html`) — nothing links to it publicly, so it's
   "unlisted" rather than truly access-controlled by anything other than
   the password. Consider not linking to it from the main nav.
4. The password is checked on **every** admin request (sent as the
   `x-admin-password` header), not just at login — so changing
   `ADMIN_PASSWORD` and redeploying immediately logs everyone out.

This reuses the same `firebase-admin` npm dependency and
`FIREBASE_SERVICE_ACCOUNT_KEY` env var that `lookup-customer.js` already
needs — if that's already set up per `FIRESTORE_SETUP.md`, there's nothing
new to configure on the Firebase side besides the rules change below.

## Part 2 — Update Firestore rules

`docs/firestore.rules` now has an explicit block denying all client access
to the new `orders` collection (the wildcard deny-all at the bottom already
covered it, but it's spelled out for clarity). Paste the updated file into
Firebase Console > Firestore Database > Rules > Publish, same as before.

## Part 3 — Deploy

Same deploy process as always — Netlify auto-detects everything under
`netlify/functions`. No new npm dependencies were added (the new functions
reuse `firebase-admin`, already in `netlify/functions/package.json`).

## Data model additions

### `orders/{autoId}` — one document per reservation

| Field | Type | Example |
|---|---|---|
| `name` | string | `"Kim Minjun"` |
| `phoneNumber` | string (E.164) | `"+821012345678"` |
| `birthdate` | string (YYYY-MM-DD) | `"1995-03-14"` |
| `planName` | string | `"Plan C"` or `"Korea 30"` |
| `planPrice` | string (display only) | `"₩30,000"` |
| `paymentMethod` | `"cash"` \| `"card"` | `"cash"` |
| `paymentStatus` | `"unpaid"` \| `"paid"` | `"unpaid"` (always, until Toss is added) |
| `status` | `"reserved"` \| `"activated"` | `"reserved"` |
| `createdAt` | timestamp | — |
| `activatedAt` | timestamp (once activated) | — |

`customers/{phoneNumber}` and its `planHistory` subcollection are unchanged
from `FIRESTORE_SETUP.md` — the admin panel writes the exact same fields the
Sheet sync used to.

## Using the admin panel day-to-day

- **Today's Queue** — every reservation with `status: "reserved"`. Search
  by name or phone. Click **Activate**, fill in the ARC number (and confirm
  carrier/SIM type/contract dates), click **Save**. The order disappears
  from the queue and the customer can immediately log into `account.html`.
- **Customers tab** — search an existing customer by phone number (exact
  match) or by name (matches from the start of the name, case-sensitive —
  if a search comes up empty, try the exact capitalization on file). Click
  **Edit / Renew**, change the plan/dates, **Save** — the old plan is
  automatically copied into `planHistory` first, so nothing is lost.
- **+ New** (Customers tab) — for a walk-in who never reserved online at
  all. Same form, blank, phone number is editable.

## About the "Pay Online" option

`reserve.html` shows a disabled "Pay Online" button next to "Pay in Store".
The data model already has a `paymentMethod: "card"` value and a
`paymentStatus` field ready for it, but there's no real Toss Payments
integration yet — building that needs:

1. A Toss Payments merchant account and API keys (client key + secret key).
2. A new Netlify function to create a Toss payment session server-side
   (the secret key must never reach the browser).
3. A webhook/confirmation function Toss calls back once payment succeeds,
   which would flip that order's `paymentStatus` to `"paid"`.

None of that is built yet — enable the button in `reserve.html` and wire
these up once you have Toss credentials.

## Security notes

- Same PIPA note as `FIRESTORE_SETUP.md`: `orders` holds names, phone
  numbers, and birthdates, so treat it with the same care as `customers`.
- The shared admin password is a "keeps casual people out" control, not a
  hardened auth system — see the comment at the top of
  `netlify/functions/utils/admin-auth.js` for the tradeoff and the upgrade
  path (per-staff Firebase Auth accounts) if you need something stronger
  later.
- Consider not linking `admin.html` from anywhere public, and treating its
  URL itself as semi-secret in addition to the password.
