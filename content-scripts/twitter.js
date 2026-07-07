// Runs 24/7 (not gated on blockingActive): during work hours the domain is
// network-blocked anyway; outside them this blanks the home timeline only.
// Profiles, tweets, messages, and search stay usable.
(async () => {
  const { bypassUntil, siteToggles } = await chrome.storage.sync.get({ bypassUntil: null, siteToggles: {} });

  const key = location.hostname.replace(/^www\./, "") === "x.com" ? "x.com" : "twitter.com";
  if (siteToggles[key] === false) return;

  let enabled = !(bypassUntil && Date.now() < bypassUntil);

  const STYLE_ID = "pb-twitter-hide";
  const FEED_CSS = `
    main [data-testid="primaryColumn"],
    main [data-testid="sidebarColumn"] {
      display: none !important;
    }
  `;

  function onFeed() {
    const p = location.pathname;
    return p === "/" || p === "/home";
  }

  function sync() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    const wanted = enabled && onFeed() ? FEED_CSS : "";
    if (style.textContent !== wanted) style.textContent = wanted;
  }

  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener("popstate", sync);

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "BYPASS_ACTIVE") { enabled = false; sync(); }
    if (msg.type === "BYPASS_EXPIRED") { enabled = true; sync(); }
  });
})();
