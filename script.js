/* ============================================
   Theme tokens (Material Design 3 style)
   Dark is the default; .light overrides below.
   Values are "R G B" triplets so Tailwind's
   color-opacity utilities (e.g. bg-primary/10)
   keep working via rgb(var(--x) / <alpha-value>)
   ============================================ */
:root {
  --color-outline: 135 146 154;
  --color-secondary-container: 0 165 114;
  --color-surface-tint: 123 208 255;
  --color-inverse-primary: 0 102 138;
  --color-tertiary: 225 191 255;
  --color-on-surface-variant: 189 200 209;
  --color-surface-container-high: 34 42 61;
  --color-on-error-container: 255 218 214;
  --color-surface-container-lowest: 6 14 32;
  --color-on-secondary: 0 56 36;
  --color-surface-container: 23 31 51;
  --color-error: 255 180 171;
  --color-surface: 11 19 38;
  --color-surface-bright: 49 57 77;
  --color-primary-container: 56 189 248;
  --color-on-primary: 0 53 74;
  --color-tertiary-container: 206 155 255;
  --color-on-secondary-container: 0 49 31;
  --color-outline-variant: 62 72 79;
  --color-error-container: 147 0 10;
  --color-surface-variant: 45 52 73;
  --color-on-error: 105 0 5;
  --color-background: 11 19 38;
  --color-on-surface: 218 226 253;
  --color-surface-dim: 11 19 38;
  --color-surface-container-highest: 45 52 73;
  --color-on-primary-container: 0 73 101;
  --color-primary: 142 213 255;
  --color-on-tertiary-container: 100 0 172;
  --color-inverse-on-surface: 40 48 68;
  --color-on-tertiary: 73 0 128;
  --color-secondary: 78 222 163;
  --color-on-background: 218 226 253;
  --color-surface-container-low: 19 27 46;
  --color-inverse-surface: 218 226 253;

  /* Raw (non-Tailwind-routed) tokens used directly in custom CSS below */
  --glass-tint: 23 31 51;
  --glass-tint-2: 11 19 38;
  --glass-border: 218 226 253;
  --plan-grad-1: 19 27 46;
  --plan-grad-2: 11 19 38;
  --orb-opacity: 0.15;
}

html.light {
  --color-outline: 115 119 127;
  --color-secondary-container: 164 244 207;
  --color-surface-tint: 0 102 138;
  --color-inverse-primary: 142 213 255;
  --color-tertiary: 105 0 179;
  --color-on-surface-variant: 67 71 78;
  --color-surface-container-high: 228 230 239;
  --color-on-error-container: 65 0 2;
  --color-surface-container-lowest: 245 248 255;
  --color-on-secondary: 255 255 255;
  --color-surface-container: 234 236 244;
  --color-error: 186 26 26;
  --color-surface: 251 252 255;
  --color-surface-bright: 251 252 255;
  --color-primary-container: 196 231 255;
  --color-on-primary: 255 255 255;
  --color-tertiary-container: 240 219 255;
  --color-on-secondary-container: 0 33 15;
  --color-outline-variant: 195 198 207;
  --color-error-container: 255 218 214;
  --color-surface-variant: 222 227 235;
  --color-on-error: 255 255 255;
  --color-background: 245 248 255;
  --color-on-surface: 26 28 30;
  --color-surface-dim: 217 219 227;
  --color-surface-container-highest: 222 225 234;
  --color-on-primary-container: 0 30 44;
  --color-primary: 0 102 138;
  --color-on-tertiary-container: 44 0 81;
  --color-inverse-on-surface: 241 240 244;
  --color-on-tertiary: 255 255 255;
  --color-secondary: 0 105 79;
  --color-on-background: 26 28 30;
  --color-surface-container-low: 240 242 250;
  --color-inverse-surface: 47 48 51;

  --glass-tint: 255 255 255;
  --glass-tint-2: 255 255 255;
  --glass-border: 26 28 30;
  --plan-grad-1: 255 255 255;
  --plan-grad-2: 240 242 250;
  --orb-opacity: 0.08;
}

body {
    font-family: 'Geist', sans-serif;
    min-height: 100dvh;
    background-color: rgb(var(--color-surface-container-lowest));
    color: rgb(var(--color-on-surface));
    transition: background-color 0.3s ease, color 0.3s ease;
}

h1, h2, h3, h4, h5, h6 {
    font-family: 'Sora', sans-serif;
}

.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Offset anchor scrolling so the fixed header doesn't cover section titles */
#plans, #faq, #contact, #location, #compare, #how-it-works, #testimonials, #reviews {
    scroll-margin-top: 96px;
}

/* Modern Glassmorphism */
.glass-card {
    background: rgb(var(--glass-tint-2) / 0.6);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgb(var(--glass-border) / 0.1);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.glass-panel {
    background: linear-gradient(135deg, rgb(var(--glass-tint) / 0.8) 0%, rgb(var(--glass-tint-2) / 0.9) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgb(var(--glass-border) / 0.05);
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* Vibrant Gradients */
.gradient-text {
    background: linear-gradient(to right, #8ed5ff, #ce9bff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

html.light .gradient-text {
    background: linear-gradient(to right, #00668a, #6900b3);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.gradient-bg-vibrant {
    background: linear-gradient(135deg, #00668a 0%, #6400ac 50%, #00a572 100%);
    opacity: var(--orb-opacity);
    filter: blur(80px);
    transition: opacity 0.3s ease;
}

.plan-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, border-color 0.3s ease;
    background: linear-gradient(145deg, rgb(var(--plan-grad-1)), rgb(var(--plan-grad-2)));
    border: 1px solid rgb(var(--color-surface-variant));
    height: 100%;
}
.plan-card:hover {
    transform: translateY(-8px) scale(1.02);
}

/* Plan Specific Hovers */
.plan-a:hover { box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.25); border-color: #3B82F6; }
.plan-b:hover { box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.25); border-color: #10B981; }
.plan-c:hover { box-shadow: 0 20px 40px -10px rgba(139, 92, 246, 0.25); border-color: #8B5CF6; }
.plan-d:hover { box-shadow: 0 20px 40px -10px rgba(245, 158, 11, 0.25); border-color: #F59E0B; }
.plan-e:hover { box-shadow: 0 20px 40px -10px rgba(236, 72, 153, 0.25); border-color: #EC4899; }
.plan-f:hover { box-shadow: 0 20px 40px -10px rgba(6, 182, 212, 0.25); border-color: #06B6D4; }

.shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite linear;
}
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

/* Cursor-following glow/spotlight for cards */
.spotlight {
    position: relative;
}
.spotlight::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(220px circle at var(--x, 50%) var(--y, 50%), rgb(var(--color-primary) / 0.15), transparent 70%);
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;
    z-index: 0;
}
.spotlight:hover::before {
    opacity: 1;
}

/* Theme toggle switch */
.theme-toggle {
    position: relative;
    width: 52px;
    height: 30px;
    border-radius: 9999px;
    background: rgb(var(--color-surface-container-high));
    border: 1px solid rgb(var(--color-outline-variant));
    cursor: pointer;
    transition: background-color 0.3s ease;
    flex-shrink: 0;
}
.theme-toggle .theme-toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    background: rgb(var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
}
html.light .theme-toggle .theme-toggle-knob {
    transform: translateX(22px);
}
.theme-toggle .theme-toggle-knob .material-symbols-outlined {
    font-size: 16px;
    color: rgb(var(--color-surface-container-lowest));
}
