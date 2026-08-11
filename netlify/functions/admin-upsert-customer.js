// netlify/functions/admin-upsert-customer.js
//
// Staff-only: the one function behind three admin-panel actions that are
// really the same operation —
//
//   1. "Activate" a queued order into a real customer
//   2. "Renew / change plan" for an existing customer (no order involved)
//   3. "New customer" for a walk-in with no online reservation at all
//
// Logic is identical in all three cases:
//   - Look up customers/{phoneNumber}.
//   - If it already exists AND the plan is actually changing, copy its
//     current plan fields into a new planHistory entry first — that's the
//     archive, matching the data model docs/FIRESTORE_SETUP.md describes
//     for the old Google Sheets sync.
//   - Write the new fields onto customers/{phoneNumber} (merge, so fields
//     you don't send — like an unchanged ARC number — aren't wiped out).
//   - If an orderId was included, mark that order "activated" so it drops
//     off the queue.
//
// Request: POST {
//   orderId,                          // optional — only for activating a queued order
//   phoneNumber, name, birthdate,     // required
//   arcNumber, country,               // optional (kept from existing record if omitted)
//   carrier, simType,                 // required
//   currentPlanName,                  // required
//   contractStart, contractEnd,       // "YYYY-MM-DD", optional but recommended
//   firstPurchaseDate                 // optional — defaults to contractStart for new customers
// }
// Response: 200 { customer }

const { getDb, admin } = require('./utils/firebase-admin-init');
const { isAuthorized, unauthorizedResponse } = require('./utils/admin-auth');

function normalizePhoneNumber(rawInput) {
    let digits = String(rawInput || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('82')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '+82' + digits;
}

function isValidDateOrEmpty(value) {
    return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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

    const phoneNumber = normalizePhoneNumber(payload.phoneNumber);
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const birthdate = typeof payload.birthdate === 'string' ? payload.birthdate.trim() : '';
    const arcNumber = typeof payload.arcNumber === 'string' ? payload.arcNumber.trim() : '';
    const country = typeof payload.country === 'string' ? payload.country.trim() : '';
    const carrier = typeof payload.carrier === 'string' ? payload.carrier.trim() : '';
    const simType = typeof payload.simType === 'string' ? payload.simType.trim() : '';
    const currentPlanName = typeof payload.currentPlanName === 'string' ? payload.currentPlanName.trim() : '';
    const contractStart = typeof payload.contractStart === 'string' ? payload.contractStart.trim() : '';
    const contractEnd = typeof payload.contractEnd === 'string' ? payload.contractEnd.trim() : '';
    const firstPurchaseDate = typeof payload.firstPurchaseDate === 'string' ? payload.firstPurchaseDate.trim() : '';
    const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : '';

    if (!/^\+\d{8,15}$/.test(phoneNumber)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number.' }) };
    }
    if (!name) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Name is required.' }) };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Birthdate must be in YYYY-MM-DD format.' }) };
    }
    if (!currentPlanName) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Plan name is required.' }) };
    }
    if (!isValidDateOrEmpty(contractStart) || !isValidDateOrEmpty(contractEnd) || !isValidDateOrEmpty(firstPurchaseDate)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Dates must be in YYYY-MM-DD format.' }) };
    }

    try {
        const customerRef = db.collection('customers').doc(phoneNumber);
        const existingDoc = await customerRef.get();
        const existing = existingDoc.exists ? existingDoc.data() : null;

        // Archive the old plan if this customer already had one and it's
        // actually changing (renewal/upgrade/downgrade) — not on first
        // activation, since there's nothing to archive yet.
        if (existing && existing.currentPlanName && existing.currentPlanName !== currentPlanName) {
            await customerRef.collection('planHistory').add({
                planName: existing.currentPlanName || '',
                carrier: existing.carrier || '',
                simType: existing.simType || '',
                startDate: existing.contractStart || '',
                endDate: existing.contractEnd || contractStart || ''
            });
        }

        const customerData = {
            name: name,
            phoneNumber: phoneNumber,
            birthdate: birthdate,
            arcNumber: arcNumber || (existing ? existing.arcNumber || '' : ''),
            country: country || (existing ? existing.country || '' : ''),
            carrier: carrier,
            simType: simType,
            currentPlanName: currentPlanName,
            contractStart: contractStart,
            contractEnd: contractEnd,
            firstPurchaseDate: firstPurchaseDate || (existing ? existing.firstPurchaseDate || '' : contractStart)
        };

        await customerRef.set(customerData, { merge: true });

        if (orderId) {
            await db.collection('orders').doc(orderId).set({
                status: 'activated',
                activatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        return { statusCode: 200, body: JSON.stringify({ customer: customerData }) };
    } catch (error) {
        console.error('admin-upsert-customer error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Save failed' }) };
    }
};
