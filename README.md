# 365 Hi Mobile — Website

A landing page for a Korean SIM/eSIM provider, built with plain HTML, CSS, and JavaScript, styled with Tailwind CSS (via CDN).

## Project structure

```
365-hi-mobile/
├── index.html            # Main site
├── account.html           # Customer "My Account" login + dashboard portal
├── styles.css             # Theme variables (light/dark), glassmorphism, animations
├── script.js               # Language switching, theme toggle, tab switching, modals, reviews
├── account.js              # Phone-auth login flow + Firestore dashboard rendering
├── firebase-config.js      # Shared Firebase credentials (fill in your own — used by reviews + account portal)
├── assets/
│   ├── qr-kakao.png       # KakaoTalk QR code
│   └── qr-wechat.png      # WeChat QR code
├── netlify/
│   └── functions/
│       ├── lookup-customer.js      # Server-side phone+birthdate lookup (Admin SDK)
│       └── package.json            # firebase-admin dependency for the function above
├── netlify.toml            # Points Netlify at netlify/functions
├── docs/
│   ├── FIRESTORE_SETUP.md         # Full setup guide for the customer account portal
│   ├── firestore.rules             # Security rules (paste into Firebase Console)
│   └── google-apps-script-sync.gs  # Syncs a Google Sheet of customer data into Firestore
└── README.md              # This file
```

No build step is required — Tailwind and the fonts load from CDNs, so the site runs as static files.

## How to run it in VS Code

1. **Open the folder**
   - Open VS Code → `File > Open Folder...` → select the `365-hi-mobile` folder.

2. **Install the "Live Server" extension** (one-time setup)
   - Click the Extensions icon in the sidebar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`).
   - Search for **Live Server** (by Ritwick Dey) and click **Install**.

3. **Launch the site**
   - Right-click `index.html` in the file explorer → **Open with Live Server**.
   - Your browser will open automatically at something like `http://127.0.0.1:5500`, and the page will hot-reload whenever you save changes.

   *(Alternative without the extension: just double-click `index.html` to open it directly in your browser — it'll work, but won't auto-refresh on edits.)*

## What's included

- **Multi-language support (EN / 한국어 / 中文)** — switch via the buttons in the header (desktop nav and mobile menu) or the footer. Choice is remembered across visits (localStorage). Covers nav, hero, how-it-works, plans, comparison table, FAQ, contact, location, and footer.
- **Light / Dark mode** — toggle switch in the header (desktop and mobile). Defaults to the visitor's OS preference on first visit, then remembers their choice. Built on CSS custom properties, so the whole Material-style color system (surfaces, glass panels, plan cards, gradients) adapts automatically.
- **Header** with nav links (Plans / FAQ / Contact / Location) that smooth-scroll to each section, plus a mobile hamburger menu with the same links, language switcher, and theme toggle.
- **Hero section** with two entry cards — "I have an ARC" scrolls straight to **Postpaid** plans, "No ARC" scrolls to **Prepaid** plans.
- **Plans section** with a Prepaid/Postpaid tab switcher. Both prepaid and postpaid cards now show an exact **Total Price** row (postpaid prices no longer show a strikethrough — that was left over from an unfinished "sale price" pattern).
- **Comparison table**, **testimonials**, **FAQ accordion**, and a live **customer reviews** section (wired for Firebase — see note below).
- **Contact section** — WhatsApp and Instagram buttons open a direct chat/profile link in a new tab. KakaoTalk and WeChat (which don't have a universal web link) still show a scannable QR code popup.
- **Store location** with an embedded map and a clearly labeled "Open in Naver Maps" link to the real address.
- **Footer** with product/resource/company links and a copyright line.
- **My Account portal (`account.html`)** — customers enter their phone number and birthdate on file, then see *only their own* contract info (plan, SIM carrier, contract dates, ARC number masked by default) plus a history of past plans. The lookup happens server-side via a Netlify function, never a direct client read of Firestore. Full setup instructions are in `docs/FIRESTORE_SETUP.md`.

## Setting up the customer account portal

This is a bigger piece than the rest of the site — it involves a Firebase project, phone authentication, Firestore, and (optionally) a Google Sheets sync script so you can keep managing customer data in a spreadsheet-like tool day-to-day. Full walkthrough: **`docs/FIRESTORE_SETUP.md`**.

## Notes on Firebase reviews

The customer reviews section expects a Firebase project (Firestore) — fill in `firebaseConfig` near the top of `script.js` with your own project's credentials. Until that's filled in, the section will just show "Reviews are not connected yet."

## Next steps you may want

- Making the footer's Products/Resources/Company links point to real pages
- Filling in the Firebase config so reviews actually save/load
- Replacing the CDN Tailwind script with a proper build step (recommended if you plan to deploy — see note below)

## Deployment note

Right now this uses the Tailwind **Play CDN** (`cdn.tailwindcss.com`), which is great for prototyping/local dev but isn't recommended for production (it's slower and shows a console warning). When you're ready to deploy, let me know and I can set you up with a proper Tailwind build via npm — it's a quick conversion.

