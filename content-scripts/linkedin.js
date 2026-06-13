(async () => {
  const { blockingActive } = await chrome.storage.sync.get({ blockingActive: false });
  if (!blockingActive) return;

  const STYLE_ID = "pb-linkedin-hide";

  // Prioritise data-attribute selectors (stable) over class names (fragile)
  const CSS = `
    [data-finite-scroll-hotkey-context],
    [data-urn*="urn:li:activity"],
    .occludable-update,
    .scaffold-finite-scroll__content,
    .feed-following-feed,
    .feed-outlet,
    .share-box-feed-entry,
    .share-box-feed-entry__trigger-wrapper,
    .news-module,
    aside.scaffold-layout__aside,
    .scaffold-layout__aside,
    [data-view-name="cohort-feed"] {
      display: none !important;
    }
  `;

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

  // Catch SPA navigation to /feed (popstate fires when LinkedIn's router changes the URL)
  window.addEventListener("popstate", inject);

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "BYPASS_ACTIVE") {
      observer.disconnect();
      window.removeEventListener("popstate", inject);
      eject();
    }
    if (msg.type === "BYPASS_EXPIRED") {
      inject();
      observer.observe(document.documentElement, { subtree: true, childList: true });
      window.addEventListener("popstate", inject);
    }
  });
})();
