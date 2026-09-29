/**
 * AIWO EVOO v3 — Gallery JS
 * Template: product.extra-virgin-olive-oil-v3 ONLY
 * - Tagline DOM swap (all viewports) with editor live-update support
 * - Mobile swiper dots (≤768px only)
 * No external libraries. No shared files modified.
 */
(function () {

  /* ── TAGLINE SWAP (all viewports) ──────────────────────────
     Reads pre-rendered HTML from <template id="evoo-v3-tagline-tpl">
     (Liquid values resolved server-side) and injects it in place of
     the shared snippet's .aiwo-v1-tagline.w-full.
     Also fires on shopify:section:load for live editor updates.
  ────────────────────────────────────────────────────────── */
  function applyTagline() {
    var mc = document.getElementById('MainContent');
    if (!mc || !mc.classList.contains('theme-template-suffix-extra-virgin-olive-oil-v3')) return;

    var tpl = document.getElementById('evoo-v3-tagline-tpl');
    var newHTML = tpl ? tpl.innerHTML.trim() : '';

    if (!newHTML) {
      // Fallback: plain tagline with no tooltip
      var dataEl = document.getElementById('evoo-v3-tagline-data');
      var t = (dataEl && dataEl.dataset.text) ? dataEl.dataset.text : 'WHY AIWO';
      newHTML = '<div class="aiwo-tagline"><span class="pulse-dot"></span><span class="aiwo-tagline__text"> ' + t + '</span></div>';
    }

    // Helper: swap element and init Alpine on the new node
    function swapAndInit(target, html) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var newEl = tmp.firstElementChild;
      if (!newEl) return;
      target.parentNode.replaceChild(newEl, target);
      if (window.Alpine) Alpine.initTree(newEl);
    }

    // If original tagline still in DOM, replace it
    var orig = mc.querySelector('.aiwo-v1-tagline.w-full');
    if (orig) {
      swapAndInit(orig, newHTML);
      return;
    }

    // Already swapped — replace with fresh template content (handles editor updates)
    var current = mc.querySelector('.aiwo-tagline-wrapper') || mc.querySelector('.aiwo-tagline');
    if (current) {
      swapAndInit(current, newHTML);
    }
  }

  document.addEventListener('DOMContentLoaded', applyTagline);
  document.addEventListener('shopify:section:load', applyTagline);
})();
