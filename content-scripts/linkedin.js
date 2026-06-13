(async () => {
  const { blockingActive } = await chrome.storage.sync.get({ blockingActive: false });
  if (!blockingActive) return;

  const STYLE_ID = "pb-linkedin-hide";
  const CSS = `
    .scaffold-finite-scroll__content,
    .feed-outlet,
    .news-module,
    aside.scaffold-layout__aside,
    .feed-shared-update-v2,
    .updates-feed-container,
    [data-view-name="cohort-feed"],
    .share-box-feed-entry__trigger-wrapper {
      display: none !important;
    }
  `;

  function inject() {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }

  function eject() {
    document.getElementById(STYLE_ID)?.remove();
  }

  inject();

  const observer = new MutationObserver(inject);
  observer.observe(document.documentElement, { subtree: true, childList: true });

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
