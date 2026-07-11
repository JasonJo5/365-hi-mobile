// netlify/functions/utils/admin-auth.js
//
// A single shared password gates every staff-only function (the "Today's
// Queue" list, customer search, and the activate/renew write). The admin
// panel sends it as the `x-admin-password` header on every request.
//
// SETUP: in Netlify, Site configuration > Environment variables, add
// ADMIN_PASSWORD with whatever password staff should use to log into
// admin.html. Redeploy after adding it.
//
// SECURITY NOTE (same tradeoff already documented for the customer portal
// in docs/FIRESTORE_SETUP.md): this is a shared secret, not a per-staff
// account, so it "keeps casual people out" rather than being a hardened
// auth system. That's a reasonable bar for a small shop's internal tool,
// but: use a real password (not "admin123"), only share it with staff who
// need it, and rotate it in Netlify's env vars if anyone with access leaves.
// If you outgrow this later, Firebase Auth with individual staff accounts
// is the natural upgrade — nothing in the Firestore data model needs to
// change for that.

function isAuthorized(event) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return false; // not configured yet -> deny by default
    const headers = event.headers || {};
    const provided = headers['x-admin-password'] || headers['X-Admin-Password'];
    return typeof provided === 'string' && provided.length > 0 && provided === expected;
}

function unauthorizedResponse() {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
}

module.exports = { isAuthorized, unauthorizedResponse };
