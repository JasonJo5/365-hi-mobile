# README addition — Reservations & Staff Admin Panel

Add this to the "Project structure" and "What's included" sections of the
existing `README.md`.

## New files

```
├── reserve.html                        # Customer plan reservation page
├── reserve.js                          # Reservation form logic
├── admin.html                          # Staff-only admin panel (queue, activation, renewals)
├── admin.js                            # Admin panel logic
├── netlify/functions/
│   ├── create-order.js                 # Public: customer submits a reservation
│   ├── admin-verify.js                 # Staff: login check
│   ├── admin-list-orders.js            # Staff: today's queue
│   ├── admin-search-customers.js       # Staff: search existing customers
│   ├── admin-upsert-customer.js        # Staff: activate order / renew / new customer
│   └── utils/
│       ├── firebase-admin-init.js      # Shared Admin SDK init
│       └── admin-auth.js               # Shared staff-password check
└── docs/
    └── ORDERS_AND_ADMIN_SETUP.md       # Full setup guide for the above
```

## What's included (new bullet points)

- **Plan reservations (`reserve.html`)** — customers reserve a plan online
  (name, phone, birthdate, cash-in-store or card — card is stubbed pending
  Toss Payments setup) instead of only being able to message the shop.
  Reachable via a new "Reserve Online" button in the existing plan-select
  modal on the main site.
- **Staff admin panel (`admin.html`)** — password-protected page where staff
  see today's reservation queue, activate customers by adding the ARC number
  collected in person, and search/renew existing customers' plans (which
  automatically archives the old plan into their history). Replaces the
  Google Sheet + Apps Script sync for day-to-day sign-ups; the Sheet sync
  still works if you want to keep it for bulk edits or accounting.

Full setup: **`docs/ORDERS_AND_ADMIN_SETUP.md`**.
