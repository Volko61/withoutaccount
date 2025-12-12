/**
 * Theme Switcher - WithoutAccount
 * Handles dark/light mode with localStorage persistence
 */

(function () {
    'use strict';

    const THEME_KEY = 'withoutaccount-theme';
    const DARK_CLASS = 'dark';

    /**
     * Get the user's preferred theme
     * Priority: localStorage > system preference > light
     */
    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) {
            return stored;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * Apply the theme to the document
     */
    function applyTheme(theme) {
        const html = document.documentElement;

        if (theme === 'dark') {
            html.classList.add(DARK_CLASS);
        } else {
            html.classList.remove(DARK_CLASS);
        }

        // Update toggle button icons if they exist
        updateToggleIcons(theme);
    }

    /**
     * Update the theme toggle button icons
     */
    function updateToggleIcons(theme) {
        const sunIcon = document.getElementById('theme-sun');
        const moonIcon = document.getElementById('theme-moon');

        if (sunIcon && moonIcon) {
            if (theme === 'dark') {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        }
    }

    /**
     * Toggle between light and dark theme
     */
    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.contains(DARK_CLASS);
        const newTheme = isDark ? 'light' : 'dark';

        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    }

    /**
     * Initialize theme on page load
     */
    function initTheme() {
        const theme = getPreferredTheme();
        applyTheme(theme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only update if user hasn't set a preference
                if (!localStorage.getItem(THEME_KEY)) {
                    applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    // Apply theme immediately to prevent flash
    initTheme();

    // Expose toggle function globally
    window.toggleTheme = toggleTheme;

    // Re-initialize when DOM is ready (for icons)
    document.addEventListener('DOMContentLoaded', () => {
        const theme = getPreferredTheme();
        updateToggleIcons(theme);

        // Attach click handler to theme toggle buttons
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });
    });
})();
