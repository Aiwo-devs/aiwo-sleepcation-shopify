/**
 * AIWO EVOO v3 — Gallery Enhancements
 * Template: product.extra-virgin-olive-oil-v3 ONLY
 *
 * Features:
 *   1. Scroll-sync thumbnails via IntersectionObserver (desktop)
 *   2. Mobile swipe dots — injected UI, synced with Splide via
 *      MutationObserver on .is-active class + native touch events
 *
 * No external libraries. No jQuery. No Swiper.js.
 */
(function () {
  'use strict';

  /* ── CART STATE CACHE ────────────────────────────────────
     Kept in sync by aiwoCartRefresh and initCartCache.
     Used by initSetModeATC for synchronous delta calculation.
  ────────────────────────────────────────────────────────── */
  var cartState = { items: [] };

  /* ── GUARD ────────────────────────────────────────────────
     Abort immediately on any page other than this template.
  ────────────────────────────────────────────────────────── */
  function isEvooV3Page() {
    var mc = document.getElementById('MainContent');
    return (
      mc !== null &&
      mc.classList.contains('theme-template-suffix-extra-virgin-olive-oil-v3')
    );
  }

  /* ── HELPERS ───────────────────────────────────────────── */
  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  var MEDIA_SCOPE =
    '#MainContent .product-media-container';

  /* ── 1. THUMBNAIL SCROLL SYNC (Desktop) ──────────────────
     Uses IntersectionObserver on each .splide__slide.
     When a slide is >= 60% visible the corresponding
     thumbnail has opacity-30 removed (active); all others
     get opacity-30 re-added (inactive).
     This works in addition to the theme's own Splide events.
  ────────────────────────────────────────────────────────── */
  function initThumbnailScrollSync() {
    var slideList = qs(MEDIA_SCOPE + ' .splide__list');
    if (!slideList) return;

    var slides = qsa('.splide__slide', slideList);
    if (!slides.length) return;

    var thumbs = qsa(MEDIA_SCOPE + ' .x-thumbnail');
    if (!thumbs.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = slides.indexOf(entry.target);
          if (idx < 0) return;
          thumbs.forEach(function (thumb, i) {
            if (i === idx) {
              thumb.classList.remove('opacity-30');
            } else {
              thumb.classList.add('opacity-30');
            }
          });
        });
      },
      { threshold: 0.6 }
    );

    slides.forEach(function (slide) {
      observer.observe(slide);
    });
  }

  /* ── 2. MOBILE SWIPE DOTS ─────────────────────────────────
     Only runs when viewport <= 768px.

     a) Wraps .swiper-product in a relative div so the
        absolutely-positioned dots overlay the image bottom.
     b) Builds dot elements (styled via CSS).
     c) Syncs dot state via MutationObserver watching the
        .is-active class that Splide toggles on each slide.
     d) Listens for touchstart/touchend on the splide element
        to handle swipe and drive Splide programmatically.
  ────────────────────────────────────────────────────────── */
  function initMobileDots() {
    var splideEl = qs(MEDIA_SCOPE + ' .swiper-product');
    if (!splideEl) return;

    var slideList = qs('.splide__list', splideEl);
    if (!slideList) return;

    var slides = qsa('.splide__slide', slideList);
    var count = slides.length;
    if (count <= 1) return;

    /* ── Wrap splide in relative container ── */
    var wrapper = document.createElement('div');
    wrapper.className = 'evoo-v3-splide-wrap';
    splideEl.parentNode.insertBefore(wrapper, splideEl);
    wrapper.appendChild(splideEl);

    /* ── Build dots ── */
    var dotsWrap = document.createElement('div');
    dotsWrap.className = 'aiwo-evoo-v3-dots';
    dotsWrap.setAttribute('role', 'tablist');
    dotsWrap.setAttribute('aria-label', 'Product image navigation');

    var dots = slides.map(function (_, i) {
      var dot = document.createElement('span');
      dot.className =
        'aiwo-evoo-v3-dot' + (i === 0 ? ' aiwo-evoo-v3-dot--active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-label', 'Image ' + (i + 1));
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');

      dot.addEventListener('click', function () {
        goToSlide(splideEl, i);
      });
      dot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToSlide(splideEl, i);
        }
      });

      dotsWrap.appendChild(dot);
      return dot;
    });

    wrapper.appendChild(dotsWrap);

    /* ── Sync dots: MutationObserver on is-active class ── */
    function syncDots() {
      var activeIdx = slides.findIndex(function (s) {
        return s.classList.contains('is-active');
      });
      if (activeIdx < 0) return;
      dots.forEach(function (dot, i) {
        var active = i === activeIdx;
        dot.classList.toggle('aiwo-evoo-v3-dot--active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    var mutObs = new MutationObserver(syncDots);
    slides.forEach(function (slide) {
      mutObs.observe(slide, { attributes: true, attributeFilter: ['class'] });
    });

    /* Splide handles native touch swipes — no duplicate handler needed.
       MutationObserver above syncs dots whenever Splide toggles .is-active. */
  }

  /* ── 3. BADGES MOBILE SWIPER ─────────────────────────────────
     Only runs when viewport <= 768px.

     The shared snippet's inline script handles dot-click navigation
     (scrolls itemW * 3 = containerWidth ✓) and scroll→dot sync.
     This function adds touchend force-snap so any free-drag swipe
     lands cleanly on a page of 3, and hides dots when ≤ 3 badges.
  ────────────────────────────────────────────────────────── */
  function initBadgesSwiper() {
    qsa('.aiwo-v1-badges__grid').forEach(function (grid) {
      var items = qsa('.aiwo-v1-badges__item', grid);
      var dotsWrap = grid.parentNode
        ? grid.parentNode.querySelector('.aiwo-v1-badges__dots')
        : null;

      if (items.length <= 3) {
        /* All badges fit in one view — no swiper needed */
        if (dotsWrap) dotsWrap.style.display = 'none';
        return;
      }

      /* Force-snap to nearest full page on touchend */
      grid.addEventListener(
        'touchend',
        function () {
          var pageW = grid.clientWidth;
          if (!pageW) return;
          var page = Math.round(grid.scrollLeft / pageW);
          grid.scrollTo({ left: page * pageW, behavior: 'smooth' });
        },
        { passive: true }
      );
    });
  }

  /* ── GO TO SLIDE ──────────────────────────────────────────
     Uses the Splide instance stored on the root element by
     the Eurus theme (confirmed: el.splide in theme.js:1907).
  ────────────────────────────────────────────────────────── */
  function goToSlide(splideEl, index) {
    if (splideEl.splide && typeof splideEl.splide.go === 'function') {
      splideEl.splide.go(index);
    }
  }

  /* ── 4. STICKY ATC OBSERVER ──────────────────────────────
     Watches the main buy-buttons block. When it leaves the
     viewport the sticky bar is revealed; when it re-enters
     (user scrolls back up) the sticky bar is hidden.
     Uses native IntersectionObserver — no Alpine plugin
     dependency, works on all devices including iOS/Safari.
  ────────────────────────────────────────────────────────── */
  function initStickyATCObserver() {
    /* Watch the product media container — it scrolls off on all
       devices (desktop + mobile), so the IntersectionObserver
       correctly fires evoo-sticky-reveal once the image is gone. */
    var atcBlock = qs(MEDIA_SCOPE);
    if (!atcBlock) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          window.dispatchEvent(
            new CustomEvent(
              entry.isIntersecting ? 'evoo-sticky-hide' : 'evoo-sticky-reveal'
            )
          );
        });
      },
      { threshold: 0 }
    );

    io.observe(atcBlock);
  }

  /* ── 5. QUANTITY SYNC ────────────────────────────────────
     Replaces the 150 ms setInterval in the snippet's sticky
     x-init with proper bidirectional event-driven sync:
       main input  → sticky qty  (via 'input' event listener)
       sticky qty  → main input  (via Alpine $watch + dispatch)
     Also exposed as window.aiwoCartRefresh for the recs/bundle
     click handlers to call after /cart/add.js or /cart/update.js.
  ────────────────────────────────────────────────────────── */
  function initQuantitySync() {
    var stickyInput = document.querySelector('[id^="Quantity-sticky-"]');
    if (!stickyInput) return;

    var sectionId = stickyInput.id.replace('Quantity-sticky-', '');
    var mainInput =
      document.getElementById('Quantity-atc-' + sectionId) ||
      document.getElementById('Quantity-' + sectionId);
    if (!mainInput) return;

    var hiddenQty = document.getElementById('Quantity-sticky-qty-' + sectionId);

    function syncHidden(v) {
      if (hiddenQty) hiddenQty.value = v;
    }

    /* main → sticky display + hidden form input */
    mainInput.addEventListener('input', function () {
      var v = parseInt(mainInput.value, 10) || 1;
      if (parseInt(stickyInput.value, 10) !== v) {
        stickyInput.value = v;
        stickyInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      syncHidden(v);
    });

    /* sticky display → main + hidden form input */
    stickyInput.addEventListener('input', function () {
      var v = parseInt(stickyInput.value, 10) || 1;
      if (parseInt(mainInput.value, 10) !== v) {
        mainInput.value = v;
        mainInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      syncHidden(v);
    });
  }

  /* ── CART REFRESH HELPER ─────────────────────────────────
     Called by bundle/recs add-to-cart handlers in the snippet
     after a successful /cart/add.js or /cart/update.js fetch.
     openDrawer=true → also opens the mini-cart drawer.
  ────────────────────────────────────────────────────────── */
  window.aiwoCartRefresh = function (openDrawer) {
    var cartUrl = (window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/') + 'cart.js';
    fetch(cartUrl, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        cartState = cart;
        var bubble = document.querySelector('#cart-icon-bubble');
        if (bubble) {
          var span = bubble.querySelector('span');
          if (span) { span.textContent = cart.item_count; }
        }
        if (openDrawer && window.Alpine && Alpine.store('xMiniCart')) {
          Alpine.store('xMiniCart').openCart();
        }
        document.dispatchEvent(new CustomEvent('eurus:cart:items-changed'));
        window.dispatchEvent(new CustomEvent('cart:refresh'));
      });
  };

  /* ── 6. CART CACHE INIT ──────────────────────────────────
     Fetches cart on page load so cartState is populated
     before the first sticky ATC click.
  ────────────────────────────────────────────────────────── */
  function initCartCache() {
    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) { cartState = cart; });
  }

  /* ── 7. SET-MODE ATC ─────────────────────────────────────
     Intercepts the sticky ATC button click (capture phase)
     to implement "set to exact quantity" behaviour:

     delta = desiredQty - currentCartQty (for this variant)
       delta > 0 → set hidden qty input to delta, let Shopify
                   /cart/add.js proceed (adds only the diff)
       delta = 0 → prevent default, just open cart drawer
       delta < 0 → prevent default, call /cart/change.js
                   to set quantity to desiredQty directly
  ────────────────────────────────────────────────────────── */
  function initSetModeATC() {
    var stickyInput = document.querySelector('[id^="Quantity-sticky-"]');
    if (!stickyInput) return;

    var sectionId = stickyInput.id.replace('Quantity-sticky-', '');
    var atcBtn = document.getElementById('x-atc-button-sticky-' + sectionId);
    if (!atcBtn) return;
    if (atcBtn.dataset.aiwoRaw) return;

    var variantInput = document.getElementById('update-variant-sticky-' + sectionId);
    var hiddenQty = document.getElementById('Quantity-sticky-qty-' + sectionId);

    atcBtn.addEventListener('click', function (e) {
      var desiredQty = parseInt(stickyInput.value, 10) || 1;
      var variantId = variantInput ? parseInt(variantInput.value, 10) : null;

      /* Find how many of this variant are already in the cart */
      var currentQty = 0;
      if (variantId && cartState.items) {
        cartState.items.forEach(function (item) {
          if (item.variant_id === variantId) {
            currentQty += item.quantity;
          }
        });
      }

      var delta = desiredQty - currentQty;

      if (delta === 0) {
        /* Already at desired qty — just open the cart */
        e.preventDefault();
        e.stopImmediatePropagation();
        window.aiwoCartRefresh && window.aiwoCartRefresh(true);
        return;
      }

      if (delta < 0) {
        /* Need to reduce qty — use /cart/change.js */
        e.preventDefault();
        e.stopImmediatePropagation();
        fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: desiredQty })
        })
          .then(function (r) { return r.json(); })
          .then(function () { window.aiwoCartRefresh && window.aiwoCartRefresh(true); });
        return;
      }

      /* delta > 0 — add only the difference */
      if (hiddenQty) {
        hiddenQty.value = delta;
      }
      /* Let the native Shopify/Alpine addToCart proceed */
    }, true /* capture phase */);
  }

  /* ── INIT ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!isEvooV3Page()) return;

    initThumbnailScrollSync();
    initStickyATCObserver();
    initQuantitySync();
    initCartCache();
    initSetModeATC();

    if (window.matchMedia('(max-width: 768px)').matches) {
      initMobileDots();
      initBadgesSwiper();
    }
  });
})();
