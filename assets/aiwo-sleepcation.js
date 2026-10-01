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
