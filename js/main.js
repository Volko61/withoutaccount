/**
 * Main JavaScript - WithoutAccount
 * Core functionality for the website
 */

(function () {
    'use strict';

    /**
     * Mobile Menu Toggle
     */
    function initMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const closeButton = document.getElementById('mobile-menu-close');
        const mobileMenu = document.getElementById('mobile-menu');

        if (menuButton && mobileMenu) {
            menuButton.addEventListener('click', () => {
                mobileMenu.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeButton && mobileMenu) {
            closeButton.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close menu when clicking a link
        const mobileLinks = mobileMenu?.querySelectorAll('a');
        mobileLinks?.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /**
     * Smooth scroll for anchor links
     */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                // Only prevent default if it's a valid ID selector
                if (href && href.startsWith('#') && href.length > 1) {
                    e.preventDefault();
                    try {
                        const target = document.querySelector(href);
                        if (target) {
                            target.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    } catch (err) {
                        // Ignore invalid selectors
                        console.warn('Smooth scroll failed for selector:', href);
                    }
                }
            });
        });
    }

    /**
     * Header scroll effect
     */
    function initHeaderScroll() {
        const header = document.getElementById('header');
        if (!header) return;

        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                header.classList.add('shadow-md');
            } else {
                header.classList.remove('shadow-md');
            }

            lastScroll = currentScroll;
        });
    }

    /**
     * Intersection Observer for fade-in animations
     */
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Analytics Integration
     */
    function initAnalytics() {
        // Track Theme Toggle
        const themeToggleBtn = document.querySelector('[data-theme-toggle]');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const isDark = document.documentElement.classList.contains('dark'); // State before toggle finishes? No, usually after.
                // Creating a small timeout to get state after toggle or just infer
                setTimeout(() => {
                    const newMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                    if (window.umami) window.umami.track('Theme Change', { mode: newMode });
                }, 100);
            });
        }

        // Track Navigation Links
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (window.umami) window.umami.track('Link Click', { href: href, text: link.innerText });
            });
        });

        // Track Errors
        window.addEventListener('error', (e) => {
            if (window.umami) window.umami.track('JS Error', { message: e.message, filename: e.filename, lineno: e.lineno });
        });
    }

    /**
     * Initialize all functionality
     */
    function init() {
        initMobileMenu();
        initSmoothScroll();
        initHeaderScroll();
        initScrollAnimations();
        initAnalytics();
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();
