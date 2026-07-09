const DOMAINS = [
  { domain: "twitter.com",      category: "Social" },
  { domain: "x.com",            category: "Social" },
  { domain: "instagram.com",    category: "Social" },
  { domain: "threads.net",      category: "Social" },
  { domain: "pinterest.com",    category: "Social" },
  { domain: "tumblr.com",       category: "Social" },
  { domain: "discord.com",      category: "Chat" },
  { domain: "reddit.com",       category: "Forum / Meme" },
  { domain: "old.reddit.com",   category: "Forum / Meme" },
  { domain: "9gag.com",         category: "Forum / Meme" },
  { domain: "imgur.com",        category: "Forum / Meme" },
  { domain: "twitch.tv",        category: "Streaming" },
  { domain: "netflix.com",      category: "Streaming" },
  { domain: "hulu.com",         category: "Streaming" },
  { domain: "disneyplus.com",   category: "Streaming" },
  { domain: "max.com",          category: "Streaming" },
  { domain: "primevideo.com",   category: "Streaming" },
  { domain: "peacocktv.com",    category: "Streaming" },
  { domain: "cnn.com",          category: "News" },
  { domain: "foxnews.com",      category: "News" },
  { domain: "bbc.com",          category: "News" },
  { domain: "nytimes.com",      category: "News" },
  { domain: "theguardian.com",  category: "News" },
  { domain: "huffpost.com",     category: "News" },
  { domain: "buzzfeed.com",     category: "News" },
  { domain: "pornhub.com",      category: "NSFW" },
  { domain: "xvideos.com",      category: "NSFW" },
  { domain: "xnxx.com",         category: "NSFW" },
  { domain: "onlyfans.com",     category: "NSFW" },
  { domain: "xhamster.com",     category: "NSFW" },
];

function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.className = `msg msg-${type}`;
  setTimeout(() => { el.textContent = ""; el.className = "msg"; }, 3000);
}

async function renderSiteList() {
  const { siteToggles = {} } = await chrome.storage.sync.get({ siteToggles: {} });
  const list = document.getElementById("siteList");
  list.innerHTML = "";

  for (const { domain, category } of DOMAINS) {
    const enabled = siteToggles[domain] !== false;
    const item = document.createElement("div");
    item.className = "site-item";
    item.innerHTML = `
      <div>
        <div class="site-domain">${domain}</div>
        <div class="site-category">${category}</div>
      </div>
      <input type="checkbox" data-domain="${domain}" ${enabled ? "checked" : ""} />
    `;
    list.appendChild(item);
  }

  list.addEventListener("change", async e => {
    if (e.target.type !== "checkbox") return;
    const domain = e.target.dataset.domain;
    const { siteToggles: current = {} } = await chrome.storage.sync.get({ siteToggles: {} });
    current[domain] = e.target.checked;
    await chrome.storage.sync.set({ siteToggles: current });
    chrome.runtime.sendMessage({ type: "SYNC_RULES" }).catch(() => {});
  });
}

async function loadHours() {
  const { workStart = "09:00", workEnd = "17:00" } =
    await chrome.storage.sync.get({ workStart: "09:00", workEnd: "17:00" });
  document.getElementById("workStart").value = workStart;
  document.getElementById("workEnd").value = workEnd;
}

document.getElementById("saveHours").addEventListener("click", async () => {
  const workStart = document.getElementById("workStart").value;
  const workEnd = document.getElementById("workEnd").value;
  if (!workStart || !workEnd) { showMsg("hoursMsg", "Both times are required.", "error"); return; }
  await chrome.storage.sync.set({ workStart, workEnd });
  chrome.runtime.sendMessage({ type: "RESCHEDULE_ALARMS" }).catch(() => {});
  showMsg("hoursMsg", "Hours saved.", "success");
});

document.getElementById("savePassword").addEventListener("click", async () => {
  const currentInput = document.getElementById("currentPassword").value;
  const newInput = document.getElementById("newPassword").value.trim();
  const confirmInput = document.getElementById("confirmPassword").value.trim();

  if (!newInput) { showMsg("passwordMsg", "New password cannot be empty.", "error"); return; }
  if (newInput !== confirmInput) { showMsg("passwordMsg", "Passwords do not match.", "error"); return; }

  const { passwordHash, passwordSalt } = await chrome.storage.sync.get({ passwordHash: null, passwordSalt: null });
  if (passwordHash) {
    const currentHash = await hashPassword(currentInput, passwordSalt);
    if (currentHash !== passwordHash) {
      showMsg("passwordMsg", "Current password is incorrect.", "error");
      return;
    }
  }

  const salt = generateSalt();
  const newHash = await hashPassword(newInput, salt);
  await chrome.storage.sync.set({ passwordHash: newHash, passwordSalt: salt });
  document.getElementById("currentPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  showMsg("passwordMsg", "Password saved.", "success");
});

loadHours();
renderSiteList();
