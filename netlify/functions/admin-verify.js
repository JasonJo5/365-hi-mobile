// netlify/functions/admin-verify.js
//
// Called once when staff submit the password on admin.html's login screen.
// Doesn't return any data — just confirms the password is correct so
// admin.js knows it's safe to store it for the session and show the panel.
// Every subsequent admin function re-checks the same header itself, so this
// isn't a special "session" — it's just a friendlier login UX.

const { isAuthorized, unauthorizedResponse } = require('./utils/admin-auth');

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    if (!isAuthorized(event)) return unauthorizedResponse();
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
