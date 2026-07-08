const translations = {
    en: {
        nav_plans: "PLANS", nav_faq: "FAQ", nav_contact: "CONTACT", nav_location: "LOCATION",
        hero_badge: "🇰🇷 Korea's Fast & Reliable SIM Provider",
        hero_title: "Stay Connected Anywhere in <br><span class=\"gradient-text\">Korea.</span>",
        hero_subtitle: "Choose the right SIM plan for your stay. Do you have a Korean Resident Card?",
        arc_yes_title: "I Have an ARC", arc_no_title: "No ARC",
        arc_yes_cta: "→ Postpaid Plans", arc_no_cta: "→ Prepaid Plans",
        h_how_it_works: "How It Works", h_choose_plan: "Choose Your Plan",
        tab_prepaid: "PREPAID PLANS", tab_postpaid: "POSTPAID PLANS",
        h_compare: "Plan Comparison", h_testimonials: "What Our Customers Say",
        h_faq: "Frequently Asked Questions", h_contact: "Need Help?", h_location: "Visit Our Store"
    },
    ko: {
        nav_plans: "요금제", nav_faq: "자주 묻는 질문", nav_contact: "문의하기", nav_location: "매장 위치",
        hero_badge: "🇰🇷 한국의 빠르고 믿을 수 있는 SIM 제공업체",
        hero_title: "한국 어디서나 연결하세요<br><span class=\"gradient-text\">지금.</span>",
        hero_subtitle: "체류에 맞는 SIM 요금제를 선택하세요. 외국인등록증(ARC)이 있으신가요?",
        arc_yes_title: "ARC가 있어요", arc_no_title: "ARC가 없어요",
        arc_yes_cta: "→ 후불 요금제 보기", arc_no_cta: "→ 선불 요금제 보기",
        h_how_it_works: "이용 방법", h_choose_plan: "요금제 선택",
        tab_prepaid: "선불 요금제", tab_postpaid: "후불 요금제",
        h_compare: "요금제 비교", h_testimonials: "고객 후기",
        h_faq: "자주 묻는 질문", h_contact: "도움이 필요하신가요?", h_location: "매장 방문"
    },
    zh: {
        nav_plans: "套餐", nav_faq: "常见问题", nav_contact: "联系我们", nav_location: "门店位置",
        hero_badge: "🇰🇷 韩国快速可靠的SIM卡服务商",
        hero_title: "随时随地连接韩国<br><span class=\"gradient-text\">网络。</span>",
        hero_subtitle: "选择适合您行程的SIM套餐。您有韩国外国人登录证(ARC)吗？",
        arc_yes_title: "我有ARC", arc_no_title: "我没有ARC",
        arc_yes_cta: "→ 查看后付费套餐", arc_no_cta: "→ 查看预付费套餐",
        h_how_it_works: "使用方法", h_choose_plan: "选择您的套餐",
        tab_prepaid: "预付费套餐", tab_postpaid: "后付费套餐",
        h_compare: "套餐对比", h_testimonials: "客户评价",
        h_faq: "常见问题", h_contact: "需要帮助？", h_location: "参观我们的门店"
    }
};

function setLanguage(lang) {
    const dict = translations[lang] || translations.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] === undefined) return;
        if (el.getAttribute('data-i18n-html') === 'true') {
            el.innerHTML = dict[key];
        } else {
            el.textContent = dict[key];
        }
    });
    document.querySelectorAll('[data-lang-btn]').forEach(btn => {
        btn.classList.toggle('text-primary', btn.getAttribute('data-lang-btn') === lang);
    });
    try { localStorage.setItem('site_lang', lang); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function () {
    let saved = 'en';
    try { saved = localStorage.getItem('site_lang') || 'en'; } catch (e) {}
    setLanguage(saved);
});

// ===== Customer Reviews (Firebase Firestore) =====
// TODO: replace with your own Firebase project config (see setup instructions provided)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let db = null;
try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
} catch (e) {
    console.error('Firebase init failed', e);
}

let selectedRating = 0;

function initStarPicker() {
    const stars = document.querySelectorAll('#review-star-picker .star-pick');
    stars.forEach(star => {
        star.addEventListener('click', function () {
            selectedRating = parseInt(this.getAttribute('data-value'), 10);
            document.getElementById('review-rating').value = selectedRating;
            stars.forEach(s => {
                const val = parseInt(s.getAttribute('data-value'), 10);
                if (val <= selectedRating) {
                    s.style.fontVariationSettings = "'FILL' 1";
                    s.classList.remove('text-outline-variant');
                    s.classList.add('text-tertiary');
                } else {
                    s.style.fontVariationSettings = "'FILL' 0";
                    s.classList.remove('text-tertiary');
                    s.classList.add('text-outline-variant');
                }
            });
        });
    });
}

function renderStars(container, rating) {
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.className = 'material-symbols-outlined text-[18px]';
        s.style.fontVariationSettings = i <= rating ? "'FILL' 1" : "'FILL' 0";
        s.textContent = 'star';
        container.appendChild(s);
    }
}

async function loadReviews() {
    const list = document.getElementById('reviews-list');
    const loading = document.getElementById('reviews-loading');
    if (!db) {
        if (loading) loading.textContent = 'Reviews are not connected yet.';
        return;
    }
    try {
        const snapshot = await db.collection('reviews').orderBy('timestamp', 'desc').limit(50).get();
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p class="text-center text-sm text-on-surface-variant">No reviews yet — be the first to write one!</p>';
            return;
        }
        let total = 0;
        let count = 0;
        snapshot.forEach(doc => {
            const r = doc.data();
            total += r.rating || 0;
            count++;
            const card = document.createElement('div');
            card.className = 'glass-panel rounded-[24px] p-6';
            const starsHtml = Array.from({length: 5}, (_, i) =>
                `<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${i < (r.rating || 0) ? 1 : 0};">star</span>`
            ).join('');
            card.innerHTML = `
                <div class="flex gap-0.5 mb-2 text-tertiary">${starsHtml}</div>
                <p class="text-sm text-on-surface-variant leading-relaxed mb-3">${escapeHtml(r.comment || '')}</p>
                <p class="font-bold text-on-surface text-sm">— ${escapeHtml(r.name || 'Anonymous')}</p>
            `;
            list.appendChild(card);
        });
        if (count > 0) {
            const avg = (total / count).toFixed(1);
            document.getElementById('review-average').textContent = avg;
            document.getElementById('review-count').textContent = `(${count} review${count === 1 ? '' : 's'})`;
            renderStars(document.getElementById('review-average-stars'), Math.round(total / count));
            document.getElementById('review-average-wrap').style.display = 'flex';
        }
    } catch (e) {
        console.error('Failed to load reviews', e);
        list.innerHTML = '<p class="text-center text-sm text-on-surface-variant">Couldn\'t load reviews right now.</p>';
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function submitReview(event) {
    event.preventDefault();
    const errorEl = document.getElementById('review-error');
    errorEl.classList.add('hidden');

    const name = document.getElementById('review-name').value.trim();
    const comment = document.getElementById('review-text').value.trim();
    const rating = selectedRating;

    if (!name || !comment || rating < 1) {
        errorEl.textContent = 'Please add your name, a rating, and a review.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (!db) {
        errorEl.textContent = 'Reviews are not connected yet — please try again later.';
        errorEl.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('review-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        await db.collection('reviews').add({
            name: name,
            rating: rating,
            comment: comment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('review-form').reset();
        selectedRating = 0;
        document.querySelectorAll('#review-star-picker .star-pick').forEach(s => {
            s.style.fontVariationSettings = "'FILL' 0";
            s.classList.remove('text-tertiary');
            s.classList.add('text-outline-variant');
        });
        await loadReviews();
    } catch (e) {
        console.error('Failed to submit review', e);
        errorEl.textContent = 'Something went wrong submitting your review. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Review';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initStarPicker();
    loadReviews();
});

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
