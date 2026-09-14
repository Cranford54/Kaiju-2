// Scroll-aware header: toggles `is-scrolled` on #site-header once the page
// scrolls past the hero. CSS (see the `.header-surface`, `.logo-img`, and
// `.nav-link` rules in each page's <style> block) does the actual crossfade
// from the navy gradient bar / navy logo / white nav text to the solid white
// bar / original blue logo / navy nav text — this just flips one class,
// rAF-throttled so it doesn't run the check on every scroll event.
(function () {
  var header = document.getElementById('site-header');
  if (!header) return;

  var THRESHOLD = 40;
  var ticking = false;

  function apply() {
    header.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }

  apply();
  window.addEventListener('scroll', onScroll, { passive: true });
})();
