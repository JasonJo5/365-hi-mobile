// netlify/functions/admin-list-customers.js
//
// Staff-only: powers the "All Customers" tab in admin.html (the full table
// view + "Export CSV" button), for shops with enough customers that
// search-only isn't practical anymore.
//
// Returns every document in `customers`, capped at 2000 — plenty for a
// single shop. If you ever get past that, this is the place to add
// pagination (Firestore's .limit()/.startAfter() cursor pattern) — nothing
// else needs to change.
//
// Request:  POST {}
// Response: 200 { customers: [...] }

const { getDb } = require('./utils/firebase-admin-init');
const { isAuthorized, unauthorizedResponse } = require('./utils/admin-auth');

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    if (!isAuthorized(event)) return unauthorizedResponse();

    const db = getDb();
    if (!db) return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };

    try {
        const snapshot = await db.collection('customers').orderBy('name').limit(2000).get();
        const customers = snapshot.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        return { statusCode: 200, body: JSON.stringify({ customers: customers }) };
    } catch (error) {
        console.error('admin-list-customers error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not load customers' }) };
    }
};
