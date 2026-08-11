// netlify/functions/admin-api.js
//
// Admin Panel Secure Serverless API Handler.
// This handles all staff operations with full Firebase Admin privileges.

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

const DEFAULT_ADMIN_PIN = '365365';

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

    const pin = typeof payload.pin === 'string' ? payload.pin.trim() : '';
    const configuredPin = (process.env.ADMIN_PASSCODE || DEFAULT_ADMIN_PIN).trim();

    if (!pin || pin !== configuredPin) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized PIN' }) };
    }

    const action = typeof payload.action === 'string' ? payload.action.trim() : '';
    const db = admin.firestore();

    try {
        switch (action) {
            case 'verify-pin':
                return { statusCode: 200, body: JSON.stringify({ ok: true }) };

            case 'get-orders': {
                // Fetch orders from the last 7 days or any active queue orders
                const ordersSnapshot = await db.collection('orders')
                    .orderBy('createdAt', 'desc')
                    .limit(100)
                    .get();

                const orders = ordersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
                    };
                });

                return { statusCode: 200, body: JSON.stringify({ ok: true, orders }) };
            }

            case 'activate-order': {
                const { orderId, arcNumber, carrier, simType } = payload;
                if (!orderId) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderId' }) };
                }

                const orderRef = db.collection('orders').doc(orderId);
                const orderDoc = await orderRef.get();

                if (!orderDoc.exists) {
                    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
                }

                const order = orderDoc.data();
                const phoneNumber = order.customerPhone;

                // Calculate plan duration if prepaid
                let contractStart = new Date().toISOString().split('T')[0];
                let contractEnd = '';

                // Try to parse days from prepaid plan name (e.g., "Korea 15" -> 15 days)
                const prepaidMatch = order.planName.match(/Korea\s+(\d+)/i);
                if (prepaidMatch) {
                    const days = parseInt(prepaidMatch[1], 10);
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + days);
                    contractEnd = endDate.toISOString().split('T')[0];
                }

                // Write directly to customers/{phoneNumber}
                const customerRef = db.collection('customers').doc(phoneNumber);
                const customerData = {
                    name: order.customerName,
                    phoneNumber: phoneNumber,
                    birthdate: order.birthdate,
                    arcNumber: arcNumber || '',
                    currentPlanName: order.planName,
                    currentPlanPrice: order.planPrice,
                    carrier: carrier || 'LGU+',
                    simType: simType || 'Physical SIM',
                    contractStart: contractStart,
                    contractEnd: contractEnd,
                    firstPurchaseDate: contractStart,
                    country: 'Korea'
                };

                await customerRef.set(customerData);

                // Update the order status to completed/activated
                await orderRef.update({
                    status: 'completed',
                    activatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return { statusCode: 200, body: JSON.stringify({ ok: true }) };
            }

            case 'search-customer': {
                const { phoneNumber } = payload;
                if (!phoneNumber) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing phoneNumber' }) };
                }

                const customerRef = db.collection('customers').doc(phoneNumber);
                const customerDoc = await customerRef.get();

                if (!customerDoc.exists) {
                    return { statusCode: 200, body: JSON.stringify({ found: false }) };
                }

                const data = customerDoc.data();
                const historySnapshot = await customerRef.collection('planHistory')
                    .orderBy('endDate', 'desc')
                    .get();

                const history = historySnapshot.docs.map(doc => doc.data());

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        found: true,
                        customer: data,
                        history: history
                    })
                };
            }

            case 'update-customer-plan': {
                const { phoneNumber, planName, planPrice, carrier, simType, contractStart, contractEnd } = payload;
                if (!phoneNumber || !planName) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing parameters' }) };
                }

                const customerRef = db.collection('customers').doc(phoneNumber);
                const customerDoc = await customerRef.get();

                if (!customerDoc.exists) {
                    return { statusCode: 404, body: JSON.stringify({ error: 'Customer not found' }) };
                }

                const currentData = customerDoc.data();

                // 1. Archive the existing current plan into planHistory subcollection
                const historyRef = customerRef.collection('planHistory').doc();
                await historyRef.set({
                    planName: currentData.currentPlanName || '—',
                    carrier: currentData.carrier || '—',
                    simType: currentData.simType || '—',
                    startDate: currentData.contractStart || '—',
                    endDate: currentData.contractEnd || new Date().toISOString().split('T')[0]
                });

                // 2. Write new plan info to the main document
                await customerRef.update({
                    currentPlanName: planName,
                    currentPlanPrice: planPrice,
                    carrier: carrier || 'LGU+',
                    simType: simType || 'Physical SIM',
                    contractStart: contractStart || new Date().toISOString().split('T')[0],
                    contractEnd: contractEnd || ''
                });

                return { statusCode: 200, body: JSON.stringify({ ok: true }) };
            }

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
        }
    } catch (err) {
        console.error('admin-api error', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal operation failed', details: err.message }) };
    }
};
