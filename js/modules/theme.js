/**
 * ThemeModule — controls the design system's two axes:
 *   data-theme    = "dark" | "light"
 *   data-variant  = "noc"  | "apple"
 *
 * Both attributes go on <html> and are picked up by css/design.css.
 * Persisted to localStorage so the user's choice survives reloads.
 */
const ThemeModule = {

    THEME_KEY:   'vwrt_theme',
    VARIANT_KEY: 'vwrt_variant',

    init: function () {
        const theme   = localStorage.getItem(this.THEME_KEY)   || 'dark';
        const variant = localStorage.getItem(this.VARIANT_KEY) || 'apple';

        this.applyTheme(theme);
        this.applyVariant(variant);

        const btn = document.getElementById('btn-theme-toggle');
        if (btn) btn.addEventListener('click', () => this.toggleTheme());
    },

    // ---------- Theme (dark / light) ----------
    applyTheme: function (theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.THEME_KEY, theme);
        this.updateIcon(theme);
    },

    toggleTheme: function () {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        this.applyTheme(current === 'dark' ? 'light' : 'dark');
    },

    // ---------- Variant (noc / apple) ----------
    applyVariant: function (variant) {
        if (variant !== 'noc' && variant !== 'apple') variant = 'noc';
        document.documentElement.setAttribute('data-variant', variant);
        localStorage.setItem(this.VARIANT_KEY, variant);
    },

    toggleVariant: function () {
        const current = document.documentElement.getAttribute('data-variant') || 'noc';
        this.applyVariant(current === 'noc' ? 'apple' : 'noc');
    },

    // Header sun/moon icon
    updateIcon: function (theme) {
        const iconContainer = document.querySelector('#btn-theme-toggle .icon-btn');
        if (!iconContainer) return;

        if (theme === 'dark') {
            iconContainer.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        } else {
            iconContainer.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        }
    },
};

// Backwards compat: some modules call ThemeModule.toggle()
ThemeModule.toggle = ThemeModule.toggleTheme;

window.ThemeModule = ThemeModule;
