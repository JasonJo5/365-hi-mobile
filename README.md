# 365 Hi Mobile — Website

A landing page for a Korean SIM/eSIM provider, built with plain HTML, CSS, and JavaScript, styled with Tailwind CSS (via CDN).

## Project structure

```
365-hi-mobile/
├── index.html      # Page structure and content
├── styles.css       # Custom CSS (glassmorphism, gradients, animations)
├── script.js        # FAQ accordion, tab switching, QR modal, mobile menu logic
├── assets/
│   ├── qr-whatsapp.png    # WhatsApp QR code
│   ├── qr-kakao.png       # KakaoTalk QR code
│   ├── qr-wechat.png      # WeChat QR code
│   └── qr-instagram.png   # Instagram QR code
└── README.md         # This file
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

## Notes on what's included

- **Header** with logo and nav links (Plans / FAQ / Contact / Location) that smooth-scroll to each section, plus a mobile hamburger menu with the same links
- **Hero section** with two entry cards (ARC holder vs. no ARC)
- **Plans section** with a Prepaid/Postpaid tab switcher (5 prepaid plans, 6 postpaid plans)
- **Comparison table** (Prepaid vs Postpaid features)
- **FAQ accordion** (click to expand/collapse)
- **Contact section** — clicking WhatsApp, KakaoTalk, WeChat, or Instagram opens a popup showing that platform's QR code (press Escape or click outside to close)
- **Store location** section with address, hours, and a map placeholder linking out to Naver Maps
- **Footer** with site links and language switcher (links are placeholders — see "Next steps" below)

## Next steps you may want

These weren't functional in the original mockup either, so they're placeholders for now — happy to wire any of these up:
- Making "Select Plan" buttons actually do something (e.g., open a checkout flow or contact form)
- Adding real map coordinates for the store location (currently an image placeholder linking to a Naver Maps URL)
- Replacing the CDN Tailwind script with a proper build step (recommended if you plan to deploy — see note below)

## Deployment note

Right now this uses the Tailwind **Play CDN** (`cdn.tailwindcss.com`), which is great for prototyping/local dev but isn't recommended for production (it's slower and shows a console warning). When you're ready to deploy, let me know and I can set you up with a proper Tailwind build via npm — it's a quick conversion.
