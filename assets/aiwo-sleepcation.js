/* AIWO Sleepcation — subnav active state (click/hash first, scroll-spy for sections that exist). */
(function () {
  // Several Sleepcation sections load this file; each module runs once per page.
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-subnav-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-subnav-js', '');

  var ACTIVE_CLASS = 'aiwo-sleepcation-subnav__link--active';
  var SPY_LINE = 0.4; // a section becomes current once its top passes 40% of the viewport height
  var CLICK_LOCK_MS = 1000; // ignore scroll-spy while a clicked tab's smooth scroll is in progress

  var links = [];
  var linksByHash = {};
  var defaultLink = null;
  var observer = null;
  var clickedLink = null;
  var clickTimer = null;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var EDGE_FADE = 24; // matches the tab track's right-edge mask

  // Mobile tab track: if the active tab is clipped, scroll only the track (never the page) just enough to show it.
  function revealTab(link) {
    var track = link.closest('.aiwo-sleepcation-subnav__list');
    if (!track || track.scrollWidth <= track.clientWidth) return;
    var trackRect = track.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    var delta = 0;
    if (linkRect.left < trackRect.left) delta = linkRect.left - trackRect.left;
    else if (linkRect.right > trackRect.right - EDGE_FADE) delta = linkRect.right - (trackRect.right - EDGE_FADE);
    if (Math.abs(delta) < 1) return;
    track.scrollTo({ left: track.scrollLeft + delta, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  function updateActiveTab(hash) {
    var target = linksByHash[hash] || (hash ? null : defaultLink);
    if (!target) return; // unrelated hash (e.g. #MainContent): keep the current tab

    links.forEach(function (link) {
      var isActive = link === target;
      link.classList.toggle(ACTIVE_CLASS, isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    revealTab(target);
  }

  function onClick(event) {
    var link = event.target.closest('a');
    if (!link || !linksByHash[link.hash]) return;

    // Also covers re-clicking the current hash, which fires no hashchange.
    updateActiveTab(link.hash);
    clickedLink = link;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function () {
      clickedLink = null;
    }, CLICK_LOCK_MS);
  }

  function onIntersect() {
    var line = window.innerHeight * SPY_LINE;
    var current = defaultLink;

    links.forEach(function (link) {
      var section = document.getElementById(link.hash.slice(1));
      if (section && section.getBoundingClientRect().top <= line) current = link;
    });

    if (clickedLink) {
      if (current === clickedLink) clickedLink = null;
      return;
    }
    updateActiveTab(current.hash);
  }

  function observeSections() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (link) {
        return document.getElementById(link.hash.slice(1));
      })
      .filter(Boolean); // sections not built yet are simply skipped
    if (!sections.length) return;

    var isInitialCallback = true;
    observer = new IntersectionObserver(
      function () {
        // The first callback reports the load-time state; the hash has already decided the tab.
        if (isInitialCallback) {
          isInitialCallback = false;
          return;
        }
        onIntersect();
      },
      { rootMargin: '0px 0px -' + (1 - SPY_LINE) * 100 + '% 0px' }
    );
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function init() {
    var nav = document.querySelector('.aiwo-sleepcation-subnav');
    if (!nav) return;

    links = Array.prototype.slice.call(nav.querySelectorAll('.aiwo-sleepcation-subnav__link'));
    linksByHash = {};
    links.forEach(function (link) {
      linksByHash[link.hash] = link;
    });
    defaultLink = nav.querySelector('.' + ACTIVE_CLASS) || links[0];
    if (!defaultLink) return;

    nav.addEventListener('click', onClick);
    updateActiveTab(window.location.hash);
    observeSections();
  }

  window.addEventListener('hashchange', function () {
    updateActiveTab(window.location.hash);
  });

  // Anchor landing. The theme's on-scroll-up header shows after any upward scroll and hides after any downward one
  // (over 10px), so an anchor jump changes --height-header only after the browser has used it. Before the browser
  // navigates, hand the shared scroll-margin the height the header will have on arrival (same sums as the theme).
  var ANCHOR_TOKEN = '--aiwo-sleepcation-anchor-header';
  var HEADER_TOGGLE_PX = 10;

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#aiwo-sleepcation-"]');
    var root = document.querySelector('.theme-template-suffix-aiwo-sleepcation');
    var section = link && document.getElementById(link.hash.slice(1));
    if (!root || !section) return;

    var store = window.Alpine && window.Alpine.store && window.Alpine.store('xHeaderMenu');
    var header = document.getElementById('sticky-header');
    if (!header || !store || store.stickyType !== 'on-scroll-up') {
      root.style.removeProperty(ANCHOR_TOKEN); // any other header mode: the live value is already right
      return;
    }

    var stickyBar = document.querySelector('#x-announcement[data-is-sticky="true"]') && document.querySelector('.section-announcement');
    var hidden = stickyBar ? stickyBar.offsetHeight : 0;
    var nav = document.querySelector('.aiwo-sleepcation-subnav-section');
    var goingDown = section.getBoundingClientRect().top - (hidden + (nav ? nav.offsetHeight : 0) + 12) > HEADER_TOGGLE_PX;
    root.style.setProperty(ANCHOR_TOKEN, (goingDown ? hidden : hidden + header.offsetHeight) + 'px');
  });

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* AIWO Sleepcation — What's included: tabs + finite scroll-snap carousels (one per tab panel).
   Stops are calculated from the real track geometry: desktop steps ~2 cards, mobile 1. */
(function () {
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-included-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-included-js', '');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupCarousel(panel) {
    var track = panel.querySelector('[data-aiwo-sleepcation-included-track]');
    var pagination = panel.querySelector('[data-aiwo-sleepcation-included-pagination]');
    var status = panel.querySelector('[data-aiwo-sleepcation-included-status]');
    var prev = panel.querySelector('[data-aiwo-sleepcation-included-prev]');
    var next = panel.querySelector('[data-aiwo-sleepcation-included-next]');
    var slides = track.children;
    var stops = [0];
    var index = -1;
    var pitch = 0;
    var visible = 1;
    var statusTimer = null;

    function computeStops() {
      if (!slides.length || !track.clientWidth) return;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      pitch = slides[0].getBoundingClientRect().width + gap;
      visible = Math.max(1, Math.floor((track.clientWidth + gap) / pitch));
      var step = pitch * Math.max(1, visible - 1);
      var max = track.scrollWidth - track.clientWidth;

      stops = [0];
      for (var x = step; x < max - 1; x += step) stops.push(Math.round(x));
      if (max > 1) stops.push(max); // clamp: the last stop always reaches the end

      pagination.textContent = '';
      for (var i = 0; i < stops.length; i++) pagination.appendChild(document.createElement('span'));
      index = -1;
    }

    function nearestStop() {
      var x = track.scrollLeft;
      if (x >= stops[stops.length - 1] - 2) return stops.length - 1;
      var best = 0;
      for (var i = 1; i < stops.length; i++) {
        if (Math.abs(stops[i] - x) < Math.abs(stops[best] - x)) best = i;
      }
      return best;
    }

    function announce() {
      var first = Math.min(slides.length, Math.round(track.scrollLeft / pitch) + 1);
      var last = Math.min(slides.length, first + visible - 1);
      var text = (first === last ? 'Card ' + first : 'Cards ' + first + '–' + last) + ' of ' + slides.length;
      if (status.textContent !== text) status.textContent = text;
    }

    function update(fromUser) {
      var current = nearestStop();
      if (current !== index) {
        index = current;
        for (var i = 0; i < pagination.children.length; i++) {
          pagination.children[i].classList.toggle('is-active', i === index);
        }
        prev.disabled = index === 0;
        next.disabled = index === stops.length - 1;
      }
      if (fromUser) {
        clearTimeout(statusTimer);
        statusTimer = setTimeout(announce, 250);
      }
    }

    function go(delta) {
      var target = Math.max(0, Math.min(stops.length - 1, index + delta));
      track.scrollTo({ left: stops[target], behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    track.addEventListener('scroll', function () { update(true); }, { passive: true });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        computeStops();
        update(false);
      }).observe(track);
    }

    return {
      reset: function () {
        track.scrollLeft = 0;
        computeStops();
        update(false);
      }
    };
  }

  function setupSection(section) {
    if (section.hasAttribute('data-ready')) return;
    section.setAttribute('data-ready', '');

    var tablist = section.querySelector('[role="tablist"]');
    var tabs = Array.prototype.slice.call(section.querySelectorAll('[role="tab"]'));
    var carousels = {};

    tabs.forEach(function (tab) {
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) carousels[panel.id] = setupCarousel(panel);
    });

    function activate(tab) {
      var y = window.scrollY;
      tabs.forEach(function (other) {
        var selected = other === tab;
        other.setAttribute('aria-selected', selected ? 'true' : 'false');
        other.tabIndex = selected ? 0 : -1;
        document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
      });
      carousels[tab.getAttribute('aria-controls')].reset();

      // Keep the active tab in view in the scrolling tab row without moving the page.
      var left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
      tablist.scrollLeft = Math.max(0, left);
      if (window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { activate(tab); });
    });

    tablist.addEventListener('keydown', function (event) {
      var current = tabs.indexOf(document.activeElement);
      if (current === -1) return;
      var target = null;
      if (event.key === 'ArrowRight') target = tabs[(current + 1) % tabs.length];
      else if (event.key === 'ArrowLeft') target = tabs[(current - 1 + tabs.length) % tabs.length];
      else if (event.key === 'Home') target = tabs[0];
      else if (event.key === 'End') target = tabs[tabs.length - 1];
      if (!target) return;
      event.preventDefault();
      target.focus();
      activate(target);
    });

    var selected = tabs.filter(function (tab) { return tab.getAttribute('aria-selected') === 'true'; })[0];
    if (selected) carousels[selected.getAttribute('aria-controls')].reset();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-aiwo-sleepcation-included]'), setupSection);
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* AIWO Sleepcation — Schedule timeline: one IntersectionObserver per section picks the step nearest the viewport
   centre (10% focus band). Only index changes touch the DOM: is-active + aria-current, then the rail. */
(function () {
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-schedule-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-schedule-js', '');

  var NODE_GAP = 8; // Figma: 8px of empty rail above and below every node
  var FADE = 24; // progress runs 24px into the next step and fades out

  function setupTimeline(section) {
    if (section.hasAttribute('data-ready')) return;
    section.setAttribute('data-ready', '');

    var timeline = section.querySelector('[data-aiwo-sleepcation-schedule-timeline]');
    var steps = Array.prototype.slice.call(timeline.children);
    if (!steps.length) return;
    var active = 0;
    var visible = new Set();

    function updateRail() {
      var height = timeline.offsetHeight;
      var row = steps[active];
      var progress = Math.min(height, row.offsetTop + row.offsetHeight + FADE);
      timeline.style.setProperty('--aiwo-sleepcation-timeline-progress', progress + 'px');

      // Mask out the node gaps so both rails stop 8px short of each node, as in Figma.
      var stops = ['#000 0'];
      steps.forEach(function (step) {
        var node = step.firstElementChild; // offsetParent is the positioned timeline, like the rows
        var top = node.offsetTop - NODE_GAP;
        var bottom = node.offsetTop + node.offsetHeight + NODE_GAP;
        stops.push('#000 ' + top + 'px', 'transparent ' + top + 'px', 'transparent ' + bottom + 'px', '#000 ' + bottom + 'px');
      });
      stops.push('#000 100%');
      timeline.style.setProperty('--aiwo-sleepcation-timeline-mask', 'linear-gradient(180deg, ' + stops.join(', ') + ')');
    }

    function setActive(index) {
      if (index === active) return;
      steps[active].classList.remove('is-active');
      steps[active].removeAttribute('aria-current');
      active = index;
      steps[active].classList.add('is-active');
      steps[active].setAttribute('aria-current', 'step');
      updateRail();
    }

    function pick() {
      var centre = window.innerHeight / 2;
      if (visible.size) {
        var best = null;
        var bestDistance = Infinity;
        visible.forEach(function (step) {
          var rect = step.getBoundingClientRect();
          var distance = Math.abs(rect.top + rect.height / 2 - centre);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = step;
          }
        });
        setActive(steps.indexOf(best));
        return;
      }
      // Nothing in the band: before the timeline keep the first step, after it keep the last.
      if (steps[0].getBoundingClientRect().top > centre) setActive(0);
      else if (steps[steps.length - 1].getBoundingClientRect().bottom < centre) setActive(steps.length - 1);
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        pick();
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (step) { observer.observe(step); });
    }

    if ('ResizeObserver' in window) {
      new ResizeObserver(updateRail).observe(timeline);
    }
    updateRail();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-aiwo-sleepcation-schedule]'), setupTimeline);
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* AIWO Sleepcation — Compare tooltips: open on hover or focus, tap/click toggles, Escape closes. One open at a time. */
(function () {
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-compare-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-compare-js', '');

  var openTip = null;

  function setOpen(tip, open) {
    var button = tip.querySelector('button');
    var text = document.getElementById(button.getAttribute('aria-describedby'));
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    text.hidden = !open;
    if (open) {
      if (openTip && openTip !== tip) setOpen(openTip, false);
      openTip = tip;
    } else if (openTip === tip) {
      openTip = null;
    }
  }

  function setupTip(tip) {
    if (tip.hasAttribute('data-ready')) return;
    tip.setAttribute('data-ready', '');
    var button = tip.querySelector('button');
    var pinned = false; // opened by tap/click: stays open until toggled, Escape or an outside tap

    tip.addEventListener('mouseenter', function () { setOpen(tip, true); });
    tip.addEventListener('mouseleave', function () { if (!pinned) setOpen(tip, false); });
    button.addEventListener('focus', function () { setOpen(tip, true); });
    button.addEventListener('blur', function () { pinned = false; setOpen(tip, false); });
    button.addEventListener('click', function () {
      pinned = !(pinned && button.getAttribute('aria-expanded') === 'true');
      setOpen(tip, pinned);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && openTip) setOpen(openTip, false);
  });

  document.addEventListener('pointerdown', function (event) {
    if (openTip && !openTip.contains(event.target)) setOpen(openTip, false);
  });

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-aiwo-sleepcation-tip]'), setupTip);
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* AIWO Sleepcation — FAQ mobile "Show all / Show fewer". The accordion itself is native details (no JS).
   Without this script every FAQ stays visible; with it, mobile starts collapsed to the configured count. */
(function () {
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-faq-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-faq-js', '');

  var mobile = window.matchMedia('(max-width: 699px)');

  function setupFaq(section) {
    if (section.hasAttribute('data-ready')) return;
    section.setAttribute('data-ready', '');

    var toggle = section.querySelector('[data-aiwo-sleepcation-faq-toggle]');
    if (!toggle) return; // nothing beyond the mobile count
    var peek = section.querySelector('.aiwo-sleepcation-faq__item--peek');
    var expanded = true;

    // The peek is decorative only while collapsed on mobile; on desktop it is an ordinary FAQ.
    function syncPeek() {
      if (!peek) return;
      var decorative = !expanded && mobile.matches;
      peek.inert = decorative;
      if (decorative) peek.setAttribute('aria-hidden', 'true');
      else peek.removeAttribute('aria-hidden');
    }

    function setExpanded(state) {
      expanded = state;
      section.classList.toggle('is-collapsed', !state);
      toggle.setAttribute('aria-expanded', state ? 'true' : 'false');
      toggle.textContent = state ? toggle.getAttribute('data-label-less') : toggle.getAttribute('data-label-more');
      syncPeek();
    }

    toggle.hidden = false;
    setExpanded(false);

    toggle.addEventListener('click', function () {
      setExpanded(!expanded);
      // After "Show fewer" the list shrinks above the control: keep the control itself in view, nothing more.
      if (!expanded) {
        var rect = toggle.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) toggle.scrollIntoView({ block: 'nearest' });
      }
    });

    if (mobile.addEventListener) mobile.addEventListener('change', syncPeek);
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-aiwo-sleepcation-faq]'), setupFaq);
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* AIWO Sleepcation — restrained viewport reveals: one IntersectionObserver, each unit reveals once.
   Targets are existing section classes (no Liquid hooks). Units already on screen at init are shown immediately and
   only then is html.aiwo-sleepcation-motion-ready added, so nothing flashes; reduced motion skips the module entirely. */
(function () {
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-reveal-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-reveal-js', '');
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // kind: text (fade + 10px), card (fade + 14px), glass (14px rise only). group: members reveal together.
  var UNITS = [
    { selector: '.aiwo-sleepcation-for-you__heading', kind: 'text' },
    { selector: '.aiwo-sleepcation-for-you__items', kind: 'card' },
    { selector: '.aiwo-sleepcation-steps .aiwo-sleepcation-dark-header', kind: 'text' },
    { selector: '.aiwo-sleepcation-steps__list > li', kind: 'card', stagger: 60 },
    { selector: '.aiwo-sleepcation-included__header', kind: 'text' },
    { group: ['.aiwo-sleepcation-included__tablist', '.aiwo-sleepcation-included__panel'], scope: '.aiwo-sleepcation-included', kind: 'glass' },
    { selector: '.aiwo-sleepcation-compare__header', kind: 'text' },
    { selector: '.aiwo-sleepcation-compare__scroller', kind: 'card' },
    { selector: '.aiwo-sleepcation-venues .aiwo-sleepcation-dark-header', kind: 'text' },
    { selector: '.aiwo-sleepcation-venues__list > li', kind: 'glass', stagger: 70 },
    { group: ['.aiwo-sleepcation-dark-header', '.aiwo-sleepcation-closing-cta__actions'], scope: '.aiwo-sleepcation-closing-cta', kind: 'text' },
    { selector: '.aiwo-sleepcation-pricing__header', kind: 'text' },
    { selector: '.aiwo-sleepcation-pricing__body', kind: 'card' },
    { selector: '.aiwo-sleepcation-faq .aiwo-sleepcation-dark-header', kind: 'text' },
    { selector: '.aiwo-sleepcation-faq__columns', kind: 'card' }
  ];
  var MAX_STAGGER = 300;
  var membersByTrigger = new Map();
  var observer = new IntersectionObserver(onIntersect, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

  function show(members, delay) {
    members.forEach(function (el) {
      if (delay) el.style.setProperty('--aiwo-reveal-delay', delay + 'ms');
      el.classList.add('is-visible');
    });
  }

  function onIntersect(entries) {
    // Units that enter together (e.g. a row of step cards) stagger in DOM order; a unit alone never waits.
    var batch = {};
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var unit = membersByTrigger.get(entry.target);
      membersByTrigger.delete(entry.target);
      if (!unit) return;
      if (!unit.stagger) return show(unit.members, 0);
      (batch[unit.key] = batch[unit.key] || []).push(unit);
    });
    Object.keys(batch).forEach(function (key) {
      batch[key].forEach(function (unit, i) {
        show(unit.members, Math.min(i * unit.stagger, MAX_STAGGER));
      });
    });
  }

  function collect(root) {
    var units = [];
    UNITS.forEach(function (def, index) {
      if (def.group) {
        Array.prototype.forEach.call(root.querySelectorAll(def.scope), function (scope) {
          var members = [];
          def.group.forEach(function (sel) {
            Array.prototype.push.apply(members, scope.querySelectorAll(sel));
          });
          if (members.length) units.push({ members: members, kind: def.kind, key: 'u' + index });
        });
      } else {
        Array.prototype.forEach.call(root.querySelectorAll(def.selector), function (el) {
          units.push({ members: [el], kind: def.kind, stagger: def.stagger, key: 'u' + index });
        });
      }
    });
    return units.filter(function (unit) {
      return !unit.members[0].hasAttribute('data-aiwo-reveal');
    });
  }

  function init() {
    var root = document.querySelector('.theme-template-suffix-aiwo-sleepcation');
    if (!root) return;
    var fold = window.innerHeight * 0.9;
    collect(root).forEach(function (unit) {
      unit.members.forEach(function (el) {
        el.setAttribute('data-aiwo-reveal', unit.kind);
      });
      // Already on screen (or above it, e.g. after a hash jump): visible now, no animation.
      if (unit.members[0].getBoundingClientRect().top < fold) {
        show(unit.members, 0);
      } else {
        membersByTrigger.set(unit.members[0], unit);
        observer.observe(unit.members[0]);
      }
    });
    document.documentElement.classList.add('aiwo-sleepcation-motion-ready');
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* AIWO Sleepcation — contact modal. One native <dialog>; plan/venue data from the Pricing and Venues JSON blocks; one state
   object kept in memory only (no storage, cookies, URLs or logging). "Request a call back" validates and shows the review;
   "Confirm request" calls submitContactRequest(), which is a stub until a real API exists — it makes no request. */
(function () {
  if (document.documentElement.hasAttribute('data-aiwo-sleepcation-contact-js')) return;
  document.documentElement.setAttribute('data-aiwo-sleepcation-contact-js', '');

  var OPEN_CLASS = 'aiwo-sleepcation-modal-open';
  var FIELDS = ['name', 'city', 'phone', 'email', 'call_window'];
  var root, dialog, form, plans, venues, opener;
  var openMenu = null; // the one open listbox, if any
  var state = { plan: null, stay: 'standard', venue: null, name: '', city: '', phone: '', email: '', call_window: '' };
  var failed = {}; // fields that have failed once re-validate live

  function readJSON(selector) {
    var el = document.querySelector(selector);
    if (!el) return [];
    try {
      return JSON.parse(el.textContent) || [];
    } catch (error) {
      return [];
    }
  }

  function byKey(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  function icon(name) {
    var template = root.querySelector('[data-aiwo-contact-icon="' + name + '"]');
    return template ? template.content.cloneNode(true) : document.createDocumentFragment();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function nightsLabel(plan, stay) {
    return stay === 'extended' ? plan.extended_nights_label : plan.standard_nights_label;
  }

  // Menu label for a stay: the Pricing nights label without its closing full stop ("2 nights." → "2 nights").
  function stayOptionLabel(plan, stay) {
    return (nightsLabel(plan, stay) || '').replace(/[.\s]+$/, '');
  }

  /* ---------- rendering ---------- */

  function renderCard(card, withToggle) {
    var plan = byKey(plans, state.plan);
    var venue = byKey(venues, state.venue);
    if (!plan) return;
    var toggle = card.querySelector('[data-aiwo-contact-edit-plan]');
    card.textContent = '';
    card.classList.toggle('aiwo-sleepcation-contact__card--gold', plan.style === 'gold');

    var main = el('div', 'aiwo-sleepcation-contact__card-main');
    var badge = el('span', 'aiwo-sleepcation-contact__badge');
    var badgeImg = el('img');
    badgeImg.src = plan.badge;
    badgeImg.alt = '';
    badgeImg.width = 33;
    badgeImg.height = 29;
    badge.appendChild(badgeImg);
    main.appendChild(badge);

    var text = el('div', 'aiwo-sleepcation-contact__card-text');
    var title = el('p', 'aiwo-sleepcation-contact__card-title');
    title.appendChild(el('span', null, plan.name));
    title.appendChild(el('span', 'aiwo-sleepcation-contact__card-price', state.stay === 'extended' ? plan.extended_price : plan.standard_price));
    text.appendChild(title);

    var pill = el('p', 'aiwo-sleepcation-contact__pill');
    var nights = el('span');
    nights.appendChild(icon('night-card'));
    nights.appendChild(document.createTextNode(nightsLabel(plan, state.stay)));
    pill.appendChild(nights);
    if (venue) {
      var place = el('span');
      place.appendChild(icon('pin-card'));
      place.appendChild(document.createTextNode(venue.venue_name));
      pill.appendChild(place);
    }
    text.appendChild(pill);
    main.appendChild(text);
    card.appendChild(main);
    if (withToggle && toggle) card.appendChild(toggle);
  }

  function renderTriggers() {
    var plan = byKey(plans, state.plan);
    var venue = byKey(venues, state.venue);
    setTriggerValue('plan', plan ? plan.name : '');
    setTriggerValue('stay', plan ? stayOptionLabel(plan, state.stay) : '');
    setTriggerValue('venue', venue ? venue.short_name : '');
  }

  function setTriggerValue(name, value) {
    var trigger = root.querySelector('[data-aiwo-contact-trigger="' + name + '"]');
    if (trigger) trigger.querySelector('span').textContent = value;
  }

  function render() {
    renderCard(root.querySelector('[data-aiwo-contact-card]'), true);
    renderTriggers();
  }

  /* ---------- custom listboxes (plan / stay / venue) ---------- */

  function optionsFor(name) {
    var plan = byKey(plans, state.plan);
    if (name === 'plan') {
      return plans.map(function (p) { return { value: p.key, label: p.name, badge: p.badge }; });
    }
    if (name === 'stay') {
      return ['standard', 'extended'].map(function (s) { return { value: s, label: plan ? stayOptionLabel(plan, s) : s, icon: 'night-menu' }; });
    }
    return venues.map(function (v) { return { value: v.key, label: v.short_name, icon: 'pin-menu' }; });
  }

  function buildChoice(name) {
    var wrap = root.querySelector('[data-aiwo-contact-choice="' + name + '"]');
    var labelId = 'aiwo-sleepcation-contact-' + name + '-label';
    var listId = 'aiwo-sleepcation-contact-' + name + '-list';
    var trigger = el('button', 'aiwo-sleepcation-contact__trigger');
    trigger.type = 'button';
    trigger.id = 'aiwo-sleepcation-contact-' + name + '-trigger';
    trigger.setAttribute('data-aiwo-contact-trigger', name);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', listId);
    trigger.setAttribute('aria-labelledby', labelId + ' ' + trigger.id);
    trigger.appendChild(el('span'));
    trigger.appendChild(icon('chevron'));
    var list = el('ul', 'aiwo-sleepcation-contact__menu');
    list.id = listId;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-labelledby', labelId);
    list.tabIndex = -1;
    list.hidden = true;
    wrap.appendChild(trigger);
    wrap.appendChild(list);

    trigger.addEventListener('click', function () {
      if (openMenu && openMenu.name === name) closeMenu(true);
      else openListbox(name);
    });
    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openListbox(name);
      }
    });
    list.addEventListener('keydown', function (event) { onListKey(event, name); });
    list.addEventListener('click', function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) choose(name, option.getAttribute('data-value'));
    });
    list.addEventListener('mousemove', function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) setActive(list, option);
    });
  }

  function openListbox(name) {
    closeMenu(false);
    var trigger = root.querySelector('[data-aiwo-contact-trigger="' + name + '"]');
    var list = document.getElementById(trigger.getAttribute('aria-controls'));
    var current = name === 'plan' ? state.plan : name === 'stay' ? state.stay : state.venue;
    list.textContent = '';
    optionsFor(name).forEach(function (opt, i) {
      var li = el('li', 'aiwo-sleepcation-contact__option');
      li.id = list.id + '-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', opt.value);
      li.setAttribute('aria-selected', opt.value === current ? 'true' : 'false');
      if (opt.badge) {
        var img = el('img', 'aiwo-sleepcation-contact__option-badge');
        img.src = opt.badge;
        img.alt = '';
        li.appendChild(img);
      } else {
        li.appendChild(icon(opt.icon));
      }
      li.appendChild(el('span', null, opt.label));
      var check = icon('check').firstElementChild;
      if (check) {
        check.classList.add('aiwo-sleepcation-contact__option-check');
        li.appendChild(check);
      }
      list.appendChild(li);
    });
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.parentElement.classList.add('is-open'); // lifts this selector above the following rows
    openMenu = { name: name, trigger: trigger, list: list, typed: '', typedAt: 0 };
    setActive(list, list.querySelector('[aria-selected="true"]') || list.firstElementChild);
    list.focus();
  }

  function setActive(list, option) {
    if (!option) return;
    Array.prototype.forEach.call(list.children, function (li) { li.classList.toggle('is-active', li === option); });
    list.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
  }

  function closeMenu(returnFocus) {
    if (!openMenu) return;
    var menu = openMenu;
    openMenu = null;
    menu.list.hidden = true;
    menu.list.removeAttribute('aria-activedescendant');
    menu.trigger.setAttribute('aria-expanded', 'false');
    menu.trigger.parentElement.classList.remove('is-open');
    if (returnFocus) menu.trigger.focus();
  }

  function onListKey(event, name) {
    var list = openMenu && openMenu.list;
    if (!list) return;
    var options = Array.prototype.slice.call(list.children);
    var index = options.indexOf(list.querySelector('.is-active'));
    var key = event.key;
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      event.preventDefault();
      if (key === 'ArrowDown') index = Math.min(options.length - 1, index + 1);
      else if (key === 'ArrowUp') index = Math.max(0, index - 1);
      else if (key === 'Home') index = 0;
      else index = options.length - 1;
      setActive(list, options[index]);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (options[index]) choose(name, options[index].getAttribute('data-value'));
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (key === 'Tab') {
      closeMenu(false);
    } else if (key.length === 1 && /\S/.test(key)) {
      // Type-ahead: jump to the next option starting with the typed letters.
      var now = Date.now();
      openMenu.typed = (now - openMenu.typedAt > 600 ? '' : openMenu.typed) + key.toLowerCase();
      openMenu.typedAt = now;
      for (var i = 0; i < options.length; i++) {
        if (options[i].textContent.trim().toLowerCase().indexOf(openMenu.typed) === 0) {
          setActive(list, options[i]);
          break;
        }
      }
    }
  }

  function choose(name, value) {
    if (name === 'plan') state.plan = value;
    else if (name === 'stay') state.stay = value;
    else state.venue = value;
    closeMenu(true);
    render();
  }

  /* ---------- validation + payload ---------- */

  function readForm() {
    FIELDS.forEach(function (key) { state[key] = form.elements[key].value; });
  }

  function writeForm() {
    FIELDS.forEach(function (key) { form.elements[key].value = state[key]; });
  }

  function phoneDigits(value) {
    return value.replace(/[\s\-()]/g, '');
  }

  function validateField(key) {
    var value = (state[key] || '').trim();
    if (key === 'phone') return /^\+?\d{7,15}$/.test(phoneDigits(value));
    if (key === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    return value !== '';
  }

  function validatePayload() {
    var invalid = [];
    FIELDS.forEach(function (key) { if (!validateField(key)) invalid.push(key); });
    if (!byKey(plans, state.plan) || !byKey(venues, state.venue)) invalid.push('plan');
    return invalid;
  }

  function showError(key, isInvalid) {
    var field = form.querySelector('[data-aiwo-contact-field="' + key + '"]');
    if (!field) return;
    var input = form.elements[key];
    var message = field.querySelector('.aiwo-sleepcation-contact__error');
    field.classList.toggle('is-invalid', isInvalid);
    if (isInvalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    message.textContent = isInvalid ? message.getAttribute('data-message') : '';
    message.hidden = !isInvalid;
  }

  // The future API payload: derived values (price, normalised phone) are computed here, never stored.
  function collectPayload() {
    var plan = byKey(plans, state.plan);
    var venue = byKey(venues, state.venue);
    return {
      plan: state.plan,
      stay: state.stay,
      stay_label: plan ? nightsLabel(plan, state.stay) : '',
      price: plan ? (state.stay === 'extended' ? plan.extended_price : plan.standard_price) : '',
      venue: venue ? venue.venue_name : '',
      name: state.name.trim(),
      city: state.city.trim(),
      phone: phoneDigits(state.phone.trim()),
      email: state.email.trim(),
      call_window: state.call_window
    };
  }

  // API boundary — intentionally not connected. Replace the body with the real request once an API contract exists.
  function submitContactRequest(payload) { // eslint-disable-line no-unused-vars
    return Promise.reject(new Error('Contact API not connected'));
  }

  /* ---------- views ---------- */

  function setView(name) {
    root.querySelectorAll('[data-aiwo-contact-view]').forEach(function (view) {
      view.hidden = view.getAttribute('data-aiwo-contact-view') !== name;
    });
    dialog.setAttribute('aria-labelledby', name === 'review' ? 'aiwo-sleepcation-contact-review-title' : 'aiwo-sleepcation-contact-title');
    dialog.scrollTop = 0;
  }

  function renderReview() {
    renderCard(root.querySelector('[data-aiwo-contact-review-card]'), false);
    FIELDS.forEach(function (key) {
      var dd = root.querySelector('[data-aiwo-contact-review="' + key + '"]');
      if (dd) dd.textContent = state[key].trim();
    });
    setView('review');
    document.getElementById('aiwo-sleepcation-contact-review-title').focus();
  }

  function setEditing(open) {
    var plan = root.querySelector('[data-aiwo-contact-plan]');
    var toggle = root.querySelector('[data-aiwo-contact-edit-plan]');
    var editor = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!open) closeMenu(false);
    plan.classList.toggle('is-editing', open);
    editor.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = toggle.getAttribute(open ? 'data-label-open' : 'data-label-closed');
  }

  /* ---------- open / close ---------- */

  function open(planKey, trigger) {
    if (!byKey(plans, planKey)) return;
    state.plan = planKey;
    if (!byKey(venues, state.venue) && venues.length) state.venue = venues[0].key;
    opener = trigger;
    setEditing(false);
    writeForm();
    render();
    setView('form');
    document.documentElement.classList.add(OPEN_CLASS);
    dialog.showModal();
    form.elements.name.focus();
  }

  function setup(container) {
    if (container.hasAttribute('data-ready')) return;
    container.setAttribute('data-ready', '');
    root = container;
    dialog = root.querySelector('[data-aiwo-contact-dialog]');
    form = root.querySelector('[data-aiwo-contact-form]');
    plans = readJSON('[data-aiwo-sleepcation-plans]');
    venues = readJSON('[data-aiwo-sleepcation-venues]');
    ['plan', 'stay', 'venue'].forEach(buildChoice);

    root.querySelector('[data-aiwo-contact-close]').addEventListener('click', function () { dialog.close(); });
    root.querySelector('[data-aiwo-contact-edit-plan]').addEventListener('click', function () {
      setEditing(this.getAttribute('aria-expanded') !== 'true');
    });

    // Backdrop click: the dialog element itself is the only target outside its content box. Both the press and the
    // release must land on the backdrop, so a press inside (e.g. selecting text) released outside never closes it.
    var onBackdrop = function (event) {
      var rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    var pressedBackdrop = false;
    dialog.addEventListener('pointerdown', function (event) { pressedBackdrop = onBackdrop(event); });
    dialog.addEventListener('click', function (event) {
      if (openMenu && !openMenu.list.contains(event.target) && !openMenu.trigger.contains(event.target)) closeMenu(false);
      if (pressedBackdrop && onBackdrop(event)) dialog.close();
      pressedBackdrop = false;
    });

    // Escape closes an open menu first, then the dialog (native).
    dialog.addEventListener('cancel', function (event) {
      if (openMenu) {
        event.preventDefault();
        closeMenu(true);
      }
    });

    dialog.addEventListener('close', function () {
      readForm();
      closeMenu(false);
      document.documentElement.classList.remove(OPEN_CLASS);
      if (opener && document.contains(opener)) opener.focus();
    });

    form.addEventListener('input', function (event) {
      var key = event.target.name;
      if (FIELDS.indexOf(key) === -1) return;
      state[key] = event.target.value;
      if (failed[key]) showError(key, !validateField(key));
    });
    form.addEventListener('change', function (event) {
      var key = event.target.name;
      if (FIELDS.indexOf(key) === -1) return;
      state[key] = event.target.value;
      if (failed[key]) showError(key, !validateField(key));
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      readForm();
      var invalid = validatePayload();
      FIELDS.forEach(function (key) {
        var bad = invalid.indexOf(key) !== -1;
        if (bad) failed[key] = true;
        showError(key, bad);
      });
      var first = FIELDS.filter(function (key) { return invalid.indexOf(key) !== -1; })[0];
      if (first) {
        form.elements[first].focus();
        return;
      }
      renderReview();
    });

    root.querySelector('[data-aiwo-contact-edit]').addEventListener('click', function () {
      setView('form');
      form.elements.name.focus();
    });

    root.querySelector('[data-aiwo-contact-confirm]').addEventListener('click', function (event) {
      // Disabled until the API exists: no request, no success state.
      if (this.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      submitContactRequest(collectPayload());
    });
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-aiwo-contact-open]');
    if (!trigger || !dialog) return;
    event.preventDefault();
    open(trigger.getAttribute('data-aiwo-plan'), trigger);
  });

  function init() {
    var container = document.querySelector('[data-aiwo-sleepcation-contact]');
    if (container) setup(container);
  }

  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
