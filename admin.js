// ===== Staff admin panel =====
//
// Talks to four Netlify functions, all gated by the shared ADMIN_PASSWORD
// (see netlify/functions/utils/admin-auth.js):
//   - admin-verify.js            (login screen)
//   - admin-list-orders.js       (Today's Queue tab)
//   - admin-search-customers.js  (Customers tab)
//   - admin-upsert-customer.js   (the Save button in the shared modal —
//                                  handles activate / renew / new-customer)
//
// The password is kept in sessionStorage (cleared when the browser tab
// closes) and sent as the x-admin-password header on every request. If a
// request comes back 401 (e.g. the password was changed on Netlify), we
// drop back to the login screen automatically.

const ADMIN_PW_KEY = 'himobile_admin_pw';
let queueSearchTimer = null;

// ---------- auth ----------

function getStoredPassword() {
    return sessionStorage.getItem(ADMIN_PW_KEY) || '';
}

function adminLogin() {
    const password = document.getElementById('admin-password-input').value;
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');

    if (!password) {
        errorEl.textContent = 'Please enter the staff password.';
        errorEl.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = 'Checking...';

    fetch('/.netlify/functions/admin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: '{}'
    })
        .then(function (res) {
            if (!res.ok) throw new Error('bad password');
            sessionStorage.setItem(ADMIN_PW_KEY, password);
            showPanel();
        })
        .catch(function () {
            errorEl.textContent = 'Incorrect password.';
            errorEl.classList.remove('hidden');
        })
        .finally(function () {
            btn.disabled = false;
            btn.textContent = 'Log In';
        });
}

function adminSignOut() {
    sessionStorage.removeItem(ADMIN_PW_KEY);
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('signout-btn').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-password-input').value = '';
}

function showPanel() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    document.getElementById('signout-btn').classList.remove('hidden');
    loadQueue();
}

// Wrapper around fetch that adds the auth header and handles 401 by
// signing out, so every admin-* call site doesn't need to repeat this.
function adminFetch(path, body) {
    return fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': getStoredPassword() },
        body: JSON.stringify(body || {})
    }).then(function (res) {
        if (res.status === 401) {
            adminSignOut();
            document.getElementById('login-error').textContent = 'Session expired — please log in again.';
            document.getElementById('login-error').classList.remove('hidden');
            throw new Error('unauthorized');
        }
        return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
        });
    });
}

// ---------- tabs ----------

function switchTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(function (btn) {
        const active = btn.getAttribute('data-tab') === tab;
        btn.className = 'admin-tab-btn px-5 py-2 rounded-full text-sm font-bold transition-colors ' +
            (active ? 'bg-primary text-on-primary' : 'text-on-surface-variant');
    });
    document.getElementById('tab-queue').classList.toggle('hidden', tab !== 'queue');
    document.getElementById('tab-customers').classList.toggle('hidden', tab !== 'customers');
    document.getElementById('tab-all-customers').classList.toggle('hidden', tab !== 'all-customers');
    if (tab === 'queue') loadQueue();
    if (tab === 'all-customers') loadAllCustomers();
}

// ---------- queue ----------

function loadQueue() {
    clearTimeout(queueSearchTimer);
    queueSearchTimer = setTimeout(function () {
        const search = document.getElementById('queue-search-input').value.trim();
        const listEl = document.getElementById('queue-list');
        adminFetch('/.netlify/functions/admin-list-orders', { search: search })
            .then(function (data) {
                renderQueue(data.orders || []);
            })
            .catch(function (error) {
                if (error.message === 'unauthorized') return;
                listEl.innerHTML = '<p class="text-error text-sm text-center py-8">' + escapeHtml(error.message) + '</p>';
            });
    }, 200);
}

function renderQueue(orders) {
    const listEl = document.getElementById('queue-list');
    if (!orders.length) {
        listEl.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-8">No reservations waiting right now.</p>';
        return;
    }
    listEl.innerHTML = orders.map(function (order) {
        const paymentLabel = order.paymentMethod === 'card' ? 'Card (coming soon)' : 'Cash in store';
        return (
            '<div class="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4">' +
            '<div class="min-w-0">' +
            '<p class="font-bold text-on-surface truncate">' + escapeHtml(order.name || '—') + '</p>' +
            '<p class="text-on-surface-variant text-sm truncate">' + escapeHtml(order.phoneNumber || '') + ' &middot; ' + escapeHtml(order.planName || '') + '</p>' +
            '<p class="text-on-surface-variant/70 text-xs mt-0.5">' + escapeHtml(paymentLabel) + '</p>' +
            '</div>' +
            '<div class="flex gap-2 shrink-0">' +
            '<button class="px-4 py-2 rounded-full bg-primary text-on-primary font-bold text-sm" onclick="openActivateModal(' + "'" + order.id + "'" + ')" type="button">Activate</button>' +
            '<button class="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 hover:border-error hover:text-error flex items-center justify-center" onclick="dismissOrder(' + "'" + order.id + "'" + ')" title="Dismiss (no-show / duplicate / cancelled)" type="button">' +
            '<span class="material-symbols-outlined text-[18px]" data-icon="close">close</span>' +
            '</button>' +
            '</div>' +
            '</div>'
        );
    }).join('');
}

function dismissOrder(orderId) {
    if (!confirm('Dismiss this reservation? This removes it from the queue permanently.')) return;
    adminFetch('/.netlify/functions/admin-delete-order', { orderId: orderId })
        .then(function () {
            showToast('Reservation dismissed.');
            loadQueue();
        })
        .catch(function (error) {
            if (error.message !== 'unauthorized') showToast(error.message);
        });
}

// ---------- customers ----------

function searchCustomers() {
    const query = document.getElementById('customer-search-input').value.trim();
    const resultsEl = document.getElementById('customer-results');
    if (!query) return;

    resultsEl.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-8">Searching...</p>';

    adminFetch('/.netlify/functions/admin-search-customers', { query: query })
        .then(function (data) {
            renderCustomerResults(data.customers || []);
        })
        .catch(function (error) {
            if (error.message === 'unauthorized') return;
            resultsEl.innerHTML = '<p class="text-error text-sm text-center py-8">' + escapeHtml(error.message) + '</p>';
        });
}

function renderCustomerResults(customers) {
    const resultsEl = document.getElementById('customer-results');
    if (!customers.length) {
        resultsEl.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-8">No matching customers found.</p>';
        return;
    }
    resultsEl.innerHTML = customers.map(function (c, i) {
        window['__customer_' + i] = c;
        const isActive = !c.contractEnd || new Date(c.contractEnd) >= new Date();
        return (
            '<div class="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4">' +
            '<div class="min-w-0">' +
            '<p class="font-bold text-on-surface truncate">' + escapeHtml(c.name || '—') + '</p>' +
            '<p class="text-on-surface-variant text-sm truncate">' + escapeHtml(c.phoneNumber || '') + ' &middot; ' + escapeHtml(c.currentPlanName || '—') + '</p>' +
            '<p class="text-xs mt-0.5 ' + (isActive ? 'text-secondary' : 'text-error') + '">' + (isActive ? 'Active' : 'Expired') + '</p>' +
            '</div>' +
            '<div class="flex gap-2 shrink-0">' +
            '<button class="px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/30 hover:border-primary transition-colors font-bold text-sm" onclick="openRenewModal(window.__customer_' + i + ')" type="button">Edit / Renew</button>' +
            '<button class="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 hover:border-error hover:text-error flex items-center justify-center" onclick="deleteCustomer(' + "'" + c.phoneNumber + "'" + ')" title="Delete customer" type="button">' +
            '<span class="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>' +
            '</button>' +
            '</div>' +
            '</div>'
        );
    }).join('');
}

function deleteCustomer(phoneNumber) {
    if (!confirm('Permanently delete this customer and their plan history? This cannot be undone.')) return;
    adminFetch('/.netlify/functions/admin-delete-customer', { phoneNumber: phoneNumber })
        .then(function () {
            showToast('Customer deleted.');
            const customerSearchInput = document.getElementById('customer-search-input');
            if (customerSearchInput.value.trim()) searchCustomers();
            if (!document.getElementById('tab-all-customers').classList.contains('hidden')) loadAllCustomers();
        })
        .catch(function (error) {
            if (error.message !== 'unauthorized') showToast(error.message);
        });
}

// ---------- all customers (table + CSV export) ----------

let allCustomersCache = [];

function loadAllCustomers() {
    const wrap = document.getElementById('all-customers-table-wrap');
    wrap.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-8">Loading...</p>';

    adminFetch('/.netlify/functions/admin-list-customers', {})
        .then(function (data) {
            allCustomersCache = data.customers || [];
            document.getElementById('all-customers-count').textContent =
                allCustomersCache.length + ' customer' + (allCustomersCache.length === 1 ? '' : 's');
            renderCustomersTable(allCustomersCache);
        })
        .catch(function (error) {
            if (error.message === 'unauthorized') return;
            wrap.innerHTML = '<p class="text-error text-sm text-center py-8">' + escapeHtml(error.message) + '</p>';
        });
}

function renderCustomersTable(customers) {
    const wrap = document.getElementById('all-customers-table-wrap');
    if (!customers.length) {
        wrap.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-8">No customers yet.</p>';
        return;
    }

    const rows = customers.map(function (c, i) {
        window['__customer_' + i] = c;
        const isActive = !c.contractEnd || new Date(c.contractEnd) >= new Date();
        return (
            '<tr class="border-b border-outline-variant/10 last:border-0">' +
            '<td class="px-4 py-3 font-bold text-on-surface whitespace-nowrap">' + escapeHtml(c.name || '—') + '</td>' +
            '<td class="px-4 py-3 text-on-surface-variant whitespace-nowrap">' + escapeHtml(c.phoneNumber || '—') + '</td>' +
            '<td class="px-4 py-3 text-on-surface-variant whitespace-nowrap">' + escapeHtml(c.currentPlanName || '—') + '</td>' +
            '<td class="px-4 py-3 whitespace-nowrap"><span class="text-xs font-bold ' + (isActive ? 'text-secondary' : 'text-error') + '">' + (isActive ? 'Active' : 'Expired') + '</span></td>' +
            '<td class="px-4 py-3 text-on-surface-variant whitespace-nowrap">' + escapeHtml(c.contractEnd || '—') + '</td>' +
            '<td class="px-4 py-3 whitespace-nowrap">' +
            '<div class="flex gap-2">' +
            '<button class="px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/30 hover:border-primary transition-colors font-bold text-xs" onclick="openRenewModal(window.__customer_' + i + ')" type="button">Edit</button>' +
            '<button class="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/30 hover:border-error hover:text-error flex items-center justify-center" onclick="deleteCustomer(' + "'" + c.phoneNumber + "'" + ')" title="Delete customer" type="button">' +
            '<span class="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>' +
            '</button>' +
            '</div>' +
            '</td>' +
            '</tr>'
        );
    }).join('');

    wrap.innerHTML =
        '<table class="w-full text-sm">' +
        '<thead><tr class="text-left text-label-sm text-on-surface-variant uppercase tracking-wide border-b border-outline-variant/20">' +
        '<th class="px-4 py-3">Name</th><th class="px-4 py-3">Phone</th><th class="px-4 py-3">Plan</th>' +
        '<th class="px-4 py-3">Status</th><th class="px-4 py-3">Contract End</th><th class="px-4 py-3">Actions</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '</table>';
}

function exportCustomersCsv() {
    if (!allCustomersCache.length) {
        showToast('Nothing to export yet — load the customer list first.');
        return;
    }

    const columns = ['phoneNumber', 'name', 'birthdate', 'arcNumber', 'country', 'carrier', 'simType', 'currentPlanName', 'contractStart', 'contractEnd', 'firstPurchaseDate'];

    function csvEscape(value) {
        const str = value == null ? '' : String(value);
        if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
        return str;
    }

    const lines = [columns.join(',')];
    allCustomersCache.forEach(function (c) {
        lines.push(columns.map(function (col) { return csvEscape(c[col]); }).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers-' + todayIso() + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ---------- upsert modal (activate / renew / new) ----------

let upsertMode = 'new'; // 'activate' | 'renew' | 'new'
let upsertOrderId = '';

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function openUpsertModal(title, subtitle, prefill, phoneEditable) {
    document.getElementById('upsert-modal-title').textContent = title;
    document.getElementById('upsert-modal-subtitle').textContent = subtitle;
    document.getElementById('upsert-error').classList.add('hidden');

    document.getElementById('field-name').value = prefill.name || '';
    document.getElementById('field-phone').value = prefill.phoneNumber || '';
    document.getElementById('field-phone').disabled = !phoneEditable;
    document.getElementById('field-birthdate').value = prefill.birthdate || '';
    document.getElementById('field-arc').value = prefill.arcNumber || '';
    document.getElementById('field-country').value = prefill.country || '';
    document.getElementById('field-carrier').value = prefill.carrier || 'SKT';
    document.getElementById('field-sim-type').value = prefill.simType || 'eSIM';
    document.getElementById('field-plan-name').value = prefill.currentPlanName || '';
    document.getElementById('field-contract-start').value = prefill.contractStart || todayIso();
    document.getElementById('field-contract-end').value = prefill.contractEnd || '';
    document.getElementById('field-first-purchase').value = prefill.firstPurchaseDate || todayIso();

    const modal = document.getElementById('upsert-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeUpsertModal() {
    const modal = document.getElementById('upsert-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

function openActivateModal(orderId) {
    adminFetch('/.netlify/functions/admin-list-orders', { includeActivated: true })
        .then(function (data) {
            const order = (data.orders || []).find(function (o) { return o.id === orderId; });
            if (!order) { showToast('Order not found — try refreshing the queue.'); return; }
            upsertMode = 'activate';
            upsertOrderId = orderId;
            openUpsertModal('Activate Customer', 'Confirm details and add the ARC number from their ID.', {
                name: order.name,
                phoneNumber: order.phoneNumber,
                birthdate: order.birthdate,
                currentPlanName: order.planName,
                contractStart: todayIso()
            }, false);
        })
        .catch(function (error) {
            if (error.message !== 'unauthorized') showToast(error.message);
        });
}

function openNewCustomerModal() {
    upsertMode = 'new';
    upsertOrderId = '';
    openUpsertModal('New Customer', 'For a walk-in with no online reservation.', {}, true);
}

function openRenewModal(customer) {
    upsertMode = 'renew';
    upsertOrderId = '';
    openUpsertModal('Edit / Renew Customer', 'Changing the plan automatically archives the old one.', customer, false);
}

function saveUpsert() {
    const errorEl = document.getElementById('upsert-error');
    errorEl.classList.add('hidden');

    const payload = {
        orderId: upsertOrderId,
        name: document.getElementById('field-name').value.trim(),
        phoneNumber: document.getElementById('field-phone').value.trim(),
        birthdate: document.getElementById('field-birthdate').value,
        arcNumber: document.getElementById('field-arc').value.trim(),
        country: document.getElementById('field-country').value.trim(),
        carrier: document.getElementById('field-carrier').value,
        simType: document.getElementById('field-sim-type').value,
        currentPlanName: document.getElementById('field-plan-name').value.trim(),
        contractStart: document.getElementById('field-contract-start').value,
        contractEnd: document.getElementById('field-contract-end').value,
        firstPurchaseDate: document.getElementById('field-first-purchase').value
    };

    if (!payload.name || !payload.phoneNumber || !payload.birthdate || !payload.currentPlanName) {
        errorEl.textContent = 'Name, phone, birthdate, and plan name are required.';
        errorEl.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('upsert-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    adminFetch('/.netlify/functions/admin-upsert-customer', payload)
        .then(function () {
            closeUpsertModal();
            showToast('Saved.');
            loadQueue();
            const customerSearchInput = document.getElementById('customer-search-input');
            if (customerSearchInput.value.trim()) searchCustomers();
        })
        .catch(function (error) {
            if (error.message === 'unauthorized') return;
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        })
        .finally(function () {
            btn.disabled = false;
            btn.textContent = 'Save';
        });
}

// ---------- helpers ----------

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(function () { toast.classList.add('hidden'); }, 2500);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeUpsertModal();
});

document.addEventListener('DOMContentLoaded', function () {
    if (getStoredPassword()) showPanel();
});
