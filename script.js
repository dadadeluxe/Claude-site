(() => {
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Exemples de biens — à remplacer par vos annonces réelles.
  const properties = [
    { title: 'Villa contemporaine', loc: 'À compléter', type: 'vente', kind: 'villa', price: 'Prix sur demande', rooms: 6, area: 280, img: 'photo-1600596542815-ffad4c1539a9' },
    { title: 'Appartement lumineux', loc: 'À compléter', type: 'location', kind: 'appartement', price: 'Loyer sur demande', rooms: 4, area: 120, img: 'photo-1600607687939-ce8a6c25118c' },
    { title: 'Chalet de montagne', loc: 'À compléter', type: 'vente', kind: 'chalet', price: 'Prix sur demande', rooms: 5, area: 210, img: 'photo-1518780664697-55e3ad937233' },
    { title: 'Attique avec terrasse', loc: 'À compléter', type: 'vente', kind: 'appartement', price: 'Prix sur demande', rooms: 4, area: 150, img: 'photo-1600566753190-17f0baa2a6c3' },
    { title: 'Maison familiale', loc: 'À compléter', type: 'location', kind: 'villa', price: 'Loyer sur demande', rooms: 5, area: 180, img: 'photo-1568605114967-8130f3a36994' },
    { title: 'Loft design', loc: 'À compléter', type: 'location', kind: 'appartement', price: 'Loyer sur demande', rooms: 3, area: 95, img: 'photo-1502672260266-1c1ef2d93688' },
  ];

  const icon = {
    rooms: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9l7-6 7 6v8H3z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    area: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    arrow: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15L15 5M7 5h8v8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  };

  const grid = document.getElementById('grid');
  grid.innerHTML = properties.map((p, i) => `
    <a href="#contact" class="card reveal" style="--d:${(i % 3) * 0.1}s" data-type="${p.type}" data-kind="${p.kind}" data-rooms="${p.rooms}">
      <div class="card__media">
        <span class="badge ${p.type === 'location' ? 'badge--loc' : ''}">${p.type === 'vente' ? 'À vendre' : 'À louer'}</span>
        <img src="https://images.unsplash.com/${p.img}?auto=format&fit=crop&w=900&q=75" alt="${p.title}" loading="lazy">
        <span class="card__view">${icon.arrow}</span>
      </div>
      <div class="card__body">
        <span class="card__loc">${p.loc}</span>
        <h3 class="card__title">${p.title}</h3>
        <span class="card__price">${p.price}</span>
        <ul class="card__feats"><li>${icon.rooms}${p.rooms} pièces</li><li>${icon.area}${p.area} m²</li></ul>
      </div>
    </a>`).join('');

  // Filtering (chips + search form)
  const cards = [...grid.children];
  const empty = document.getElementById('empty');
  const chips = document.querySelectorAll('.chip');
  const form = document.getElementById('search');
  let state = { type: '', kind: '', rooms: 0 };

  function apply() {
    let shown = 0;
    cards.forEach(c => {
      const ok = (!state.type || c.dataset.type === state.type) &&
                 (!state.kind || c.dataset.kind === state.kind) &&
                 (+c.dataset.rooms >= state.rooms);
      c.classList.toggle('is-out', !ok);
      if (ok) { shown++; c.classList.add('is-in'); }
    });
    empty.hidden = shown > 0;
    chips.forEach(ch => ch.classList.toggle('is-on', ch.dataset.filter === state.type));
  }
  chips.forEach(ch => ch.addEventListener('click', () => {
    state.type = ch.dataset.filter;
    form.type.value = state.type;
    apply();
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    state = { type: form.type.value, kind: form.kind.value, rooms: +form.rooms.value };
    apply();
    document.getElementById('biens').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  // Scroll reveal
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .reveal-img').forEach(el => io.observe(el));

  // Nav: scrolled state, hide on scroll down, active link, hero parallax
  const nav = document.getElementById('nav');
  const heroMedia = document.querySelector('[data-parallax]');
  let lastY = 0, ticking = false;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 400 && y > lastY && !nav.classList.contains('menu-open'));
    if (heroMedia && !reduce && y < innerHeight) heroMedia.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
    lastY = y; ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  const links = document.querySelectorAll('.nav__links > a');
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(l => {
      const on = l.getAttribute('href') === '#' + e.target.id;
      l.classList.toggle('is-active', on);
      on ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current');
    });
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));

  // Submenu (click/keyboard on all devices, hover on desktop)
  const sub = document.querySelector('.has-sub');
  const toggle = sub.querySelector('.sub-toggle');
  const setSub = open => { sub.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', open); };
  toggle.addEventListener('click', () => setSub(!sub.classList.contains('is-open')));
  const fine = matchMedia('(hover: hover) and (min-width: 961px)');
  sub.addEventListener('mouseenter', () => fine.matches && setSub(true));
  sub.addEventListener('mouseleave', () => fine.matches && setSub(false));
  sub.addEventListener('focusout', e => { if (!sub.contains(e.relatedTarget)) setSub(false); });

  // Mobile menu
  const burger = document.getElementById('burger');
  const setMenu = open => {
    nav.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('menu-open')));
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => { setMenu(false); setSub(false); }));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); setSub(false); } });

  // Mobile submenu needs an inner wrapper for the height animation
  const sm = sub.querySelector('.submenu');
  const inner = document.createElement('div');
  inner.className = 'submenu-inner';
  inner.append(...sm.children);
  sm.append(inner);

  // Contact form (front-end validation only — connect to your mail service)
  const cf = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  cf.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    cf.querySelectorAll('input, textarea').forEach(f => {
      const bad = !f.checkValidity();
      f.parentElement.classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    status.textContent = ok ? 'Merci, votre message est prêt à être envoyé. (Formulaire à connecter à votre messagerie.)' : 'Veuillez compléter les champs indiqués.';
    if (ok) cf.reset();
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
