// Stagger Cards — vanilla port of a React "stagger testimonials" carousel
// (fanned, rotated card stack with a click-to-center interaction). Same
// positioning math as the original, applied straight to plain DOM nodes
// instead of React refs/state — this site has no React/build step, so the
// cards written directly in the markup are the "props": add, remove, or
// reorder a .stagger-card in HTML and this script only ever handles
// positioning, never content.
//
// Unlike the source component (which re-shuffles an array with shift/
// unshift to keep the "centered" item at index 0), this tracks a single
// centerIndex and computes each card's signed distance from it with the
// same wrap-around math assets/coverflow-carousel.js already uses on this
// site — mathematically equivalent, no DOM reordering needed.
//
// Markup contract, scoped to each [data-stagger] root:
//   [data-stagger-track]                     positioning context (relative)
//     .stagger-card (repeated)                one per item
//       [data-stagger-ignore] (optional)      real links inside a card
//                                              (e.g. "Learn more") — clicks
//                                              inside these skip re-centering
//                                              so the link navigates normally
//   [data-stagger-prev] [data-stagger-next]  optional nav buttons
//   [data-stagger-fill] on the root          optional: clone the cards (as
//                                              whole sets, aria-hidden unless
//                                              centered) until they fill the
//                                              track's width — for full-bleed
//                                              frames
(function () {
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initStagger(root) {
    var track = root.querySelector("[data-stagger-track]");
    if (!track) return;

    var cards = Array.prototype.slice.call(
      track.querySelectorAll(".stagger-card")
    );
    var count = cards.length;
    if (!count) return;
    var baseCount = count; // original cards; clones repeat them in whole sets
    var fill = root.hasAttribute("data-stagger-fill");

    var center = 0;
    var cardSize = 0;

    function paint() {
      if (!cardSize) return;
      cards.forEach(function (card, index) {
        var offset = index - center;
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;

        var isCenter = offset === 0;
        var distance = Math.abs(offset);

        card.style.zIndex = String(100 - distance);
        card.style.transform =
          "translate(-50%, -50%) " +
          "translateX(" + offset * (cardSize / 1.5) + "px) " +
          "translateY(" + (isCenter ? -65 : offset % 2 ? 15 : -15) + "px) " +
          "rotate(" + (isCenter ? 0 : offset % 2 ? 2.5 : -2.5) + "deg)";

        card.classList.toggle("is-active", isCenter);
        card.setAttribute("aria-current", isCenter ? "true" : "false");
        card.setAttribute("tabindex", isCenter ? "0" : "-1");
        // Clones stay hidden from assistive tech except while centered.
        if (index >= baseCount) card.setAttribute("aria-hidden", isCenter ? "false" : "true");
      });
    }

    function goTo(index) {
      center = ((index % count) + count) % count;
      paint();
    }

    function nudge(by) {
      goTo(center + by);
    }

    function wire(card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("[data-stagger-ignore]")) return;
        goTo(cards.indexOf(card));
      });
      card.addEventListener("keydown", function (e) {
        if (e.target.closest("[data-stagger-ignore]")) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goTo(cards.indexOf(card));
        }
      });
    }
    cards.forEach(wire);

    // Enough cards that both sides of the track are covered before offsets
    // wrap at ±count/2. Only ever grows.
    function ensureFill() {
      if (!fill || !cardSize) return;
      var spacing = cardSize / 1.5;
      var needed = Math.ceil(track.offsetWidth / spacing) + 2;
      while (count < needed) {
        for (var i = 0; i < baseCount; i++) {
          var clone = cards[i].cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          clone.querySelectorAll("a").forEach(function (a) {
            a.setAttribute("tabindex", "-1");
          });
          track.appendChild(clone);
          cards.push(clone);
          wire(clone);
        }
        count = cards.length;
      }
    }

    var prevBtn = root.querySelector("[data-stagger-prev]");
    var nextBtn = root.querySelector("[data-stagger-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { nudge(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { nudge(1); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(1);
      }
    });

    function measure() {
      cardSize = cards[0].offsetWidth;
      ensureFill();
      paint();
    }

    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(track);
    else window.addEventListener("resize", measure);

    goTo(0);
  }

  function init() {
    document.querySelectorAll("[data-stagger]").forEach(initStagger);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
