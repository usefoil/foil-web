(function () {
  const config = window.FOIL_ANALYTICS_CONFIG || {};
  const sentryDsn = String(config.sentryDsn || "").trim();

  if (!sentryDsn) {
    return;
  }

  const script = document.createElement("script");

  script.async = true;
  script.src = "https://browser.sentry-cdn.com/10.42.0/bundle.min.js";
  script.integrity = "sha384-L/HYBH2QCeLyXhcZ0hPTxWMnyMJburPJyVoBmRk4OoilqrOWq5kU4PNTLFYrCYPr";
  script.crossOrigin = "anonymous";
  script.onload = () => {
    if (!window.Sentry || typeof window.Sentry.init !== "function") {
      return;
    }

    window.Sentry.init({
      dsn: sentryDsn,
      environment: config.sentryEnvironment || config.environment || "production",
      release: config.sentryRelease || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeBreadcrumb() {
        return null;
      },
      beforeSend(event) {
        return scrubEvent(event);
      }
    });

    if (typeof window.Sentry.setTag === "function") {
      window.Sentry.setTag("product", "foil");
      window.Sentry.setTag("site_url", config.siteUrl || "");
    }
  };

  document.head.appendChild(script);

  function scrubEvent(event) {
    if (!event || typeof event !== "object") {
      return event;
    }

    delete event.user;
    event.extra = scrubValue(event.extra);
    event.contexts = scrubContexts(event.contexts);
    event.breadcrumbs = [];

    if (event.request) {
      event.request = {
        url: scrubUrl(event.request.url)
      };
    }

    return event;
  }

  function scrubContexts(contexts) {
    if (!contexts || typeof contexts !== "object") {
      return contexts;
    }

    const scrubbed = scrubValue(contexts);

    if (scrubbed && typeof scrubbed === "object") {
      delete scrubbed.trace;
    }

    return scrubbed;
  }

  function scrubValue(value) {
    if (Array.isArray(value)) {
      return value.map(scrubValue);
    }

    if (!value || typeof value !== "object") {
      return scrubString(value);
    }

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveKey(key))
        .map(([key, nestedValue]) => [key, scrubValue(nestedValue)])
    );
  }

  function scrubString(value) {
    if (typeof value !== "string") {
      return value;
    }

    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/\b(?:sk|pk|phc|sentry)[_-][A-Za-z0-9_-]{16,}\b/g, "[redacted-token]");
  }

  function scrubUrl(value) {
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value, window.location.origin);
      url.search = "";
      url.hash = "";
      return url.href;
    } catch {
      return "";
    }
  }

  function isSensitiveKey(key) {
    return /audio|authorization|body|clipboard|cookie|data|email|header|key|password|secret|token|transcript/i.test(key);
  }
})();
