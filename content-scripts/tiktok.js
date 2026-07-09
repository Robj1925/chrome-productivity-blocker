// Blocks TikTok videos everywhere EXCEPT the Studio (creator) dashboard.
// Works by hiding and pausing every <video> element — independent of the
// network rules, the schedule, and the site toggle, so it "just works".
// Only pauses during an active password bypass.
(async () => {
  const { bypassUntil } = await chrome.storage.sync.get({ bypassUntil: null });
  let enabled = !(bypassUntil && Date.now() < bypassUntil);

  const STYLE_ID = "pb-tiktok-hide-video";
  const CSS = `video { display: none !important; }`;

  // Leave TikTok Studio (creator dashboard) fully working.
  function onStudio() {
    return location.pathname.startsWith("/tiktokstudio");
  }

  function active() {
    return enabled && !onStudio();
  }

  function pauseVideos() {
    if (!active()) return;
    document.querySelectorAll("video").forEach(v => {
      try { v.pause(); v.muted = true; } catch (e) { /* ignore */ }
    });
  }

  function sync() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = active() ? CSS : "";
    pauseVideos();
  }

  sync();

  // TikTok is an SPA and constantly mounts new <video> nodes; keep re-applying.
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener("popstate", sync);
  setInterval(pauseVideos, 400); // catch autoplay that restarts a hidden video

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "BYPASS_ACTIVE") { enabled = false; sync(); }
    if (msg.type === "BYPASS_EXPIRED") { enabled = true; sync(); }
  });
})();
