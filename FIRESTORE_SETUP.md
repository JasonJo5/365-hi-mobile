# Customer Account Portal — Setup Guide

This explains how the "My Account" feature (`account.html`) works, how to set up
the Firebase project + Netlify function it depends on, and how to keep your
customer data updated day-to-day using a spreadsheet.

## Why this design

Customers can only ever see **their own** contract info — never anyone else's,
and never the raw spreadsheet. A customer confirms their identity by entering
the phone number **and** birthdate on file; a Netlify serverless function
checks both against Firestore server-side and only returns data on a match.
Firestore's own security rules (`firestore.rules`) deny **all** direct reads
from the browser, so the Netlify function is the only path to this data.

Data entry stays spreadsheet-based for you (Google Sheets, not Tencent Docs —
see "Why Google Sheets and not 腾讯文档" below), synced into Firestore with a
script. You never manually touch Firestore for routine updates.

### A note on how secure this actually is

This checks a phone number + birthdate — a shared secret, not something
verified out-of-band (like the SMS code the previous version of this portal
used). That means:

- **No Firebase Phone Auth, no Blaze (pay-as-you-go) plan, no per-login SMS
  cost.** Everything here runs on Firestore's free Spark plan and Netlify's
  free tier.
- **The tradeoff:** anyone who knows or correctly guesses a customer's phone
  number *and* birthdate can see that customer's plan info. For most people
  a birthdate isn't a strong secret (family members, coworkers, or anyone
  who's seen an ID often know it), so treat this as "keeps casual/curious
  people out," not "cryptographically secure."
- Because birthdates, ARC numbers, and phone numbers count as sensitive
  personal data under Korea's PIPA, it's worth a quick check with a
  compliance-savvy contact before relying on this for real customer data at
  scale — same note as before, just worth repeating now that the access
  control model changed.
- If you want stronger guarantees later, re-adding Firebase Phone Auth (SMS
  verification) on top of this is the natural upgrade path — the Firestore
  data model here doesn't need to change for that.

---

## Part 1 — Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**. Name it something like `365-hi-mobile`.
2. Once created, click the **web icon (`</>`)** to register a web app. Copy the config object it shows you (`apiKey`, `authDomain`, etc.) — this is only used by the customer **reviews** feature on the main site now (see `script.js`); the account portal no longer talks to Firebase from the browser at all.
3. Paste those values into `firebase-config.js` in your project folder, replacing the `YOUR_...` placeholders.

## Part 2 — Enable Firestore

1. In the Firebase Console, go to **Build > Firestore Database > Create database**.
2. Choose **Production mode** (not test mode — we'll paste in real rules next).
3. Pick a region close to Korea (e.g. `asia-northeast3` — Seoul).
4. Once created, go to the **Rules** tab, and paste in the contents of `docs/firestore.rules` from this project. Click **Publish**. These rules deny all client reads/writes — only the Netlify function (using the Admin SDK) and your Google Sheets sync script can touch this data.

## Part 3 — Set up the Netlify lookup function

The account portal calls a small server-side function (`netlify/functions/lookup-customer.js`) instead of talking to Firebase directly from the browser.

1. **Get a service account key:** Firebase Console > Project Settings (gear icon) > **Service accounts** tab > **Generate new private key**. This downloads a JSON file — keep it private, never share it or commit it anywhere public.
2. **Add it to Netlify:** In your Netlify site dashboard, go to **Site configuration > Environment variables > Add a variable**. Name it `FIREBASE_SERVICE_ACCOUNT_KEY`, and paste the *entire contents* of the JSON file you downloaded as the value.
3. **Deploy.** Netlify auto-detects `netlify/functions` (see `netlify.toml`) and installs the dependency listed in `netlify/functions/package.json` (`firebase-admin`) automatically on a normal Git-connected or CLI deploy. If you instead deploy by dragging a folder to Netlify's Deploys tab, make sure you've run `npm install` inside `netlify/functions` first so `node_modules` is included in what you drag over.
4. Once deployed, the function is reachable at `/.netlify/functions/lookup-customer` — `account.js` already calls this path, so there's nothing else to wire up.

You can sanity-check it's live by opening your site's Netlify dashboard > **Functions** tab — `lookup-customer` should be listed there after a successful deploy.

## Part 4 — Data model

Each customer is one document in a `customers` collection. **The document ID
is their phone number in E.164 format** (e.g. `+821012345678`) — this is what
the Netlify function looks up directly, and it's also what makes browsing/
enumeration impossible from the client (there's no "list all customers"
permission and no client access at all).

### `customers/{phoneNumber}` — fields

| Field | Type | Example |
|---|---|---|
| `name` | string | `"Kim Minjun"` |
| `phoneNumber` | string | `"+821012345678"` |
| `birthdate` | string (YYYY-MM-DD) | `"1995-03-14"` |
| `arcNumber` | string | `"123456-7890123"` |
| `country` | string | `"Indonesia"` |
| `carrier` | string | `"SKT"` / `"KT"` / `"LG U+"` |
| `simType` | string | `"eSIM"` / `"Physical SIM"` |
| `currentPlanName` | string | `"Plan C"` |
| `contractStart` | string (YYYY-MM-DD) | `"2026-01-15"` |
| `contractEnd` | string (YYYY-MM-DD) | `"2026-07-15"` |
| `firstPurchaseDate` | string (YYYY-MM-DD) | `"2025-06-01"` |

The `birthdate` field is what the login flow now checks against — make sure
it's filled in correctly for every customer, in `YYYY-MM-DD` format, or they
won't be able to log in.

### `customers/{phoneNumber}/planHistory/{autoId}` — subcollection (the "archive")

Every time a customer's plan changes, **before** updating their `currentPlanName`
etc. on the main document, copy the old plan info into a new document in this
subcollection. That's your archive — old plans stay queryable per-customer,
without cluttering the "current state" view.

| Field | Type | Example |
|---|---|---|
| `planName` | string | `"Plan A"` |
| `carrier` | string | `"KT"` |
| `simType` | string | `"Physical SIM"` |
| `startDate` | string (YYYY-MM-DD) | `"2025-06-01"` |
| `endDate` | string (YYYY-MM-DD) | `"2026-01-14"` |

---

## Part 5 — Day-to-day data entry (Google Sheets → Firestore sync)

### Why Google Sheets and not 腾讯文档

Tencent Docs is great for internal collaboration, but it doesn't have an open
API you can script against outside the Tencent/WeCom ecosystem — so there's no
reliable way to automatically sync it into Firestore. Google Sheets has a
first-class scripting layer (**Apps Script**) built in, is free, and the sync
script in this project (`docs/google-apps-script-sync.gs`) is designed to
attach directly to it. The day-to-day experience is nearly identical to Excel.

### Set it up

1. Create a Google Sheet with these column headers in row 1:

   ```
   phoneNumber | name | birthdate | arcNumber | country | carrier | simType | currentPlanName | contractStart | contractEnd | firstPurchaseDate
   ```

   Use `+82...` format for `phoneNumber`, and `YYYY-MM-DD` for all date columns — including `birthdate`, since that's now the login check.

2. In the Sheet, go to **Extensions > Apps Script**. Delete the placeholder code and paste in the contents of `docs/google-apps-script-sync.gs`.

3. You'll need a **Firebase service account key** so the script can write to Firestore with admin access (bypassing the read-only client rules). You can reuse the same key you generated in Part 3, or generate a separate one:
   - Firebase Console > Project Settings (gear icon) > **Service accounts** tab > **Generate new private key**. This downloads a JSON file — keep it private, never share it or commit it anywhere public.
   - In the Apps Script editor, go to **Project Settings > Script Properties**, and add the key/value pairs described in the comments at the top of `google-apps-script-sync.gs`.

4. Run the `syncToFirestore` function once manually (Apps Script will ask you to authorize it). After that, you can either re-run it manually whenever you update the sheet, or set up a time-based trigger (Apps Script > Triggers) to run it automatically every hour/day.

### Handling plan changes (the archive)

When a customer switches plans, **don't just overwrite their row** — add their
old plan details to a second sheet tab named `PlanHistory` first:

```
phoneNumber | planName | carrier | simType | startDate | endDate
```

The sync script reads both tabs: it updates `customers/{phone}` from the main
sheet, and appends any new `PlanHistory` rows into that customer's
`planHistory` subcollection.

---

## Part 6 — Try it out

1. Fill in `firebase-config.js` (Part 1) — only needed for the reviews widget now, but harmless to leave filled in either way.
2. Set `FIREBASE_SERVICE_ACCOUNT_KEY` on Netlify (Part 3) and deploy.
3. Add at least one row to your Google Sheet with **your own phone number and real birthdate**, then run the sync script.
4. Open `account.html` on your deployed Netlify site (the lookup function only works when deployed on Netlify, not when opening the file directly or via Live Server locally — see "Testing locally" below), enter your phone number, then your birthdate, and confirm the dashboard renders correctly.

### Testing locally

Since the login flow now depends on a Netlify Function, opening `account.html` directly (or via VS Code Live Server) won't be able to reach `/.netlify/functions/lookup-customer` — that path only exists once deployed to Netlify (or run locally via the Netlify CLI's `netlify dev`, which proxies function requests for you). For quick local testing of everything *except* login, Live Server still works fine; for testing the actual login flow, either use the deployed Netlify URL or run `netlify dev` from the project folder.

---

## Security notes

- The website (client-side code) can no longer read Firestore **at all** —
  every read goes through the Netlify function, which uses the Admin SDK and
  isn't subject to the (now fully locked-down) client rules.
- The lookup function returns the same generic "not found" response whether
  the phone number doesn't exist or the birthdate was wrong, so the UI can't
  be used to enumerate which customers exist.
- ARC numbers are masked on the dashboard by default (only the last 4 digits
  shown), with a toggle to reveal the full number.
- Because South Korea's PIPA (Personal Information Protection Act) treats ARC
  numbers, birthdates, and phone numbers as sensitive personal data, it's
  worth having a lawyer or compliance-savvy contact review your data
  collection/consent process before handling real customer records at scale —
  this guide covers the technical access-control side, not the legal side.
- Consider adding basic rate limiting or a simple CAPTCHA in front of the
  lookup function down the line if you're worried about automated guessing —
  not set up in this initial version, but worth revisiting once you have
  real traffic patterns to look at.
