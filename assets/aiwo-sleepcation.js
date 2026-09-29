/* AIWO Sleepcation — subnav active state (click/hash first, scroll-spy for sections that exist). */
(function () {
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
