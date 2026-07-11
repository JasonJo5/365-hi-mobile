// netlify/functions/admin-delete-customer.js
//
// Staff-only: permanently removes a customer record — for duplicate
// entries, mistakes made during activation, or a customer asking to be
// removed from your records. This also deletes their `planHistory`
// subcollection: Firestore doesn't clean up subcollections automatically
// when you delete the parent document, so without this an orphaned
// planHistory would be left behind with no customer doc pointing to it.
//
// This is a hard delete — there is no undo. If you'd rather keep the data
// but hide it (e.g. for audit reasons), a small variant of this that sets
// a `deleted: true` flag instead of removing the document is the safer
// alternative — ask if you want that swapped in instead.
//
// Request:  POST { phoneNumber }
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

    const phoneNumber = typeof payload.phoneNumber === 'string' ? payload.phoneNumber.trim() : '';
    if (!/^\+\d{8,15}$/.test(phoneNumber)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number.' }) };
    }

    try {
        const customerRef = db.collection('customers').doc(phoneNumber);

        const historySnapshot = await customerRef.collection('planHistory').get();
        const batch = db.batch();
        historySnapshot.docs.forEach(function (doc) { batch.delete(doc.ref); });
        batch.delete(customerRef);
        await batch.commit();

        return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
    } catch (error) {
        console.error('admin-delete-customer error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Delete failed' }) };
    }
};
