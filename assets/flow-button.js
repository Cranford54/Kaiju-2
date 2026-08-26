/**
 * Flow button — animated dashed border that traces a button's rounded
 * outline on hover/focus. Adapted from a React "FlowButton" component
 * into vanilla JS since this site has no build step (no React/TS/shadcn).
 *
 * Usage: add class="flow-btn" to any <a> or <button>. No wrapper markup
 * needed — the SVG overlay is appended inside the element itself and
 * positioned absolutely, so it never affects the button's own layout.
 */
(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";

  function roundedRectPath(w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return (
      "M" + r + ",0.5 " +
      "H" + (w - r) +
      " A" + r + "," + r + " 0 0 1 " + (w - 0.5) + "," + r +
      " V" + (h - r) +
      " A" + r + "," + r + " 0 0 1 " + (w - r) + "," + (h - 0.5) +
      " H" + r +
      " A" + r + "," + r + " 0 0 1 0.5," + (h - r) +
      " V" + r +
      " A" + r + "," + r + " 0 0 1 " + r + ",0.5 Z"
    );
  }

  function initFlowButton(el) {
    if (el.dataset.flowInit) return;
    el.dataset.flowInit = "true";

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "flow-border");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");

    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", el.dataset.flowColor || "currentColor");
    path.setAttribute("stroke-width", "1");
    path.setAttribute("stroke-dasharray", "6,4");
    svg.appendChild(path);
    el.appendChild(svg);

    function measure() {
      var w = el.offsetWidth;
      var h = el.offsetHeight;
      if (!w || !h) return;
      var radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      path.setAttribute("d", roundedRectPath(w, h, radius));
    }

    measure();
    window.addEventListener("resize", measure);
    if (window.ResizeObserver) {
      new ResizeObserver(measure).observe(el);
    }
  }

  function init() {
    var buttons = document.querySelectorAll(".flow-btn");
    for (var i = 0; i < buttons.length; i++) initFlowButton(buttons[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
