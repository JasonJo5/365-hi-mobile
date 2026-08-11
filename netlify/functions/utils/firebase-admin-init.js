// netlify/functions/utils/firebase-admin-init.js
//
// Shared Firebase Admin SDK initializer. Import this from any function that
// needs Firestore admin access, instead of duplicating the init logic that
// lookup-customer.js has inline.
//
//   const { getDb, admin } = require('./utils/firebase-admin-init');
//   const db = getDb();
//   if (!db) { /* FIREBASE_SERVICE_ACCOUNT_KEY missing/invalid */ }

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

function getDb() {
    if (!admin.apps.length) {
        const serviceAccount = getServiceAccount();
        if (!serviceAccount) return null;
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin.firestore();
}

module.exports = { admin, getDb };
