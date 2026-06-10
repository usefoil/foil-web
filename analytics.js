(function () {
  const config = window.FOIL_ANALYTICS_CONFIG || {};
  const posthogKey = String(config.posthogKey || "").trim();

  if (!posthogKey) {
    return;
  }

  const posthogHost = String(config.posthogHost || "https://us.i.posthog.com").replace(/\/$/, "");
  const script = document.createElement("script");

  script.async = true;
  script.src = `${posthogHost}/static/array.js`;
  script.onload = () => {
    if (!window.posthog || typeof window.posthog.init !== "function") {
      return;
    }

    window.posthog.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2026-01-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      person_profiles: "identified_only",
      persistence: "memory",
      property_denylist: ["$current_url", "$referrer", "$pathname"],
      loaded: bindConversionEvents
    });
  };

  document.head.appendChild(script);

  function bindConversionEvents(posthog) {
    document.querySelectorAll("[data-analytics-event]").forEach((element) => {
      element.addEventListener("click", () => {
        posthog.capture(element.dataset.analyticsEvent, {
          product: "foil",
          site_url: config.siteUrl || "",
          location: element.dataset.analyticsLocation || "unknown",
          label: element.dataset.analyticsLabel || "",
          destination: getDestination(element),
          page_path: window.location.pathname,
          environment: config.environment || "production"
        });
      });
    });
  }

  function getDestination(element) {
    if (element instanceof HTMLAnchorElement) {
      return element.href;
    }

    return element.dataset.analyticsDestination || "";
  }
})();
