(async () => {
  const { blockingActive } = await chrome.storage.sync.get({ blockingActive: false });
  if (!blockingActive) return;

  const STYLE_ID = "pb-youtube-hide";
  const CSS = `
    /* Home feed — blanked (we redirect to Subscriptions; this prevents a flash).
       Scoped to the home page so the Subscriptions grid stays visible. */
    ytd-browse[page-subtype="home"] #contents,
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] #chips-wrapper,

    /* Shorts shelves everywhere */
    ytd-reel-shelf-renderer,
    ytd-rich-shelf-renderer[is-shorts],
    ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),

    /* Watch-page recommendations */
    #secondary,
    #related,
    ytd-compact-video-renderer,
    ytd-autoplay-renderer,
    ytd-watch-next-secondary-results-renderer,

    /* Shorts navigation entries + chips */
    ytd-guide-entry-renderer:has(a[href="/shorts"]),
    ytd-guide-entry-renderer:has(a[title="Shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[title="Shorts"]),
    yt-chip-cloud-chip-renderer:has(a[href*="shorts"]) {
      display: none !important;
    }
  `;

  // Send the home page to the Subscriptions feed (covers in-app navigation;
  // fresh loads are also caught by a network rule in background.js).
  function redirectHome() {
    if (location.pathname === "/") {
      location.replace("https://www.youtube.com/feed/subscriptions");
    }
  }

  redirectHome();

  function inject() {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = CSS;
      (document.head || document.documentElement).appendChild(s);
    }
  }

  function eject() {
    document.getElementById(STYLE_ID)?.remove();
  }

  inject();

  const observer = new MutationObserver(inject);
  observer.observe(document.documentElement, { subtree: true, childList: true });

  document.addEventListener("yt-navigate-finish", () => {
    redirectHome();
    inject();
  });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "BYPASS_ACTIVE") {
      observer.disconnect();
      eject();
    }
    if (msg.type === "BYPASS_EXPIRED") {
      inject();
      observer.observe(document.documentElement, { subtree: true, childList: true });
    }
  });
})();
