// ===== iPhone Configurator (Buy Phone) =====

// ---- Product catalog ----
// NOTE: Prices are estimated store prices in KRW — these are just the
// starting defaults. The price shown on the page is editable and, once
// changed, is remembered per model + storage + color in this browser.
const CATALOG = {
    iphone17: {
        name: "iPhone 17",
        storage: [
            { label: "256GB", price: 1250000 },
            { label: "512GB", price: 1550000 }
        ],
        colors: [
            { key: "black", label: "Black", hex: "#3a3a3c", image: "assets/phones/iphone-17-black.jpg" },
            { key: "white", label: "White", hex: "#f2f2ee", image: "assets/phones/iphone-17-white.jpg" },
            { key: "blue", label: "Blue", hex: "#a9c0da", image: "assets/phones/iphone-17-blue.jpg" },
            { key: "green", label: "Green", hex: "#b7c49a", image: "assets/phones/iphone-17-green.jpg" },
            { key: "lavender", label: "Lavender", hex: "#d9cbe4", image: "assets/phones/iphone-17-lavender.jpg" }
        ]
    },
    iphone17pro: {
        name: "iPhone 17 Pro",
        storage: [
            { label: "256GB", price: 1550000 },
            { label: "512GB", price: 1850000 },
            { label: "1TB", price: 2150000 }
        ],
        colors: [
            { key: "silver", label: "Silver", hex: "#e3e3e0", image: "assets/phones/iphone-17-pro-silver.jpg" },
            { key: "navy", label: "Deep Blue", hex: "#34405a", image: "assets/phones/iphone-17-pro-navy.jpg" },
            { key: "orange", label: "Cosmic Orange", hex: "#d97a3f", image: "assets/phones/iphone-17-pro-orange.jpg" }
        ]
    }
};

const BANK_FEE_RATE = 0.059;   // fixed 5.9% bank fee on the financed amount
const INSTALLMENT_MONTHS = 24; // fixed 24-month installment term
const PLAN_FEE = 56250;        // fixed 5G plan fee added to every monthly payment
const PRICE_STORAGE_PREFIX = "buyphone_price_"; // localStorage key prefix

// ---- State ----
let state = {
    model: null,
    storageIndex: null,
    colorIndex: null
};
let savedBadgeTimer = null;

// ---- Elements ----
const modelOptionsEl = document.getElementById('model-options');
const storageStepEl = document.getElementById('step-storage');
const storageOptionsEl = document.getElementById('storage-options');
const colorStepEl = document.getElementById('step-color');
const colorOptionsEl = document.getElementById('color-options');
const colorNameEl = document.getElementById('color-name');
const priceStepEl = document.getElementById('step-price');
const resultsStepEl = document.getElementById('step-results');
const productImageEl = document.getElementById('product-image');
const productTitleEl = document.getElementById('product-title');
const productSubtitleEl = document.getElementById('product-subtitle');
const phonePriceInput = document.getElementById('phone-price-input');
const priceSavedBadge = document.querySelector('.price-saved-badge');
const storeDiscountInput = document.getElementById('store-discount-input');
const downPaymentInput = document.getElementById('down-payment-input');

// ---- Helpers ----
function colorLabel(color) {
    const key = 'color_' + color.key;
    if (typeof t === 'function') {
        const translated = t(key);
        if (translated !== key) return translated;
    }
    return color.label;
}

function formatWon(amount) {
    const rounded = Math.round(amount);
    return (rounded < 0 ? '-' : '') + '₩' + Math.abs(rounded).toLocaleString('en-US');
}

function parseAmount(inputEl) {
    const digitsOnly = inputEl.value.replace(/[^0-9]/g, '');
    return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

function formatInputWithCommas(inputEl) {
    const digitsOnly = inputEl.value.replace(/[^0-9]/g, '');
    inputEl.value = digitsOnly ? parseInt(digitsOnly, 10).toLocaleString('en-US') : '';
}

function swapProductImage(newSrc) {
    productImageEl.classList.add('is-swapping');
    window.setTimeout(() => {
        productImageEl.src = newSrc;
        productImageEl.classList.remove('is-swapping');
    }, 150);
}

// ---- Custom price persistence (per model + storage + color) ----
function priceKey(modelKey, storageLabel, colorKey) {
    return PRICE_STORAGE_PREFIX + modelKey + '_' + storageLabel + '_' + colorKey;
}

function loadSavedPrice(modelKey, storageLabel, colorKey) {
    try {
        const raw = localStorage.getItem(priceKey(modelKey, storageLabel, colorKey));
        return raw ? parseInt(raw, 10) : null;
    } catch (e) {
        return null;
    }
}

function saveCurrentPrice() {
    if (state.model === null) return;
    const product = CATALOG[state.model];
    const storage = product.storage[state.storageIndex];
    const color = product.colors[state.colorIndex];
    try {
        localStorage.setItem(priceKey(state.model, storage.label, color.key), String(parseAmount(phonePriceInput)));
    } catch (e) {
        // localStorage unavailable — edits still work for this session
    }
    priceSavedBadge.classList.add('is-visible');
    window.clearTimeout(savedBadgeTimer);
    savedBadgeTimer = window.setTimeout(() => priceSavedBadge.classList.remove('is-visible'), 1800);
}

// ---- Step 1: Model selection ----
modelOptionsEl.querySelectorAll('.model-card').forEach((btn) => {
    btn.addEventListener('click', () => {
        const modelKey = btn.getAttribute('data-model');
        selectModel(modelKey);
    });
});

function selectModel(modelKey) {
    state.model = modelKey;
    state.storageIndex = 0;
    state.colorIndex = 0;

    modelOptionsEl.querySelectorAll('.model-card').forEach((btn) => {
        btn.classList.toggle('is-selected', btn.getAttribute('data-model') === modelKey);
    });

    renderStorageOptions();
    renderColorOptions();
    storageStepEl.classList.add('is-visible');
    colorStepEl.classList.add('is-visible');
    priceStepEl.classList.add('is-visible');
    resultsStepEl.classList.add('is-visible');

    updateProductDisplay();
    calculate();
}

// ---- Step 2: Storage selection ----
function renderStorageOptions() {
    const product = CATALOG[state.model];
    storageOptionsEl.innerHTML = '';
    product.storage.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'storage-pill glass-panel rounded-full px-5 py-2.5 border-2 border-transparent text-sm font-bold text-on-surface' + (index === state.storageIndex ? ' is-selected' : '');
        btn.innerHTML = `<span>${option.label}</span> <span class="opacity-70 font-medium">· ₩${option.price.toLocaleString('en-US')}</span>`;
        btn.addEventListener('click', () => {
            state.storageIndex = index;
            renderStorageOptions();
            updateProductDisplay();
            calculate();
        });
        storageOptionsEl.appendChild(btn);
    });
}

// ---- Step 3: Color selection ----
function renderColorOptions() {
    const product = CATALOG[state.model];
    colorOptionsEl.innerHTML = '';
    product.colors.forEach((color, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-swatch' + (index === state.colorIndex ? ' is-selected' : '');
        btn.style.backgroundColor = color.hex;
        btn.setAttribute('aria-label', colorLabel(color));
        btn.addEventListener('click', () => {
            state.colorIndex = index;
            renderColorOptions();
            updateProductDisplay();
        });
        colorOptionsEl.appendChild(btn);
    });
    colorNameEl.textContent = colorLabel(product.colors[state.colorIndex]);
}

// ---- Live product display ----
function updateProductDisplay() {
    const product = CATALOG[state.model];
    const storage = product.storage[state.storageIndex];
    const color = product.colors[state.colorIndex];

    swapProductImage(color.image);
    productTitleEl.textContent = product.name;
    productSubtitleEl.textContent = `${storage.label} · ${colorLabel(color)}`;
    colorNameEl.textContent = colorLabel(color);

    const saved = loadSavedPrice(state.model, storage.label, color.key);
    const price = saved !== null ? saved : storage.price;
    phonePriceInput.value = price.toLocaleString('en-US');
    priceSavedBadge.classList.remove('is-visible');
}

// ---- Step 4: Price (editable) + Calculation ----
phonePriceInput.addEventListener('input', () => {
    formatInputWithCommas(phonePriceInput);
    calculate();
    saveCurrentPrice();
});

function calculate() {
    if (state.model === null) return;

    const phonePrice = parseAmount(phonePriceInput);
    const storeDiscount = parseAmount(storeDiscountInput);
    const downPayment = parseAmount(downPaymentInput);

    const discountedPrice = Math.max(phonePrice - storeDiscount, 0);
    const amountFinanced = Math.max(discountedPrice - downPayment, 0);
    const bankFee = amountFinanced * BANK_FEE_RATE;
    const financedTotal = amountFinanced + bankFee;
    const installment = financedTotal / INSTALLMENT_MONTHS;
    const totalMonthly = installment + PLAN_FEE;

    document.getElementById('result-phone-price').textContent = formatWon(phonePrice);
    document.getElementById('result-store-discount').textContent = storeDiscount ? '-' + formatWon(storeDiscount) : formatWon(0);
    document.getElementById('result-discounted-price').textContent = formatWon(discountedPrice);
    document.getElementById('result-down-payment').textContent = downPayment ? '-' + formatWon(downPayment) : formatWon(0);
    document.getElementById('result-amount-financed').textContent = formatWon(amountFinanced);
    document.getElementById('result-bank-fee').textContent = formatWon(bankFee);
    document.getElementById('result-financed-total').textContent = formatWon(financedTotal);
    document.getElementById('result-installment').textContent = formatWon(installment);
    document.getElementById('result-plan-fee').textContent = formatWon(PLAN_FEE);
    document.getElementById('result-total-monthly').textContent = formatWon(totalMonthly);
}

[storeDiscountInput, downPaymentInput].forEach((inputEl) => {
    inputEl.addEventListener('input', () => {
        formatInputWithCommas(inputEl);
        calculate();
    });
});

// ---- Initial state: preselect iPhone 17 so the page isn't empty ----
selectModel('iphone17');

// Re-render color names / subtitle whenever the site language changes.
document.addEventListener('site:languagechange', () => {
    if (state.model === null) return;
    renderColorOptions();
    updateProductDisplay();
});
