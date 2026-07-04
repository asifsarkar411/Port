/* ==========================================================================
   ANIMATIONS ENGINE
   Add before </body>, after your other scripts:
   <script src="animations.js"></script>

   This auto-detects the class names already used in your CSS
   (.glass-card, .section-title, .skill-card, .project-card, .edu-card,
   .bio-stats div, .detail-item, .data-table tbody tr) — no new HTML
   attributes required. It degrades gracefully if an element isn't present.
   ========================================================================== */
(function () {
    'use strict';

    // Immediate Theme Initialization
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ----------------------------------------------------------------------
       1. SCROLL REVEAL
       Assigns a reveal type per selector, staggers siblings inside the
       same parent container, then watches for viewport entry.
       ---------------------------------------------------------------------- */
    function initScrollReveal() {
        if (prefersReducedMotion) return;

        const groups = [
            { selector: '.section-title', type: 'reveal' },
            { selector: '.about-bio', type: 'reveal-left' },
            { selector: '.education-wrapper .edu-card', type: 'reveal-right', stagger: true },
            { selector: '.skills-grid .skill-card, .skills-grid.glass-card', type: 'reveal-scale', stagger: true },
            { selector: '.projects-grid .project-card', type: 'reveal', stagger: true },
            { selector: '.bio-stats > div', type: 'reveal-scale', stagger: true },
            { selector: '.contact-details .detail-item', type: 'reveal-left', stagger: true },
            { selector: '.styled-form', type: 'reveal-right' },
            { selector: '.data-table tbody tr', type: 'plain', stagger: true }, // handled via .in-view only, no transform class needed
        ];

        const observed = new Set();

        groups.forEach(group => {
            const els = document.querySelectorAll(group.selector);
            els.forEach((el, i) => {
                if (observed.has(el)) return;
                observed.add(el);

                if (group.type !== 'plain') {
                    el.classList.add(group.type);
                }
                if (group.stagger) {
                    el.style.setProperty('--reveal-delay', (i % 8) * 0.08 + 's');
                }
            });
        });

        // Any glass-card not already claimed above still gets a gentle reveal
        document.querySelectorAll('.glass-card').forEach((el, i) => {
            if (!observed.has(el)) {
                el.classList.add('reveal');
                el.style.setProperty('--reveal-delay', (i % 6) * 0.07 + 's');
                observed.add(el);
            }
        });

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        observed.forEach(el => io.observe(el));
    }

    /* ----------------------------------------------------------------------
       2. CLICK RIPPLE — works on any .btn / social icon automatically
       ---------------------------------------------------------------------- */
    function initRipple() {
        const selector = '.btn, .btn-success, .btn-danger, .social-links-contact a, .social-hero a';
        document.addEventListener('click', (e) => {
            const target = e.target.closest(selector);
            if (!target) return;

            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

            target.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }

    /* ----------------------------------------------------------------------
       3. NAV: condense-on-scroll + scrollspy active link
       ---------------------------------------------------------------------- */
    function initNav() {
        const nav = document.querySelector('.glass-nav');
        if (!nav) return;

        const onScroll = () => {
            nav.classList.toggle('nav-scrolled', window.scrollY > 40);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
        if (!links.length) return;

        const sections = links
            .map(link => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);

        if (!sections.length) return;

        const spy = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = '#' + entry.target.id;
                    links.forEach(l => l.classList.toggle('active-link', l.getAttribute('href') === id));
                }
            });
        }, { threshold: 0.4, rootMargin: '-80px 0px -50% 0px' });

        sections.forEach(sec => spy.observe(sec));
    }

    /* ----------------------------------------------------------------------
       4. SCROLL PROGRESS BAR — created automatically, no HTML needed
       ---------------------------------------------------------------------- */
    function initProgressBar() {
        const bar = document.createElement('div');
        bar.className = 'scroll-progress-bar';
        document.body.appendChild(bar);

        const update = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            bar.style.width = pct + '%';
        };
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ----------------------------------------------------------------------
       5. STAT COUNT-UP — parses "150+", "3.5", "20" etc. in .bio-stats strong
       ---------------------------------------------------------------------- */
    function initCounters() {
        const nodes = document.querySelectorAll('.bio-stats strong');
        if (!nodes.length || prefersReducedMotion) return;

        nodes.forEach(node => {
            const raw = node.textContent.trim();
            const match = raw.match(/^([\d.]+)(.*)$/);
            if (!match) return;

            const target = parseFloat(match[1]);
            const suffix = match[2] || '';
            const isFloat = match[1].includes('.');
            node.dataset.done = 'false';

            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && node.dataset.done === 'false') {
                        node.dataset.done = 'true';
                        const duration = 1200;
                        const start = performance.now();

                        function tick(now) {
                            const progress = Math.min((now - start) / duration, 1);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            const value = target * eased;
                            node.textContent = (isFloat ? value.toFixed(1) : Math.round(value)) + suffix;
                            if (progress < 1) requestAnimationFrame(tick);
                            else node.textContent = raw;
                        }
                        requestAnimationFrame(tick);
                        io.unobserve(node);
                    }
                });
            }, { threshold: 0.6 });

            io.observe(node);
        });
    }

    /* ----------------------------------------------------------------------
       6. BACK TO TOP — only activates if #backToTop exists in the HTML
       ---------------------------------------------------------------------- */
    function initBackToTop() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;

        window.addEventListener('scroll', () => {
            btn.classList.toggle('visible', window.scrollY > 500);
        }, { passive: true });

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
    }

    /* ----------------------------------------------------------------------
       7. THEME TOGGLE
       ---------------------------------------------------------------------- */
    function initThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        updateToggleIcon(toggleBtn, currentTheme);

        toggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const target = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            localStorage.setItem('theme', target);
            updateToggleIcon(toggleBtn, target);
        });
    }

    function updateToggleIcon(btn, theme) {
        const icon = btn.querySelector('i');
        if (!icon) return;
        if (theme === 'light') {
            icon.className = 'fas fa-sun';
            icon.style.color = '#fca311';
        } else {
            icon.className = 'fas fa-moon';
            icon.style.color = '';
        }
    }

    /* ----------------------------------------------------------------------
       8. TIMELINE REVEAL
       ---------------------------------------------------------------------- */
    function initTimelineReveal() {
        if (prefersReducedMotion) return;
        const items = document.querySelectorAll('.timeline-item');
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -45px 0px' });
        
        items.forEach(el => io.observe(el));
    }

    // Expose it globally so script.js can invoke it after rendering
    window.initTimelineReveal = initTimelineReveal;

    /* ----------------------------------------------------------------------
       Boot
       ---------------------------------------------------------------------- */
    function init() {
        initThemeToggle();
        initScrollReveal();
        initRipple();
        initNav();
        initProgressBar();
        initCounters();
        initBackToTop();
        initTimelineReveal(); // Run once for static elements if any
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();