/*
 * B. Mooser Immobilier — version 2
 * Motion layer: scroll reveals, hero depth, page transitions, active menu link.
 * Purely additive: it never changes content, links or the theme's own scripts.
 */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) root.classList.remove('v2-motion');
  const motion = root.classList.contains('v2-motion');

  // Active page indicator in the main menu
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('#main-nav .menu-item > a').forEach(a => {
    const path = new URL(a.href, location.href).pathname.replace(/index\.html$/, '');
    if (a.host === location.host && path === here && !/\/v2\/$|^\/$/.test(path)) a.classList.add('v2-current');
  });

  if (!motion) return;

  // ---------- Scroll reveals ----------
  const excluded = el => el.closest('header, .modal, .hero, .lg\\:sticky, [x-cloak], .choices, #filters');
  const STAGGER = 80;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('v2-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.01 });

  function mark(el, delay = 0, cls = 'v2-reveal') {
    if (!el || excluded(el) || el.classList.contains(cls)) return;
    el.classList.add(cls);
    if (delay) el.style.setProperty('--v2-delay', delay + 'ms');
    io.observe(el);
  }

  // Groups whose children reveal in a staggered sequence
  function group(container, childSel) {
    const kids = [...container.querySelectorAll(':scope > ' + childSel)];
    kids.forEach((k, i) => mark(k, Math.min(i % 6, 5) * STAGGER));
  }

  const content = [...document.querySelectorAll('body > div > section, body > div > div > section, main, footer')];
  content.forEach(scope => {
    scope.querySelectorAll('h1, h2, .entry-content > p, .entry-content > ul, .entry-content > ol, .entry-content > h3, .entry-content > h4, .entry-content > .flex, .wpb_text_column, .has-bg-color, .vc_cta3-container')
      .forEach(el => { if (!el.closest('.v2-reveal')) mark(el); });
    scope.querySelectorAll('.md\\:flex > .rounded.overflow-hidden').forEach(el => mark(el, 0, 'v2-reveal-img'));
  });
  document.querySelectorAll('.featured-listings .flex').forEach(g => group(g, 'article'));
  document.querySelectorAll('.grid').forEach(g => { if (!g.closest('header')) group(g, '*'); });
  document.querySelectorAll('footer .footer-grid, footer .container').forEach(g => group(g, 'div'));

  // Search results are rendered and re-rendered by the theme: reveal new cards as they arrive
  const results = document.getElementById('results');
  if (results) {
    const revealCards = () => [...results.children].forEach((c, i) => {
      if (c.classList.contains('v2-reveal')) return;
      mark(c, (i % 3) * STAGGER);
    });
    revealCards();
    new MutationObserver(revealCards).observe(results, { childList: true });
  }

  // Safety net: never leave content hidden (above the viewport, or at the very end of the page)
  const flush = () => {
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    document.querySelectorAll('.v2-reveal:not(.v2-in), .v2-reveal-img:not(.v2-in)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || (atEnd && r.top < innerHeight)) el.classList.add('v2-in');
    });
  };
  setTimeout(flush, 1500);
  addEventListener('scroll', () => {
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) requestAnimationFrame(flush);
  }, { passive: true });
  addEventListener('beforeprint', () => document.querySelectorAll('.v2-reveal, .v2-reveal-img').forEach(el => el.classList.add('v2-in')));

  // ---------- Hero depth (gentle parallax) ----------
  const heroImg = document.querySelector('.hero > img');
  if (heroImg) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      if (y > innerHeight * 1.2) return;
      heroImg.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0) scale(1.04)`;
    };
    heroImg.addEventListener('animationend', update, { once: true });
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  }

  // ---------- Page transitions between internal pages ----------
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target && a.target !== '_self' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (/\.(jpe?g|png|webp|gif|pdf)$/i.test(url.pathname)) return;
    e.preventDefault();
    root.classList.add('v2-leaving');
    setTimeout(() => { location.href = url.href; }, 230);
  });
  addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('v2-leaving'); });
})();
