// ===== My Account portal: Phone Number + Birthdate lookup =====
//
// How this works now:
// 1. Customer enters their phone number, then their date of birth.
// 2. We POST both to a Netlify serverless function:
//    /.netlify/functions/lookup-customer
// 3. That function runs server-side with Firebase Admin SDK credentials
//    (never exposed to the browser). It looks up /customers/{phoneNumber} in
//    Firestore and checks that the birthdate on file matches what was
//    submitted. It only returns customer data if BOTH match; otherwise it
//    returns a generic "not found" response — same response whether the
//    phone number doesn't exist or the birthdate was wrong, so the front end
//    can't be used to guess which part was incorrect.
// 4. Firestore's own security rules deny ALL reads/writes from client code
//    (see docs/firestore.rules) — the Netlify function (via the Admin SDK)
//    is the only path to this data.
//
// SECURITY NOTE: this replaces SMS-verified identity (Firebase Phone Auth)
// with a shared-secret check (phone number + birthdate). That's simpler,
// has no per-login cost, and doesn't require the Blaze plan — but it does
// mean anyone who knows/guesses a customer's phone number AND birthdate
// could view their plan info. For a SIM/eSIM contract portal that's usually
// an acceptable tradeoff, but since birthdates and phone numbers count as
// sensitive personal data under Korea's PIPA, it's worth keeping in mind
// (and worth a quick check with a compliance-savvy contact) before treating
// this as fully "secure" for higher-stakes data.

let currentCustomerData = null;
let currentArcNumber = '';

function normalizePhoneNumber(rawInput) {
    // Strips spaces/dashes, drops a leading 0, and prefixes +82 (Korea).
    // e.g. "010-1234-5678" -> "+821012345678"
    let digits = rawInput.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '+82' + digits;
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.remove('hidden');
}

function clearError(elementId) {
    document.getElementById(elementId).classList.add('hidden');
}

function goToBirthdateStep() {
    clearError('phone-error');
    const rawInput = document.getElementById('phone-input').value.trim();

    if (rawInput.replace(/[^0-9]/g, '').length < 9) {
        showError('phone-error', 'Please enter a valid phone number.');
        return;
    }

    document.getElementById('birthdate-phone-display').textContent = normalizePhoneNumber(rawInput);
    document.getElementById('step-phone').classList.add('hidden');
    document.getElementById('step-birthdate').classList.remove('hidden');
    document.getElementById('birthdate-input').focus();
}

function lookupCustomer() {
    clearError('birthdate-error');
    const rawPhone = document.getElementById('phone-input').value.trim();
    const birthdate = document.getElementById('birthdate-input').value; // "YYYY-MM-DD" from <input type="date">

    if (!birthdate) {
        showError('birthdate-error', 'Please enter your date of birth.');
        return;
    }

    const phoneNumber = normalizePhoneNumber(rawPhone);
    const btn = document.getElementById('lookup-btn');
    btn.disabled = true;
    btn.textContent = 'Checking...';

    fetch('/.netlify/functions/lookup-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber, birthdate: birthdate })
    })
        .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                return { ok: res.ok, data: data };
            });
        })
        .then(function (result) {
            if (!result.ok || !result.data || !result.data.found) {
                showStep('step-not-found');
                return;
            }
            currentCustomerData = result.data.customer;
            renderDashboard(result.data.customer, result.data.history || []);
            showStep('step-dashboard');
        })
        .catch(function (error) {
            console.error('lookupCustomer error', error);
            showError('birthdate-error', 'Something went wrong — please try again.');
        })
        .finally(function () {
            btn.disabled = false;
            btn.textContent = 'View My Account';
        });
}

function formatDate(value) {
    if (!value) return '—';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return value;
    }
}

function renderDashboard(data, history) {
    document.getElementById('dash-name').textContent = data.name || 'Customer';
    document.getElementById('dash-plan-name').textContent = data.currentPlanName || '—';
    document.getElementById('dash-plan-carrier').textContent =
        [data.carrier, data.simType].filter(Boolean).join(' · ') || '—';
    document.getElementById('dash-contract-start').textContent = formatDate(data.contractStart);
    document.getElementById('dash-contract-end').textContent = formatDate(data.contractEnd);
    document.getElementById('dash-phone').textContent = data.phoneNumber || '—';
    document.getElementById('dash-birthdate').textContent = formatDate(data.birthdate);
    document.getElementById('dash-country').textContent = data.country || '—';
    document.getElementById('dash-sim-type').textContent = data.simType || '—';
    document.getElementById('dash-first-purchase').textContent = formatDate(data.firstPurchaseDate);

    currentArcNumber = data.arcNumber || '';
    document.getElementById('dash-arc').textContent = maskArc(currentArcNumber);

    const badge = document.getElementById('dash-status-badge');
    const isActive = !data.contractEnd || new Date(data.contractEnd) >= new Date();
    badge.textContent = isActive ? 'Active' : 'Expired';
    badge.className = isActive
        ? 'px-3 py-1 rounded-full text-label-sm font-bold uppercase bg-secondary/15 text-secondary'
        : 'px-3 py-1 rounded-full text-label-sm font-bold uppercase bg-error/15 text-error';

    const historyList = document.getElementById('dash-history-list');
    const emptyMsg = document.getElementById('dash-history-empty');
    historyList.innerHTML = '';
    if (!history || history.length === 0) {
        historyList.appendChild(emptyMsg);
    } else {
        history.forEach(function (entry) {
            const item = document.createElement('div');
            item.className = 'flex items-start gap-3 pb-4 border-b border-outline-variant/10 last:border-0 last:pb-0';
            item.innerHTML =
                '<span class="material-symbols-outlined text-on-surface-variant text-[20px] mt-0.5" data-icon="history">history</span>' +
                '<div class="flex-1">' +
                '<p class="font-bold text-on-surface text-sm">' + escapeHtml(entry.planName || 'Plan') + '</p>' +
                '<p class="text-on-surface-variant text-xs mt-0.5">' +
                escapeHtml([entry.carrier, entry.simType].filter(Boolean).join(' · ')) +
                '</p>' +
                '<p class="text-on-surface-variant text-xs mt-1">' +
                formatDate(entry.startDate) + ' — ' + formatDate(entry.endDate) +
                '</p>' +
                '</div>';
            historyList.appendChild(item);
        });
    }
}

function maskArc(arc) {
    if (!arc) return '—';
    const visible = arc.slice(-4);
    return '•'.repeat(Math.max(arc.length - 4, 4)) + visible;
}

function toggleArcVisibility() {
    const el = document.getElementById('dash-arc');
    const btn = document.getElementById('arc-toggle-btn');
    const icon = btn.querySelector('.material-symbols-outlined');
    const isMasked = el.textContent !== currentArcNumber;
    if (isMasked) {
        el.textContent = currentArcNumber || '—';
        icon.textContent = 'visibility_off';
        btn.setAttribute('aria-label', 'Hide ARC number');
    } else {
        el.textContent = maskArc(currentArcNumber);
        icon.textContent = 'visibility';
        btn.setAttribute('aria-label', 'Show ARC number');
    }
}

function showStep(stepId) {
    ['step-phone', 'step-birthdate', 'step-dashboard', 'step-not-found'].forEach(function (id) {
        document.getElementById(id).classList.toggle('hidden', id !== stepId);
    });
}

function backToPhoneStep() {
    document.getElementById('phone-input').value = '';
    document.getElementById('birthdate-input').value = '';
    clearError('phone-error');
    clearError('birthdate-error');
    showStep('step-phone');
}

function signOutAccount() {
    currentCustomerData = null;
    currentArcNumber = '';
    backToPhoneStep();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
