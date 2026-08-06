// ===== Installment Checker =====
// Fixed business rules (per store policy):
const BANK_FEE_RATE = 0.059;   // 5.9% bank fee on the financed amount
const INSTALLMENT_MONTHS = 24; // fixed 24-month installment term
const PLAN_FEE = 56250;        // fixed 5G plan fee added to every monthly payment

const phonePriceInput = document.getElementById('phone-price-input');
const storeDiscountInput = document.getElementById('store-discount-input');
const downPaymentInput = document.getElementById('down-payment-input');

function formatWon(amount) {
    const rounded = Math.round(amount);
    return (rounded < 0 ? '-' : '') + '₩' + Math.abs(rounded).toLocaleString('en-US');
}

// Strip everything except digits so users can type with or without commas
function parseAmount(inputEl) {
    const digitsOnly = inputEl.value.replace(/[^0-9]/g, '');
    return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

// Reformat the input itself with thousands separators as the user types
function formatInputWithCommas(inputEl) {
    const digitsOnly = inputEl.value.replace(/[^0-9]/g, '');
    inputEl.value = digitsOnly ? parseInt(digitsOnly, 10).toLocaleString('en-US') : '';
}

function calculate() {
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

[phonePriceInput, storeDiscountInput, downPaymentInput].forEach((inputEl) => {
    inputEl.addEventListener('input', () => {
        formatInputWithCommas(inputEl);
        calculate();
    });
});

calculate();
