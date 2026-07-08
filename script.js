function toggleFaq(button) {
    const content = button.nextElementSibling;
    const icon = button.querySelector('.material-symbols-outlined');

    // Close other items
    const allItems = document.querySelectorAll('#faq .glass-panel > div:nth-child(2)');
    const allIcons = document.querySelectorAll('#faq .glass-panel .material-symbols-outlined');

    allItems.forEach((item, idx) => {
        if (item !== content) {
            item.style.maxHeight = null;
            allIcons[idx].style.transform = 'rotate(0deg)';
        }
    });

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = 'rotate(45deg)';
    }
}

const qrSources = {
    whatsapp: 'assets/qr-whatsapp.png',
    kakao: 'assets/qr-kakao.png',
    wechat: 'assets/qr-wechat.png',
    instagram: 'assets/qr-instagram.png'
};

function showQrModal(key, label, color) {
    const modal = document.getElementById('qr-modal');
    const image = document.getElementById('qr-modal-image');
    const title = document.getElementById('qr-modal-title');
    const iconWrap = document.getElementById('qr-modal-icon-wrap');

    image.src = qrSources[key] || '';
    image.alt = label + ' QR code';
    title.textContent = 'Scan to connect on ' + label;
    iconWrap.style.backgroundColor = color + '33';
    iconWrap.style.color = color;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeQrModal() {
    const modal = document.getElementById('qr-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeQrModal();
        closeSelectModal();
    }
});

const BUSINESS_WHATSAPP = '821096792052'; // +82 10-9679-2052, no leading zero, no symbols
const BUSINESS_INSTAGRAM = '365himobile';

let selectedPlanName = '';
let selectedPlanPrice = '';

function openSelectModal(planName, planPrice) {
    selectedPlanName = planName;
    selectedPlanPrice = planPrice;

    const modal = document.getElementById('select-modal');
    const title = document.getElementById('select-modal-title');
    const subtitle = document.getElementById('select-modal-subtitle');

    title.textContent = 'Contact us about ' + planName;
    subtitle.textContent = planPrice + " — choose how you'd like to reach us";

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeSelectModal() {
    const modal = document.getElementById('select-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

function contactViaWhatsApp() {
    const message = `Hi, I'd like to sign up for ${selectedPlanName} - ${selectedPlanPrice}`;
    const url = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeSelectModal();
}

function contactViaInstagram() {
    window.open(`https://instagram.com/${BUSINESS_INSTAGRAM}`, '_blank');
    closeSelectModal();
}

function contactWhatsAppGeneric() {
    const message = "Hi, I'd like to know more about your SIM/eSIM plans.";
    const url = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.add('hidden');
}

function switchTab(tab) {
    const prepaidBtn = document.getElementById('tab-prepaid');
    const postpaidBtn = document.getElementById('tab-postpaid');
    const prepaidSec = document.getElementById('section-prepaid');
    const postpaidSec = document.getElementById('section-postpaid');

    if (tab === 'prepaid') {
        prepaidBtn.classList.add('bg-primary', 'text-surface-container-lowest', 'shadow-md');
        prepaidBtn.classList.remove('text-on-surface-variant', 'hover:text-on-surface', 'bg-transparent');

        postpaidBtn.classList.remove('bg-primary', 'text-surface-container-lowest', 'shadow-md');
        postpaidBtn.classList.add('text-on-surface-variant', 'hover:text-on-surface', 'bg-transparent');

        prepaidSec.classList.remove('hidden');
        postpaidSec.classList.add('hidden');
        prepaidSec.style.display = '';
        postpaidSec.style.display = 'none';
    } else {
        postpaidBtn.classList.add('bg-primary', 'text-surface-container-lowest', 'shadow-md');
        postpaidBtn.classList.remove('text-on-surface-variant', 'hover:text-on-surface', 'bg-transparent');

        prepaidBtn.classList.remove('bg-primary', 'text-surface-container-lowest', 'shadow-md');
        prepaidBtn.classList.add('text-on-surface-variant', 'hover:text-on-surface', 'bg-transparent');

        postpaidSec.classList.remove('hidden');
        prepaidSec.classList.add('hidden');
        postpaidSec.style.display = '';
        prepaidSec.style.display = 'none';
    }
}

// Ensure the prepaid tab is active on page load, regardless of CSS timing
document.addEventListener('DOMContentLoaded', function () {
    switchTab('prepaid');
});
