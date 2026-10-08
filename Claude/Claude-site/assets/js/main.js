/* =========================================================================
   Lumen — interactions & animations
   Vanilla JS, aucune dépendance. Tout est désactivé proprement si
   l'utilisateur a demandé à réduire les animations.
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
  // Coupe sur les espaces « normaux » uniquement : les espaces insécables
  // (avant « : », « ? », « % »…) restent collés à leur mot.
  const WORD_SEP = /([ \t\n\r]+)/;
  const isSpace = (s) => /^[ \t\n\r]+$/.test(s);

  let vh = window.innerHeight;
  const setViewportVars = () => {
    vh = window.innerHeight;
    root.style.setProperty('--vw', `${root.clientWidth}px`);
  };
  setViewportVars();

  /* ---------------------------------------------------------------------
     Décorations du DOM
     --------------------------------------------------------------------- */
  const ARROW = '<svg class="hover-arrow" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path class="hover-arrow__line" d="M0 5h7"/><path class="hover-arrow__tip" d="M1 1l4 4-4 4"/></svg>';
  $$('[data-arrow]').forEach((el) => el.insertAdjacentHTML('beforeend', ARROW));

  $$('[data-roll]').forEach((el) => {
    const text = el.textContent.trim();
    const roll = document.createElement('span');
    roll.className = 'roll';
    const a = document.createElement('span');
    a.className = 'roll__a';
    a.textContent = text;
    const b = document.createElement('span');
    b.className = 'roll__b';
    b.textContent = text;
    b.setAttribute('aria-hidden', 'true');
    roll.append(a, b);
    el.textContent = '';
    el.append(roll);
  });

  $$('[data-marquee]').forEach((marquee) => {
    const track = $('.marquee__track', marquee);
    const clone = $('.marquee__group', track).cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.append(clone);
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--d', i));
  });

  /* Titres découpés en mots : une copie lisible pour les lecteurs d'écran,
     une copie animée masquée. */
  function splitWords(el) {
    const label = el.cloneNode(true);
    label.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label.textContent.replace(/\s+/g, ' ').trim();

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
        visual.append(word(node));
      }
    });

    el.textContent = '';
    el.append(sr, visual);
  }
  $$('[data-split]').forEach(splitWords);

  /* Texte « manifeste » : chaque mot s'allume au fil du scroll. */
  function splitScrub(el) {
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(WORD_SEP).forEach((part) => {
            if (!part) return;
            if (isSpace(part)) { frag.append(' '); return; }
            const span = document.createElement('span');
            span.className = 'sw';
            span.textContent = part;
            words.push(span);
            frag.append(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    return words;
  }
  const scrubEl = $('[data-scrub]');
  const scrubWords = scrubEl ? splitScrub(scrubEl) : [];
  if (!motionOK) scrubWords.forEach((w) => w.classList.add('is-lit'));

  /* ---------------------------------------------------------------------
     Compteurs
     --------------------------------------------------------------------- */
  const formatters = new Map();
  const formatter = (decimals) => {
    if (!formatters.has(decimals)) {
      formatters.set(decimals, new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }));
    }
    return formatters.get(decimals);
  };
  const countSpec = (el) => {
    const raw = el.dataset.count || el.dataset.screenCount;
    return { target: parseFloat(raw), fmt: formatter((raw.split('.')[1] || '').length) };
  };

  function runCount(el) {
    const { target, fmt } = countSpec(el);
    if (!motionOK) { el.textContent = fmt.format(target); return; }
    const duration = 1800;
    const start = performance.now() + (Number(el.dataset.delay) || 0);
    el.textContent = fmt.format(0);
    const tick = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      el.textContent = fmt.format(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const counters = $$('[data-count]');
  if (motionOK) counters.forEach((el) => { el.textContent = countSpec(el).fmt.format(0); });

  /* ---------------------------------------------------------------------
     Observateurs d'apparition
     --------------------------------------------------------------------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      runCount(entry.target);
      countIO.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  /* ---------------------------------------------------------------------
     Mot qui tourne dans le titre du hero
     --------------------------------------------------------------------- */
  function startRotator() {
    const rotator = $('[data-rotator]');
    if (!rotator || !motionOK) return;
    const words = $$('.rotator__word', rotator);
    let index = 0;
    setInterval(() => {
      if (document.hidden) return;
      const current = words[index];
      index = (index + 1) % words.length;
      const next = words[index];
      current.classList.remove('is-active');
      current.classList.add('is-out');
      next.classList.add('is-active');
      setTimeout(() => {
        // Retour à la position de départ sans traverser la zone visible.
        current.style.transition = 'none';
        current.classList.remove('is-out');
        void current.offsetWidth;
        current.style.transition = '';
      }, 950);
    }, 2600);
  }

  /* URL tapée dans la maquette */
  function typeUrl() {
    const el = $('[data-type]');
    if (!el) return;
    const text = el.dataset.type;
    if (!motionOK) { el.textContent = text; return; }
    let n = 0;
    const step = () => {
      el.textContent = text.slice(0, ++n);
      if (n < text.length) setTimeout(step, 40 + Math.random() * 45);
    };
    setTimeout(step, 650);
  }

  /* ---------------------------------------------------------------------
     Navigation : état au scroll, menu mobile, indicateur glissant
     --------------------------------------------------------------------- */
  const nav = $('[data-nav]');
  const toggle = $('.nav__toggle', nav);
  const menu = $('#mobile-menu');
  let menuOpen = false;

  const setMenu = (open) => {
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    nav.classList.remove('is-hidden');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

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
  $('.nav__links').addEventListener('mouseleave', () => moveIndicator(activeLink));

  const spyIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      activeLink = navLinks.find((l) => l.hash === `#${entry.target.id}`) || null;
      navLinks.forEach((l) => l.classList.toggle('is-active', l === activeLink));
      moveIndicator(activeLink);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'services', 'methode', 'realisations', 'offres', 'faq', 'contact'].forEach((id) => {
    const section = document.getElementById(id);
    if (section) spyIO.observe(section);
  });

  /* ---------------------------------------------------------------------
     Méthode : étapes + écran collant
     --------------------------------------------------------------------- */
  const steps = $$('.step');
  const screens = $$('.screen');
  const tabs = $$('.stage__tab');
  const tabIndicator = $('.stage__tab-ind');
  const rail = $('.method__rail i');
  const stepsWrap = $('.method__steps-wrap');
  let activeStep = -1;

  // Les écrans rejouent leurs animations quand ils deviennent actifs.
  screens.forEach((s) => s.classList.remove('is-active'));

  const placeTabIndicator = () => {
    const tab = tabs[Math.max(activeStep, 0)];
    if (!tab || !tabIndicator) return;
    tabIndicator.style.setProperty('--x', `${tab.offsetLeft}px`);
    tabIndicator.style.setProperty('--w', `${tab.offsetWidth}px`);
  };

  function setStep(i) {
    if (i === activeStep) return;
    activeStep = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    screens.forEach((s, k) => s.classList.toggle('is-active', k === i));
    tabs.forEach((t, k) => t.classList.toggle('is-active', k === i));
    placeTabIndicator();
    if (screens[i]) $$('[data-screen-count]', screens[i]).forEach(runCount);
  }

  function updateMethod() {
    if (!stepsWrap) return;
    const r = stepsWrap.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const mid = vh * 0.5;
    if (rail) rail.style.transform = `scaleY(${clamp((mid - r.top) / r.height, 0, 1)})`;
    let index = 0;
    steps.forEach((s, k) => { if (s.getBoundingClientRect().top < mid) index = k; });
    if (r.top < vh * 0.8) setStep(index);
  }

  /* ---------------------------------------------------------------------
     Réalisations : scroll vertical → défilement horizontal épinglé
     --------------------------------------------------------------------- */
  const pin = $('[data-hscroll]');
  const track = pin && $('.work__track', pin);
  const viewport = pin && $('.work__viewport', pin);
  const workIndex = $('.work__index');
  const workBar = $('.work__bar i');
  const projectCount = pin ? $$('article.project', pin).length : 0;
  let hEnabled = false;
  let hDistance = 0;

  function setupHScroll() {
    if (!pin) return;
    hEnabled = motionOK && window.matchMedia('(min-width: 901px)').matches;
    pin.classList.toggle('is-pinned', hEnabled);
    if (!hEnabled) {
      pin.style.height = '';
      track.style.transform = '';
      return;
    }
    hDistance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    pin.style.height = `${hDistance + vh}px`;
  }

  function updateHScroll() {
    if (!pin) return;
    let p;
    if (hEnabled) {
      const r = pin.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      p = hDistance ? clamp(-r.top / hDistance, 0, 1) : 0;
      track.style.transform = `translate3d(${(-p * hDistance).toFixed(1)}px, 0, 0)`;
    } else {
      const max = viewport.scrollWidth - viewport.clientWidth;
      p = max > 0 ? viewport.scrollLeft / max : 0;
    }
    if (workBar) workBar.style.transform = `scaleX(${p})`;
    if (workIndex) workIndex.textContent = String(Math.min(projectCount, Math.floor(p * projectCount) + 1)).padStart(2, '0');
  }
  if (viewport) viewport.addEventListener('scroll', () => updateHScroll(), { passive: true });

  /* ---------------------------------------------------------------------
     Manifeste & parallaxe
     --------------------------------------------------------------------- */
  let litCount = -1;
  function updateScrub() {
    if (!scrubWords.length || !motionOK) return;
    const r = scrubEl.getBoundingClientRect();
    const start = vh * 0.85;
    const end = vh * 0.4;
    const p = clamp((start - r.top) / (r.height + start - end), 0, 1);
    const n = Math.round(p * scrubWords.length);
    if (n === litCount) return;
    litCount = n;
    scrubWords.forEach((w, i) => w.classList.toggle('is-lit', i < n));
  }

  const parallaxEls = motionOK ? $$('[data-parallax]') : [];
  function updateParallax() {
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  }

  /* ---------------------------------------------------------------------
     Boucle de scroll (une seule par frame)
     --------------------------------------------------------------------- */
  const progressBar = $('.scroll-progress span');
  let anchorY = window.scrollY;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const max = root.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

    nav.classList.toggle('is-scrolled', y > 8);
    if (!menuOpen) {
      if (y < 160) {
        nav.classList.remove('is-hidden');
        anchorY = y;
      } else if (Math.abs(y - anchorY) > 8) {
        nav.classList.toggle('is-hidden', y > anchorY);
        anchorY = y;
      }
    }

    updateScrub();
    updateMethod();
    updateHScroll();
    updateParallax();
  }
  const requestUpdate = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setViewportVars();
      setupHScroll();
      moveIndicator(activeLink);
      placeTabIndicator();
      update();
    }, 120);
  });

  /* ---------------------------------------------------------------------
     Effets au pointeur (souris uniquement)
     --------------------------------------------------------------------- */
  if (finePointer) {
    // Halo qui suit la souris sur les grilles et dans les cartes
    $$('[data-glow]').forEach((grid) => {
      grid.addEventListener('pointermove', (e) => {
        const r = grid.getBoundingClientRect();
        grid.style.setProperty('--mx', `${e.clientX - r.left}px`);
        grid.style.setProperty('--my', `${e.clientY - r.top}px`);
        const tile = e.target.closest('[data-glow] > *');
        if (tile) {
          const t = tile.getBoundingClientRect();
          tile.style.setProperty('--cx', `${e.clientX - t.left}px`);
          tile.style.setProperty('--cy', `${e.clientY - t.top}px`);
        }
      });
      grid.addEventListener('pointerleave', () => {
        grid.style.setProperty('--mx', '-9999px');
        grid.style.setProperty('--my', '-9999px');
      });
    });

    // Hero : grille éclairée sous la souris + inclinaison 3D de la maquette
    const hero = $('[data-hero]');
    const mock = $('[data-tilt]');
    if (hero) {
      const tilt = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
      const tiltLoop = () => {
        tilt.x = lerp(tilt.x, tilt.tx, 0.08);
        tilt.y = lerp(tilt.y, tilt.ty, 0.08);
        mock.style.setProperty('--ry', `${(tilt.x * 7).toFixed(2)}deg`);
        mock.style.setProperty('--rx', `${(-tilt.y * 5).toFixed(2)}deg`);
        const moving = Math.abs(tilt.x - tilt.tx) > 0.001 || Math.abs(tilt.y - tilt.ty) > 0.001;
        tilt.raf = moving ? requestAnimationFrame(tiltLoop) : 0;
      };
      const kickTilt = () => {
        if (mock && motionOK && !tilt.raf) tilt.raf = requestAnimationFrame(tiltLoop);
      };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
        hero.style.setProperty('--my', `${e.clientY - r.top}px`);
        tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
        kickTilt();
      });
      hero.addEventListener('pointerleave', () => {
        hero.style.setProperty('--mx', '-999px');
        hero.style.setProperty('--my', '-999px');
        tilt.tx = 0;
        tilt.ty = 0;
        kickTilt();
      });
    }
  }

  if (finePointer && motionOK) {
    // Boutons magnétiques
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px`);
        el.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      });
    });

    // Curseur « crochets de précision » qui encadre les éléments cliquables
    const cursor = $('.cursor');
    if (cursor) {
      const SIZE = 22;
      const PAD = 6;
      const TARGETS = 'a, button, summary, label.chip, input, select, textarea';
      const cur = { x: -100, y: -100, w: SIZE, h: SIZE };
      const tgt = { ...cur };
      let px = -100;
      let py = -100;
      let hoverEl = null;
      let raf = 0;

      const computeTarget = () => {
        if (hoverEl && hoverEl.isConnected) {
          const r = hoverEl.getBoundingClientRect();
          tgt.x = r.left - PAD;
          tgt.y = r.top - PAD;
          tgt.w = r.width + PAD * 2;
          tgt.h = r.height + PAD * 2;
        } else {
          tgt.x = px - SIZE / 2;
          tgt.y = py - SIZE / 2;
          tgt.w = SIZE;
          tgt.h = SIZE;
        }
      };
      const loop = () => {
        computeTarget();
        const k = hoverEl ? 0.2 : 0.3;
        cur.x = lerp(cur.x, tgt.x, k);
        cur.y = lerp(cur.y, tgt.y, k);
        cur.w = lerp(cur.w, tgt.w, k);
        cur.h = lerp(cur.h, tgt.h, k);
        cursor.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0)`;
        cursor.style.width = `${cur.w.toFixed(2)}px`;
        cursor.style.height = `${cur.h.toFixed(2)}px`;
        const settled = Math.abs(cur.x - tgt.x) < 0.1 && Math.abs(cur.y - tgt.y) < 0.1
          && Math.abs(cur.w - tgt.w) < 0.1 && Math.abs(cur.h - tgt.h) < 0.1;
        raf = settled ? 0 : requestAnimationFrame(loop);
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

      window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        px = e.clientX;
        py = e.clientY;
        if (!cursor.classList.contains('is-visible')) {
          cur.x = px - SIZE / 2;
          cur.y = py - SIZE / 2;
          cursor.classList.add('is-visible');
        }
        const target = e.target instanceof Element ? e.target : null;
        hoverEl = target ? target.closest(TARGETS) : null;
        cursor.classList.toggle('is-snapped', Boolean(hoverEl));
        const zone = target ? target.closest('[data-cursor]') : null;
        cursor.classList.toggle('is-light', Boolean(zone) && zone.dataset.cursor === 'light');
        kick();
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
      window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
      window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
      window.addEventListener('scroll', kick, { passive: true });
    }
  }

  /* ---------------------------------------------------------------------
     FAQ : ouverture / fermeture animées
     --------------------------------------------------------------------- */
  $$('.faq__item').forEach((item) => {
    const summary = $('summary', item);
    let anim = null;
    summary.addEventListener('click', (e) => {
      if (!motionOK) return;
      e.preventDefault();
      if (anim) anim.cancel();
      const startHeight = item.offsetHeight;
      const closing = item.open && !item.classList.contains('is-closing');
      let endHeight;
      if (closing) {
        item.classList.add('is-closing');
        endHeight = summary.offsetHeight;
      } else {
        item.classList.remove('is-closing');
        item.open = true;
        endHeight = item.offsetHeight;
      }
      anim = item.animate(
        { height: [`${startHeight}px`, `${endHeight}px`] },
        { duration: 500, easing: 'cubic-bezier(.16, 1, .3, 1)' },
      );
      anim.onfinish = () => {
        anim = null;
        if (closing) {
          item.open = false;
          item.classList.remove('is-closing');
        }
      };
    });
  });

  /* ---------------------------------------------------------------------
     Formulaire de contact : validation + ouverture de la messagerie
     (remplacez par Formspree, Netlify Forms… pour un envoi direct)
     --------------------------------------------------------------------- */
  const form = $('[data-form]');
  if (form) {
    const status = $('.form__status', form);
    const rules = {
      nom: (v) => v.trim().length > 1,
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
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
        status.textContent = 'Merci de compléter les champs indiqués.';
        return;
      }
      const data = new FormData(form);
      const body = [
        `Nom : ${data.get('nom')}`,
        `Entreprise : ${data.get('entreprise') || '—'}`,
        `E-mail : ${data.get('email')}`,
        `Besoin : ${data.get('besoin')}`,
        `Budget : ${data.get('budget') || '—'}`,
        '',
        data.get('message') || '',
      ].join('\n');
      const subject = `Nouveau projet — ${data.get('entreprise') || data.get('nom')}`;
      window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = 'Merci ! Votre messagerie s’ouvre avec votre demande pré-remplie : il ne reste qu’à l’envoyer.';
    });
  }

  /* ---------------------------------------------------------------------
     Démarrage : on attend les polices pour éviter les sauts de mise en page
     --------------------------------------------------------------------- */
  setupHScroll();
  update();

  const fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
    : Promise.resolve();

  fontsReady.then(() => {
    root.classList.add('is-ready');
    $$('[data-reveal], [data-split]').forEach((el) => revealIO.observe(el));
    counters.forEach((el) => countIO.observe(el));
    startRotator();
    typeUrl();
    setupHScroll();
    moveIndicator(activeLink);
    update();
  });
})();
