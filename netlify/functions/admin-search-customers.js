// netlify/functions/admin-search-customers.js
//
// Staff-only: look up an existing customer for a renewal/plan change, or to
// check whether a phone number is already on file before activating a new
// order. Firestore has no "list all customers" permission and no full-text
// search, so this supports two lookup modes:
//
//   - Looks like a phone number (8+ digits)  -> exact doc-ID lookup
//   - Otherwise                              -> name prefix match
//     (case-sensitive, matches how the name was typed into the sheet/admin
//     panel originally — if a search comes up empty, try the exact
//     capitalization from the plan history or ask the customer to spell it)
//
// Request:  POST { query: "+82..." | "Kim" }
// Response: 200 { customers: [...] }   (0 or more matches)

const { getDb } = require('./utils/firebase-admin-init');
const { isAuthorized, unauthorizedResponse } = require('./utils/admin-auth');

function normalizePhoneNumber(rawInput) {
    let digits = String(rawInput || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.startsWith('82')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '+82' + digits;
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    if (!isAuthorized(event)) return unauthorizedResponse();

    const db = getDb();
    if (!db) return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };

    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); } catch (e) { /* default {} is fine */ }

    const rawQuery = typeof payload.query === 'string' ? payload.query.trim() : '';
    if (!rawQuery) {
        return { statusCode: 200, body: JSON.stringify({ customers: [] }) };
    }

    const digitCount = rawQuery.replace(/[^0-9]/g, '').length;
    const looksLikePhone = digitCount >= 8;

    try {
        let customers = [];

        if (looksLikePhone) {
            const phoneNumber = normalizePhoneNumber(rawQuery);
            const doc = await db.collection('customers').doc(phoneNumber).get();
            if (doc.exists) customers.push(Object.assign({ id: doc.id }, doc.data()));
        } else {
            const snapshot = await db.collection('customers')
                .where('name', '>=', rawQuery)
                .where('name', '<=', rawQuery + '\uf8ff')
                .limit(20)
                .get();
            customers = snapshot.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        }

        return { statusCode: 200, body: JSON.stringify({ customers: customers }) };
    } catch (error) {
        console.error('admin-search-customers error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Search failed' }) };
    }
};
