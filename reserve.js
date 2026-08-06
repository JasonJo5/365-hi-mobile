// ===== Reserve-a-plan page =====
//
// Reads ?plan=...&price=... from the URL (set by the "Reserve Online"
// button in index.html's plan-select modal), shows the customer a form,
// and POSTs to /.netlify/functions/create-order. That function writes to
// the `orders` Firestore collection — this page never talks to Firebase
// directly (see docs/ORDERS_AND_ADMIN_SETUP.md).

let selectedPaymentMethod = 'cash';

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
}

function initPlanSummary() {
    const planName = getQueryParam('plan') || 'Selected Plan';
    const planPrice = getQueryParam('price') || '';
    document.getElementById('summary-plan-name').textContent = planName;
    document.getElementById('summary-plan-price').textContent = planPrice || '—';
}

function normalizePhoneNumber(rawInput) {
    let digits = rawInput.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '+82' + digits;
}

function showFormError(message) {
    const el = document.getElementById('form-error');
    el.textContent = message;
    el.classList.remove('hidden');
}

function clearFormError() {
    document.getElementById('form-error').classList.add('hidden');
}

function submitReservation() {
    clearFormError();

    const name = document.getElementById('name-input').value.trim();
    const rawPhone = document.getElementById('phone-input').value.trim();
    const birthdate = document.getElementById('birthdate-input').value;
    const planName = getQueryParam('plan');
    const planPrice = getQueryParam('price');

    if (!name) {
        showFormError('Please enter your name.');
        return;
    }
    if (rawPhone.replace(/[^0-9]/g, '').length < 9) {
        showFormError('Please enter a valid phone number.');
        return;
    }
    if (!birthdate) {
        showFormError('Please enter your date of birth.');
        return;
    }
    if (!planName) {
        showFormError('No plan selected — please go back and choose a plan first.');
        return;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Reserving...';

    fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            phoneNumber: normalizePhoneNumber(rawPhone),
            birthdate: birthdate,
            planName: planName,
            planPrice: planPrice,
            paymentMethod: selectedPaymentMethod
        })
    })
        .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                return { ok: res.ok, data: data };
            });
        })
        .then(function (result) {
            if (!result.ok) {
                showFormError((result.data && result.data.error) || 'Something went wrong — please try again.');
                return;
            }
            showConfirmation(planName, planPrice);
        })
        .catch(function (error) {
            console.error('submitReservation error', error);
            showFormError('Something went wrong — please try again.');
        })
        .finally(function () {
            btn.disabled = false;
            btn.innerHTML = '<span>Reserve This Plan</span>';
        });
}

function showConfirmation(planName, planPrice) {
    document.getElementById('confirmation-message').textContent =
        'You\'re reserved for ' + planName + (planPrice ? ' (' + planPrice + ')' : '') + '.';
    document.getElementById('step-form').classList.add('hidden');
    document.getElementById('step-confirmation').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', function () {
    initPlanSummary();

    const cashBtn = document.getElementById('payment-cash-btn');
    cashBtn.addEventListener('click', function () {
        selectedPaymentMethod = 'cash';
    });
});
