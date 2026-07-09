// netlify/functions/lookup-customer.js
//
// Server-side lookup for the "My Account" portal. Runs on Netlify's servers,
// never in the browser — so this is the only place that holds Firebase
// Admin credentials, and the only path that can read /customers in Firestore
// (client-side reads are denied entirely by firestore.rules).
//
// Request:  POST { phoneNumber: "+821012345678", birthdate: "1995-03-14" }
// Response: 200 { found: true,  customer: {...}, history: [...] }
//        or 200 { found: false }   <- used for BOTH "no such phone number"
//                                      AND "birthdate didn't match", on purpose,
//                                      so the response can't be used to guess
//                                      which part was wrong.
//
// SETUP (see docs/FIRESTORE_SETUP.md for the full walkthrough):
//   1. Firebase Console > Project Settings (gear icon) > Service accounts tab
//      > Generate new private key. This downloads a JSON file.
//   2. In the Netlify dashboard: Site configuration > Environment variables
//      > add a variable named FIREBASE_SERVICE_ACCOUNT_KEY, and paste the
//      ENTIRE contents of that JSON file as the value (it's fine that it's
//      multi-line JSON — Netlify handles that).
//   3. Redeploy the site. Netlify auto-detects files under netlify/functions
//      and deploys them — no extra config needed for a basic setup like this
//      one, but make sure netlify/functions/package.json's dependencies get
//      installed (Netlify does this automatically during a normal deploy;
//      if you deploy via drag-and-drop of a zip instead of Git, run
//      `npm install` inside netlify/functions first and include node_modules
//      in the zip).
//
// NEVER commit the service account JSON to git or paste it anywhere public —
// treat it like a password. The Netlify environment variable is the right
// place for it; it is not exposed to the browser.

const admin = require('firebase-admin');

function getServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON', e);
        return null;
    }
}

if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!admin.apps.length) {
        console.error('Firebase Admin not initialized — missing/invalid FIREBASE_SERVICE_ACCOUNT_KEY env var');
        return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const phoneNumber = typeof payload.phoneNumber === 'string' ? payload.phoneNumber.trim() : '';
    const birthdate = typeof payload.birthdate === 'string' ? payload.birthdate.trim() : '';

    // Basic shape checks — E.164-ish phone, YYYY-MM-DD date. Anything that
    // doesn't look right is treated the same as "not found".
    const notFound = { statusCode: 200, body: JSON.stringify({ found: false }) };

    if (!/^\+\d{8,15}$/.test(phoneNumber) || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        return notFound;
    }

    try {
        const db = admin.firestore();
        const docRef = db.collection('customers').doc(phoneNumber);
        const doc = await docRef.get();

        if (!doc.exists) {
            return notFound;
        }

        const data = doc.data();

        if (!data.birthdate || data.birthdate !== birthdate) {
            return notFound;
        }

        const historySnapshot = await docRef.collection('planHistory').orderBy('endDate', 'desc').get();
        const history = historySnapshot.docs.map(function (d) { return d.data(); });

        return {
            statusCode: 200,
            body: JSON.stringify({
                found: true,
                customer: data,
                history: history
            })
        };
    } catch (error) {
        console.error('lookup-customer error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Lookup failed' }) };
    }
};
