/**
 * Depth Parallax Words — per-word entrance with real 3D perspective (translateZ
 * inside a `perspective` context, not a faked 2D scale), plus blur and a lift,
 * staggered 70ms per word so a line arrives with dimension instead of flat.
 * Adapted from a React (framer-motion) component — depth-parallax-words.tsx —
 * into vanilla JS since this site has no build step (no React/TS/shadcn),
 * same approach as assets/flow-button.js. Loaded site-wide.
 *
 * Usage: add class="depth-parallax" to a heading/subhead element. Optional
 * data attributes:
 *   data-dpw-delay="140"   start delay in ms before the first word (default 0)
 *   data-dpw-stagger="70"  per-word stagger in ms (default 70)
 *   data-dpw-view          play when scrolled into view instead of immediately
 *                          on load (use for below-the-fold sections)
 *
 * Respects prefers-reduced-motion: words render in place, fully visible, with
 * no transform/blur/transition — both via the JS check below and a CSS
 * fallback in index.html that applies regardless of JS timing.
 */
(function () {
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function wrapWords(el) {
    if (el.dataset.dpwInit) return;
    el.dataset.dpwInit = "true";

    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    var words = text.split(" ");
    el.textContent = "";

    var stagger = parseInt(el.dataset.dpwStagger, 10) || 70;
    var baseDelay = parseInt(el.dataset.dpwDelay, 10) || 0;

    words.forEach(function (word, i) {
      var wordSpan = document.createElement("span");
      wordSpan.className = "dpw-word";
      wordSpan.setAttribute("aria-hidden", "true");
      wordSpan.textContent = word;
      wordSpan.style.transitionDelay = (baseDelay + i * stagger) + "ms";
      el.appendChild(wordSpan);
      if (i < words.length - 1) {
        el.appendChild(document.createTextNode(" "));
      }
    });
  }

  function play(el) {
    // Double rAF so the initial (pre-animation) styles are painted at least
    // once before the play class flips the transition — otherwise the
    // browser can coalesce both states into one frame and skip the motion.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("dpw-play");
      });
    });
  }

  function init() {
    var els = document.querySelectorAll(".depth-parallax");
    els.forEach(function (el) {
      wrapWords(el);

      if (reduceMotionQuery.matches) {
        el.classList.add("dpw-play");
        return;
      }

      if (el.hasAttribute("data-dpw-view")) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              play(el);
              io.unobserve(el);
            }
          });
        }, { threshold: 0.35 });
        io.observe(el);
      } else {
        play(el);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
