(async () => {
  const { blockingActive } = await chrome.storage.sync.get({ blockingActive: false });
  if (!blockingActive) return;

  const STYLE_ID = "pb-youtube-hide";
  const CSS = `
    ytd-rich-grid-renderer,
    ytd-rich-section-renderer,
    ytd-shelf-renderer,
    ytd-reel-shelf-renderer,
    #secondary,
    #related,
    ytd-compact-video-renderer,
    ytd-autoplay-renderer,
    ytd-watch-next-secondary-results-renderer,
    ytd-masthead #chips-wrapper,
    ytd-browse[page-subtype="home"] #contents {
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

  document.addEventListener("yt-navigate-finish", inject);

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
