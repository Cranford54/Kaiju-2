/**
 * Contact form submission — AJAX POST to a GoHighLevel (GHL) Workflow's
 * "Inbound Webhook" trigger, no page reload. Wires up every
 * <form data-contact-form> on the page (site has two: the dedicated contact
 * page and the home page's contact section).
 *
 * Setup required (one-time, in GoHighLevel):
 *   1. Automation → Workflows → Create Workflow.
 *   2. Add trigger: "Webhook" (a.k.a. Inbound Webhook). Save the workflow —
 *      GHL generates a unique POST URL for it.
 *   3. Paste that URL into WEBHOOK_URL below.
 *   4. Add whatever actions you want after the trigger (Create/Update
 *      Contact, notify Amanda by email/SMS, add to a pipeline, etc.) — the
 *      trigger payload includes name, first_name, last_name, email, subject,
 *      message, source, and page, which you can map to contact/custom
 *      fields inside the workflow.
 *
 * CORS note: GHL's webhook trigger URLs generally accept cross-origin POSTs
 * from a browser (this is a common no-code pattern), but if a given
 * sub-account's endpoint ever rejects the request outright (a network-level
 * "Failed to fetch" in the console, not a 4xx/5xx), that account needs a
 * small server-side relay instead of a direct browser POST — ask before
 * building one speculatively.
 */
(function () {
  var WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/REPLACE_WITH_YOUR_WORKFLOW_WEBHOOK"; // TODO: replace with your GHL workflow's webhook URL

  function setStatus(el, text, tone) {
    if (!el) return;
    el.textContent = text;
    el.className = "mt-3 text-center text-[0.85rem] " +
      (tone === "success" ? "text-royal-600 font-medium" :
       tone === "error" ? "text-brick-600 font-medium" : "");
  }

  function splitName(fullName) {
    var parts = fullName.trim().split(/\s+/);
    return {
      first: parts[0] || "",
      last: parts.length > 1 ? parts.slice(1).join(" ") : "",
    };
  }

  function initForm(form) {
    var statusEl = form.querySelector("[data-form-status]");
    var submitBtn = form.querySelector("[data-form-submit]");
    var submitLabel = submitBtn ? submitBtn.textContent : "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: bots fill every field, humans never see this one. Pretend
      // to succeed without actually sending anything.
      var honeypot = form.elements["_gotcha"];
      if (honeypot && honeypot.value) {
        form.reset();
        setStatus(statusEl, "Thanks — your message is on its way. We'll reply within one business day.", "success");
        return;
      }

      if (WEBHOOK_URL.indexOf("REPLACE_WITH") !== -1) {
        setStatus(statusEl, "Form isn't connected yet — email hello@taxartists.com directly for now.", "error");
        return;
      }

      var nameVal = (form.elements["name"] && form.elements["name"].value) || "";
      var nameParts = splitName(nameVal);

      var payload = {
        name: nameVal,
        first_name: nameParts.first,
        last_name: nameParts.last,
        email: (form.elements["email"] && form.elements["email"].value) || "",
        subject: (form.elements["subject"] && form.elements["subject"].value) || "",
        message: (form.elements["message"] && form.elements["message"].value) || "",
        source: "taxartists.com",
        page: window.location.pathname,
      };

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      setStatus(statusEl, "", null);

      fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (response) {
          if (response.ok) {
            form.reset();
            setStatus(statusEl, "Thanks — your message is on its way. We'll reply within one business day.", "success");
          } else {
            throw new Error("Webhook returned " + response.status);
          }
        })
        .catch(function () {
          setStatus(statusEl, "Something went wrong — please email hello@taxartists.com directly.", "error");
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
        });
    });
  }

  document.querySelectorAll("[data-contact-form]").forEach(initForm);
})();
