// netlify/functions/admin-list-orders.js
//
// Staff-only: powers the "Today's Queue" list in admin.html. Fetches recent
// orders and, by default, filters down to ones still awaiting activation.
// Filtering/search happens here in the function rather than as a compound
// Firestore query — order volume for a single shop is small enough that
// this is simpler than building composite indexes for every combination.
//
// Request:  POST { includeActivated?: boolean, search?: string }
// Response: 200 { orders: [...] }

const { getDb } = require('./utils/firebase-admin-init');
const { isAuthorized, unauthorizedResponse } = require('./utils/admin-auth');

function toIso(value) {
    return value && typeof value.toDate === 'function' ? value.toDate().toISOString() : null;
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

    const includeActivated = !!payload.includeActivated;
    const search = typeof payload.search === 'string' ? payload.search.trim().toLowerCase() : '';

    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(200).get();

        let orders = snapshot.docs.map(function (doc) {
            const data = doc.data();
            return Object.assign({ id: doc.id }, data, {
                createdAt: toIso(data.createdAt),
                activatedAt: toIso(data.activatedAt)
            });
        });

        if (!includeActivated) {
            orders = orders.filter(function (o) { return o.status !== 'activated'; });
        }
        if (search) {
            orders = orders.filter(function (o) {
                return (o.name || '').toLowerCase().indexOf(search) !== -1 ||
                    (o.phoneNumber || '').toLowerCase().indexOf(search) !== -1;
            });
        }

        return { statusCode: 200, body: JSON.stringify({ orders: orders }) };
    } catch (error) {
        console.error('admin-list-orders error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not load orders' }) };
    }
};
