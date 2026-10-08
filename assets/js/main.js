/* =========================================================================
   Interactions & animations — vanilla JS, aucune dépendance.
   Chaque effet sert à guider l'œil ou à confirmer une action.
   Tout se désactive si le visiteur a demandé à réduire les animations.
   ========================================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  // Coupe uniquement sur les espaces normaux : les espaces insécables
  // (avant « : », « ? », « CHF »…) restent collés à leur mot.
  const WORD_SEP = /([ \t\n\r]+)/;
  const isSpace = (s) => /^[ \t\n\r]+$/.test(s);
  let vh = window.innerHeight;

  /* ---------------------------------------------------------------------
     Titres révélés mot à mot (copie lisible conservée pour les lecteurs
     d'écran, copie animée masquée)
     --------------------------------------------------------------------- */
  function splitWords(el) {
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = el.textContent.replace(/\s+/g, ' ').trim();
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    let i = 0;
    const word = (content) => {
      const w = document.createElement('span');
      w.className = 'w';
      const inner = document.createElement('span');
      inner.className = 'w__i';
      inner.style.setProperty('--i', i++);
      inner.append(content);
      w.append(inner);
      return w;
    };
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(WORD_SEP).forEach((part) => {
          if (part) visual.append(isSpace(part) ? ' ' : word(part));
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') { visual.append(node); return; }
        visual.append(word(node));
      }
    });
    el.textContent = '';
    el.append(sr, visual);
  }
  $$('[data-split]').forEach(splitWords);

  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--d', i));
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------------------------------------------------------------------
     Apparitions au scroll + compteurs de prix
     --------------------------------------------------------------------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (!motionOK || !target) return;
    const from = Math.round(target * 0.4);
    const start = performance.now() + 250;
    const duration = 1100;
    el.textContent = String(from);
    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      el.textContent = String(Math.round(lerp(from, target, 1 - Math.pow(1 - t, 4))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      $$('[data-count]', entry.target).forEach(countUp);
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  /* ---------------------------------------------------------------------
     Navigation : fond au scroll, masquage en descendant, menu mobile,
     indicateur qui suit la section en cours
     --------------------------------------------------------------------- */
  const nav = $('[data-nav]');
  const toggle = nav && $('.nav__toggle', nav);
  const menu = $('#mobile-menu');
  let menuOpen = false;

  const setMenu = (open) => {
    if (!toggle || !menu) return;
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    nav.classList.remove('is-hidden');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(!menuOpen));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }
  if (nav) nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  const navLinks = $$('.nav__links a');
  const indicator = $('.nav__indicator');
  let activeLink = null;

  const moveIndicator = (link) => {
    if (!indicator) return;
    if (!link || !link.offsetWidth) { indicator.classList.remove('is-visible'); return; }
    const appearing = !indicator.classList.contains('is-visible');
    if (appearing) indicator.style.transition = 'none';
    indicator.style.setProperty('--x', `${link.offsetLeft}px`);
    indicator.style.setProperty('--w', `${link.offsetWidth}px`);
    if (appearing) { void indicator.offsetWidth; indicator.style.transition = ''; }
    indicator.classList.add('is-visible');
  };
  navLinks.forEach((link) => link.addEventListener('mouseenter', () => moveIndicator(link)));
  const linksBox = $('.nav__links');
  if (linksBox) linksBox.addEventListener('mouseleave', () => moveIndicator(activeLink));

  const spied = $$('main section[id]');
  if (navLinks.length && spied.length) {
    const spyIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        activeLink = navLinks.find((l) => l.hash === `#${entry.target.id}`) || null;
        navLinks.forEach((l) => {
          const on = l === activeLink;
          l.classList.toggle('is-active', on);
          if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
        });
        moveIndicator(activeLink);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spied.forEach((s) => spyIO.observe(s));
  }

  /* ---------------------------------------------------------------------
     Méthode : la frise se remplit au fil du scroll
     --------------------------------------------------------------------- */
  const stepsBox = $('[data-steps]');
  const stepsLine = stepsBox && $('.steps__line', stepsBox);
  const steps = stepsBox ? $$('.step', stepsBox) : [];

  function updateSteps() {
    if (!stepsBox) return;
    const r = stepsBox.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    const p = motionOK ? clamp((vh * 0.75 - r.top) / (r.height + vh * 0.15), 0, 1) : 1;
    stepsLine.style.setProperty('--p', p.toFixed(3));
    steps.forEach((s, i) => s.classList.toggle('is-lit', p >= (i === 0 ? 0.02 : i / (steps.length - 1) - 0.02)));
  }

  /* ---------------------------------------------------------------------
     Hero : l'éventail de cartes s'ouvre et se redresse au scroll
     --------------------------------------------------------------------- */
  const hero = $('[data-hero]');
  const showcase = $('.showcase');

  function updateShowcase() {
    if (!showcase || !motionOK) return;
    const r = hero.getBoundingClientRect();
    if (r.bottom < 0) return;
    const s = clamp(-r.top / (r.height * 0.55), 0, 1);
    showcase.style.setProperty('--s', s.toFixed(3));
  }

  /* ---------------------------------------------------------------------
     Barre de progression de lecture
     --------------------------------------------------------------------- */
  const progress = $('.progress');

  function updateProgress(y) {
    if (!progress) return;
    const max = root.scrollHeight - vh;
    progress.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : '0');
  }

  /* ---------------------------------------------------------------------
     Barre d'action mobile : apparaît une fois le hero dépassé,
     s'efface quand le formulaire de contact est à l'écran
     --------------------------------------------------------------------- */
  const actionBar = $('[data-action-bar]');
  const contact = $('#contact');

  function updateActionBar() {
    if (!actionBar || !hero) return;
    const pastHero = hero.getBoundingClientRect().bottom < vh * 0.4;
    const atContact = contact && contact.getBoundingClientRect().top < vh * 0.9;
    actionBar.classList.toggle('is-visible', pastHero && !atContact && !menuOpen);
  }

  /* ---------------------------------------------------------------------
     Boucle de scroll (une seule par frame)
     --------------------------------------------------------------------- */
  let anchorY = window.scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 8);
      if (!menuOpen) {
        if (y < 200) {
          nav.classList.remove('is-hidden');
          anchorY = y;
        } else if (Math.abs(y - anchorY) > 10) {
          nav.classList.toggle('is-hidden', y > anchorY);
          anchorY = y;
        }
      }
    }
    updateProgress(y);
    updateShowcase();
    updateSteps();
    updateActionBar();
  }
  const requestUpdate = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', requestUpdate, { passive: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { vh = window.innerHeight; moveIndicator(activeLink); update(); }, 120);
  });

  /* ---------------------------------------------------------------------
     Souris : lumière qui suit le pointeur, relief des cartes cliquables,
     léger mouvement de l'éventail du hero
     --------------------------------------------------------------------- */
  if (finePointer) {
    $$('.card, .way').forEach((card) => {
      const tilts = motionOK && card.matches('.card--link, .plan');
      let frame = 0;
      let last = null;
      const apply = () => {
        frame = 0;
        const { x, y, r } = last;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (tilts) {
          card.style.setProperty('--rx', `${((0.5 - y / r.height) * 5).toFixed(2)}deg`);
          card.style.setProperty('--ry', `${((x / r.width - 0.5) * 5).toFixed(2)}deg`);
        }
      };
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        last = { x: e.clientX - r.left, y: e.clientY - r.top, r };
        if (!frame) frame = requestAnimationFrame(apply);
      });
      if (tilts) {
        card.addEventListener('pointerleave', () => {
          if (frame) { cancelAnimationFrame(frame); frame = 0; }
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
        });
      }
    });

    const stage = $('[data-tilt]');
    if (stage && hero && motionOK) {
      const t = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
      const loop = () => {
        t.x = lerp(t.x, t.tx, 0.07);
        t.y = lerp(t.y, t.ty, 0.07);
        stage.style.setProperty('--ry', `${(t.x * 5).toFixed(2)}deg`);
        stage.style.setProperty('--rx', `${(-t.y * 3).toFixed(2)}deg`);
        const moving = Math.abs(t.x - t.tx) > 0.001 || Math.abs(t.y - t.ty) > 0.001;
        t.raf = moving ? requestAnimationFrame(loop) : 0;
      };
      const kick = () => { if (!t.raf) t.raf = requestAnimationFrame(loop); };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        t.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        t.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        kick();
      });
      hero.addEventListener('pointerleave', () => { t.tx = 0; t.ty = 0; kick(); });
    }
  }

  /* ---------------------------------------------------------------------
     Défilement fluide vers les ancres de la page
     Piloté en JS (même rendu sur tous les navigateurs, compensation de la
     barre de navigation, arrêt immédiat si le visiteur reprend la main).
     --------------------------------------------------------------------- */
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let scrollRun = null;

  function stopScroll() {
    if (!scrollRun) return;
    cancelAnimationFrame(scrollRun.raf);
    root.style.scrollBehavior = '';
    scrollRun.done();
    scrollRun = null;
  }
  ['wheel', 'touchstart', 'keydown'].forEach((type) => window.addEventListener(type, stopScroll, { passive: true }));

  function smoothScrollTo(target) {
    stopScroll();
    const offset = target.id === 'top' ? 0 : parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const max = root.scrollHeight - window.innerHeight;
    const from = window.scrollY;
    const to = clamp(target.getBoundingClientRect().top + from - offset, 0, max);
    const distance = to - from;
    // Assez long pour suivre le mouvement, jamais lent : 0,55 à 1,1 s selon la distance
    const duration = motionOK ? clamp(Math.abs(distance) * 0.35, 550, 1100) : 280;
    return new Promise((resolve) => {
      if (Math.abs(distance) < 2) { resolve(); return; }
      root.style.scrollBehavior = 'auto';
      const start = performance.now();
      scrollRun = { raf: 0, done: resolve };
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        window.scrollTo(0, from + distance * easeInOut(t));
        if (t < 1) {
          scrollRun.raf = requestAnimationFrame(step);
        } else {
          root.style.scrollBehavior = '';
          scrollRun = null;
          resolve();
        }
      };
      scrollRun.raf = requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------------
     Continuité offre → contact : toute la carte d'offre est cliquable,
     l'offre choisie est cochée dans le formulaire et mise en évidence
     --------------------------------------------------------------------- */
  const form = $('[data-form]');

  function flashTarget(el) {
    if (!el || !motionOK) return;
    el.classList.remove('is-target');
    void el.offsetWidth;
    el.classList.add('is-target');
    setTimeout(() => el.classList.remove('is-target'), 1900);
  }

  function selectOffer(value) {
    if (!form) return null;
    const box = $$('input[name="besoin"]', form).find((i) => i.value === value);
    if (!box) return null;
    box.checked = true;
    return box.closest('.choice');
  }

  function flashChoice(choice) {
    if (!choice || !motionOK) return;
    choice.classList.remove('is-flash');
    void choice.offsetWidth;
    choice.classList.add('is-flash');
    setTimeout(() => choice.classList.remove('is-flash'), 1500);
  }

  // Tous les liens internes (#…) : défilement fluide, puis mise en évidence
  // de ce qui attend le visiteur à l'arrivée
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    const choice = a.dataset.offer ? selectOffer(a.dataset.offer) : null;
    smoothScrollTo(target).then(() => {
      if (history.pushState) history.pushState(null, '', hash);
      if (!target.hasAttribute('tabindex') && !target.matches('a, button, input, select, textarea, summary')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
      if (target.matches('.plan')) flashTarget(target);
      flashChoice(choice);
    });
  });

  $$('.plan').forEach((plan) => {
    const cta = $('[data-offer]', plan);
    if (!cta) return;
    plan.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      if (String(window.getSelection())) return;
      cta.click();
    });
  });

  /* ---------------------------------------------------------------------
     Copier l'adresse e-mail (utile si aucune messagerie n'est configurée)
     --------------------------------------------------------------------- */
  const live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  document.body.append(live);

  $$('[data-copy]').forEach((btn) => {
    const label = $('.way__copy-label', btn) || btn;
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (_) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
        area.remove();
      }
      label.textContent = ok ? 'Copié ✓' : 'Sélectionnez l’adresse';
      btn.classList.toggle('is-done', ok);
      live.textContent = ok ? `Adresse ${text} copiée.` : '';
      setTimeout(() => { label.textContent = 'Copier'; btn.classList.remove('is-done'); }, 2200);
    });
  });

  /* ---------------------------------------------------------------------
     FAQ : ouverture et fermeture en douceur
     --------------------------------------------------------------------- */
  $$('.faq__item').forEach((item) => {
    const summary = $('summary', item);
    let anim = null;
    summary.addEventListener('click', (e) => {
      if (!motionOK) return;
      e.preventDefault();
      if (anim) anim.cancel();
      const start = item.offsetHeight;
      const closing = item.open && !item.classList.contains('is-closing');
      let end;
      if (closing) {
        item.classList.add('is-closing');
        end = summary.offsetHeight;
      } else {
        item.classList.remove('is-closing');
        item.open = true;
        end = item.offsetHeight;
      }
      anim = item.animate({ height: [`${start}px`, `${end}px`] }, { duration: 450, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      anim.onfinish = () => {
        anim = null;
        if (closing) { item.open = false; item.classList.remove('is-closing'); }
      };
    });
  });

  /* ---------------------------------------------------------------------
     Formulaire : vérifie les champs puis ouvre la messagerie du visiteur
     avec la demande pré-remplie (aucune donnée ne transite par le site)
     --------------------------------------------------------------------- */
  if (form) {
    const status = $('.form__status', form);
    const submit = $('button[type="submit"]', form);
    const submitLabel = submit && $('.btn__label', submit);
    const rules = {
      nom: (v) => v.trim().length > 1,
      contact: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || v.replace(/[^\d+]/g, '').length >= 9,
    };
    const check = (input) => {
      const rule = rules[input.name];
      if (!rule) return true;
      const ok = rule(input.value);
      const field = input.closest('.field');
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      const error = $('.field__error', field);
      if (error) error.textContent = ok ? '' : input.dataset.error;
      return ok;
    };
    form.addEventListener('input', (e) => {
      if (e.target.closest('.field.is-invalid')) check(e.target);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = Object.keys(rules).map((name) => form.elements[name]).filter((input) => !check(input));
      if (invalid.length) {
        invalid[0].focus();
        status.textContent = 'Il manque une information, voir le champ indiqué.';
        return;
      }
      const data = new FormData(form);
      const besoins = data.getAll('besoin');
      const body = [
        `Nom : ${data.get('nom')}`,
        `Entreprise : ${data.get('entreprise') || '—'}`,
        `Me recontacter : ${data.get('contact')}`,
        `Intéressé par : ${besoins.length ? besoins.join(', ') : '—'}`,
        '',
        data.get('message') || '',
      ].join('\n');
      const subject = `Demande de devis — ${data.get('entreprise') || data.get('nom')}`;
      window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = `Votre messagerie s’ouvre avec la demande pré-remplie : il ne reste qu’à l’envoyer. Rien ne s’ouvre ? Écrivez à ${form.dataset.email} ou appelez le ${form.dataset.phone}.`;
      if (submit && submitLabel) {
        submit.classList.add('is-done');
        submitLabel.textContent = 'Messagerie ouverte ✓';
        setTimeout(() => { submit.classList.remove('is-done'); submitLabel.textContent = 'Envoyer ma demande'; }, 4000);
      }
    });
  }

  /* ---------------------------------------------------------------------
     Démarrage : on attend les polices pour éviter les sauts de mise en page
     --------------------------------------------------------------------- */
  update();
  const fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1000))])
    : Promise.resolve();
  fontsReady.then(() => {
    root.classList.add('is-ready');
    $$('[data-reveal], [data-split]').forEach((el) => revealIO.observe(el));
    moveIndicator(activeLink);
    update();
  });
})();
