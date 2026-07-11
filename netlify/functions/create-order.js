// netlify/functions/create-order.js
//
// Public endpoint called by reserve.js — a customer picking a plan and
// submitting the reservation form on reserve.html. Writes a document into
// the `orders` collection (separate from `customers`, since a reservation
// isn't a real customer yet — that only happens when staff activate it
// in-store, see admin-upsert-customer.js).
//
// No money actually moves online yet. `paymentMethod: "card"` is accepted
// and stored so the data model doesn't need to change once Toss Payments
// is wired up, but for now every order is `paymentStatus: "unpaid"` and
// gets settled in person, same as cash. See docs/ORDERS_AND_ADMIN_SETUP.md.
//
// Request:  POST { name, phoneNumber, birthdate, planName, planPrice, paymentMethod }
// Response: 200 { orderId }
//        or 400 { error: "..." }  for bad input

const { getDb, admin } = require('./utils/firebase-admin-init');

function normalizePhoneNumber(rawInput) {
    // Same normalization as account.js: strips everything but digits, drops
    // a leading country code or leading 0, and prefixes +82 (Korea).
    let digits = String(rawInput || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('82')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '+82' + digits;
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const db = getDb();
    if (!db) {
        console.error('Firebase Admin not initialized — missing/invalid FIREBASE_SERVICE_ACCOUNT_KEY env var');
        return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const birthdate = typeof payload.birthdate === 'string' ? payload.birthdate.trim() : '';
    const planName = typeof payload.planName === 'string' ? payload.planName.trim() : '';
    const planPrice = typeof payload.planPrice === 'string' ? payload.planPrice.trim() : '';
    const paymentMethod = payload.paymentMethod === 'card' ? 'card' : 'cash';
    const phoneNumber = normalizePhoneNumber(payload.phoneNumber);

    if (!name || name.length > 100) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Please enter your name.' }) };
    }
    if (!/^\+\d{8,15}$/.test(phoneNumber)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid phone number.' }) };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid date of birth.' }) };
    }
    if (!planName || planName.length > 100) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing plan selection.' }) };
    }

    try {
        const docRef = await db.collection('orders').add({
            name: name,
            phoneNumber: phoneNumber,
            birthdate: birthdate,
            planName: planName,
            planPrice: planPrice,
            paymentMethod: paymentMethod,
            paymentStatus: 'unpaid', // flips to 'paid' automatically once Toss is integrated for card orders
            status: 'reserved',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { statusCode: 200, body: JSON.stringify({ orderId: docRef.id }) };
    } catch (error) {
        console.error('create-order error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save your reservation — please try again.' }) };
    }
};
