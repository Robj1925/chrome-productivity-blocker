(async () => {
  const { blockingActive } = await chrome.storage.sync.get({ blockingActive: false });
  if (!blockingActive) return;

  const STYLE_ID = "pb-facebook-hide";
  const CSS = `
    [role="feed"],
    [data-pagelet^="FeedUnit"],
    [data-pagelet="Stories"],
    [data-pagelet="RightRail"],
    [data-pagelet="VideoBubble"],
    [data-pagelet="GroupsFiltersAndSuggestions"],
    [data-pagelet="NuxSection"] {
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
      chrome.storage.sync.get({ blockingActive: false }).then(({ blockingActive }) => {
        if (!blockingActive) return;
        inject();
        observer.observe(document.documentElement, { subtree: true, childList: true });
      });
    }
  });
})();
