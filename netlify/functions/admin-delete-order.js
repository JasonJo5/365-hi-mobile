// netlify/functions/admin-delete-order.js
//
// Staff-only: removes a reservation from "Today's Queue" without activating
// it — for no-shows, duplicates, or a customer who cancelled by phone.
// Complements admin-upsert-customer.js's "activate" path, which is the
// other way an order leaves the queue.
//
// Request:  POST { orderId }
// Response: 200 { deleted: true }

const { getDb } = require('./utils/firebase-admin-init');
const { isAuthorized, unauthorizedResponse } = require('./utils/admin-auth');

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    if (!isAuthorized(event)) return unauthorizedResponse();

    const db = getDb();
    if (!db) return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : '';
    if (!orderId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderId.' }) };
    }

    try {
        await db.collection('orders').doc(orderId).delete();
        return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
    } catch (error) {
        console.error('admin-delete-order error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Delete failed' }) };
    }
};
