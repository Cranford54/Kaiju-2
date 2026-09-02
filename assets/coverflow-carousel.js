// Coverflow Carousel — vanilla port of a React 3D coverflow component.
// Same math as the original (fractional centre position, distance-based
// tilt/depth falloff, pointer-drag with a flick throw) applied straight to
// plain DOM cards instead of React refs/state — this site has no
// React/build step, so the cards themselves are the "props".
//
// Motion model: a single rAF loop owns the fractional centre position at
// all times. By default it drifts forward at a slow constant speed, so the
// carousel reads as a continuous stream of photos rather than a slide that
// sits still and then jumps. Nav buttons/dots/drag momentarily hand the
// loop an easing target instead of drifting; once that target is reached
// the drift resumes from wherever it landed — no snap, no discontinuity.
//
// Markup contract, scoped to each [data-coverflow] root:
//   [data-cf-frame]        overflow-hidden, perspective, drag surface
//     [data-cf-track]      preserve-3d, holds one .cf-card per slide
//   [data-cf-prev] [data-cf-next]   optional nav buttons
//   [data-cf-dot] (repeated)        optional pagination dots
(function () {
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initCoverflow(root) {
    var frame = root.querySelector("[data-cf-frame]");
    var track = root.querySelector("[data-cf-track]");
    if (!frame || !track) return;

    var cards = Array.prototype.slice.call(track.children);
    var count = cards.length;
    if (!count) return;

    var opts = {
      rotate: parseFloat(root.dataset.rotate) || 44,
      depth: parseFloat(root.dataset.depth) || 0.6,
      falloff: parseFloat(root.dataset.falloff) || 0.56,
      fade: parseFloat(root.dataset.fade) || 0.1,
      gap: parseFloat(root.dataset.gap) || 0.05,
      loop: root.dataset.loop !== "false",
      // Cards advanced per second while drifting — slow and steady on purpose.
      speed: parseFloat(root.dataset.speed) || 1 / 7,
    };

    var pos = 0; // fractional card index at the centre — single source of truth
    var settleTarget = null; // non-null while easing toward a nav/drag/dot target
    var width = 0;
    var raf = null;
    var lastTime = null;
    var drag = null;
    var paused = false; // hover/focus/hidden-tab pause of the autoplay drift
    var autoplay = opts.loop && !reduceMotion;

    function indexAt(p) {
      return ((Math.round(p) % count) + count) % count;
    }

    function paint() {
      if (!width) return;
      var pitch = width * (1 + opts.gap);

      cards.forEach(function (card, index) {
        var offset = index - pos;
        if (opts.loop) {
          offset = ((offset % count) + count) % count;
          if (offset > count / 2) offset -= count;
        }

        var distance = Math.abs(offset);
        var ramp = Math.pow(distance, opts.falloff);
        var tilt = Math.min(opts.rotate * ramp, 82) * Math.sign(offset);

        card.style.transform =
          "translateX(calc(-50% + " + offset * pitch + "px)) " +
          "translateZ(" + -opts.depth * width * ramp + "px) " +
          "rotateY(" + -tilt + "deg)";

        var edge = opts.loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
        card.style.opacity = String(Math.max(0, 1 - opts.fade * distance) * edge);
        card.style.zIndex = String(100 - Math.round(distance));
      });
    }

    function setActive(index) {
      cards.forEach(function (card, i) {
        card.setAttribute("aria-current", i === index ? "true" : "false");
      });
      root.querySelectorAll("[data-cf-dot]").forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
    }

    function clamp(p) {
      return opts.loop ? p : Math.max(0, Math.min(count - 1, p));
    }

    // Ease the centre position toward a target index (nav/dot clicks, drag
    // release). Once reached, tick() below lets the drift resume on its own.
    function settle(nextTarget) {
      settleTarget = clamp(nextTarget);
      setActive(indexAt(settleTarget));
      if (reduceMotion) {
        pos = settleTarget;
        settleTarget = null;
        paint();
      }
    }

    function goTo(index) {
      var t = opts.loop
        ? index + Math.round((pos - index) / count) * count
        : index;
      settle(t);
    }

    function nudge(by) {
      settle(Math.round(pos) + by);
    }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (lastTime === null) lastTime = now;
      var dt = Math.min((now - lastTime) / 1000, 0.1); // clamp big tab-switch gaps
      lastTime = now;

      if (drag) return; // pointermove drives pos directly while dragging

      if (settleTarget !== null) {
        var remaining = settleTarget - pos;
        if (Math.abs(remaining) < 0.0006) {
          pos = settleTarget;
          settleTarget = null;
        } else {
          pos += remaining * Math.min(1, dt * 8);
        }
      } else if (autoplay && !paused) {
        pos = clamp(pos + opts.speed * dt);
        // Keep the float bounded without any visible jump — offsets already
        // wrap modulo `count` in paint(), so subtracting a whole lap is free.
        if (opts.loop && pos >= count) pos -= count;
      } else {
        return; // nothing moved this frame
      }

      paint();
      setActive(indexAt(pos));
    }

    function measure() {
      width = cards[0].offsetWidth;
      paint();
    }

    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(frame);
    else window.addEventListener("resize", measure);

    frame.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(1);
      }
    });

    // Pause the drift on hover/focus (lets a reader linger on one photo) and
    // whenever the tab is hidden (no point animating off-screen).
    frame.addEventListener("mouseenter", function () { paused = true; });
    frame.addEventListener("mouseleave", function () { paused = false; });
    frame.addEventListener("focusin", function () { paused = true; });
    frame.addEventListener("focusout", function () { paused = false; });
    document.addEventListener("visibilitychange", function () {
      paused = document.hidden;
    });

    frame.addEventListener("pointerdown", function (e) {
      settleTarget = null;
      frame.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, pos: pos, v: 0, t: performance.now() };
    });

    frame.addEventListener("pointermove", function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var pitch = width * (1 + opts.gap);
      if (!pitch) return;

      var now = performance.now();
      var prev = pos;
      pos = clamp(drag.pos - (e.clientX - drag.x) / pitch);
      drag.v = ((pos - prev) / Math.max(now - drag.t, 1)) * 1000; // cards/sec
      drag.t = now;

      setActive(indexAt(pos));
      paint();
    });

    function endDrag(e) {
      if (!drag || drag.id !== e.pointerId) return;
      var d = drag;
      drag = null;
      var carried = Math.max(-2, Math.min(2, d.v * 0.18)); // let a flick carry, capped at 2 cards
      settle(Math.round(pos + carried));
    }
    frame.addEventListener("pointerup", endDrag);
    frame.addEventListener("pointercancel", endDrag);

    var prevBtn = root.querySelector("[data-cf-prev]");
    var nextBtn = root.querySelector("[data-cf-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { nudge(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { nudge(1); });

    root.querySelectorAll("[data-cf-dot]").forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i); });
    });

    setActive(0);
    if (reduceMotion) {
      paint();
    } else {
      raf = requestAnimationFrame(tick);
    }
  }

  function init() {
    document.querySelectorAll("[data-coverflow]").forEach(initCoverflow);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
