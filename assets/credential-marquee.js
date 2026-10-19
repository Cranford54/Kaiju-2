// Credentialed & Trusted marquee — full-bleed fill.
// The CSS animation translates .credential-track by -50%, so each half of the
// track must be at least as wide as the row or a gap shows on wide screens.
// This rebuilds the track as [originals × N][same again], aria-hidden past the
// first set, and scales the animation duration with the half-width so the
// scroll speed matches the original 6-badge loop (32s per set).
(function () {
  var SECONDS_PER_SET = 32;

  function init() {
    var track = document.querySelector(".credential-track");
    if (!track) return;
    var row = track.parentElement;
    var originals = Array.prototype.filter.call(track.children, function (el) {
      return !el.hasAttribute("aria-hidden");
    });
    var lastWidth = 0;

    function appendClones(nodes) {
      nodes.forEach(function (node) {
        var clone = node.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    }

    function build() {
      var rowWidth = row.offsetWidth;
      if (!rowWidth || rowWidth === lastWidth) return;
      lastWidth = rowWidth;

      Array.prototype.slice.call(track.children).forEach(function (el) {
        if (el.hasAttribute("aria-hidden")) el.remove();
      });
      track.style.paddingRight = "";

      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var setWidth = track.scrollWidth + gap; // one set, including its trailing gap
      var sets = 1;
      while (setWidth * sets < rowWidth) {
        appendClones(originals);
        sets++;
      }

      // Second half = exact copy of the first; trailing padding equal to the
      // gap makes -50% land precisely on the start of the copy (no jump).
      appendClones(Array.prototype.slice.call(track.children, 0, originals.length * sets));
      track.style.paddingRight = gap + "px";
      track.style.animationDuration = SECONDS_PER_SET * sets + "s";
    }

    build();
    window.addEventListener("resize", build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
