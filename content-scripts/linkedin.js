(async () => {
  const { blockingActive } = await chrome.storage.sync.get({ blockingActive: false });
  if (!blockingActive) return;

  const STYLE_ID = "pb-linkedin-hide";

  // Hidden everywhere on LinkedIn: feed posts and feed widgets, wherever they appear.
  const GLOBAL_CSS = `
    [data-urn*="urn:li:activity"],
    .occludable-update,
    .feed-shared-update-v2,
    .feed-following-feed,
    .share-box-feed-entry,
    .share-box-feed-entry__trigger-wrapper,
    .news-module,
    [data-view-name="cohort-feed"] {
      display: none !important;
    }
  `;

  // On the feed page only: blank the entire center column so nothing renders there.
  // Scoped by path so profiles/jobs/messaging are untouched.
  const FEED_CSS = `
    .scaffold-layout__main,
    main.scaffold-layout__main,
    .scaffold-finite-scroll,
    .scaffold-finite-scroll__content,
    [data-finite-scroll-hotkey-context="FEED"] {
      display: none !important;
    }
  `;

  function onFeed() {
    return location.pathname === "/feed" || location.pathname.startsWith("/feed/");
  }

  function inject() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    const wanted = GLOBAL_CSS + (onFeed() ? FEED_CSS : "");
    if (style.textContent !== wanted) style.textContent = wanted;
  }

  function eject() {
    document.getElementById(STYLE_ID)?.remove();
  }

  inject();

  const observer = new MutationObserver(inject);
  observer.observe(document.documentElement, { subtree: true, childList: true });

  // LinkedIn is an SPA; re-evaluate which CSS applies when the route changes.
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
