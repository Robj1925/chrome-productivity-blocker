// LinkedIn feed is handled purely by the content script (blanked, not redirected).
// Only YouTube Shorts URLs get a network-level redirect.
const PATH_BLOCK_RULES = [
  {
    id: 102,
    priority: 1,
    action: { type: "redirect", redirect: { extensionPath: "/blocked/blocked.html?site=youtube.com" } },
    condition: { urlFilter: "||youtube.com/shorts^", resourceTypes: ["main_frame"] }
  },
  {
    // YouTube homepage -> Subscriptions feed
    id: 103,
    priority: 1,
    action: { type: "redirect", redirect: { url: "https://www.youtube.com/feed/subscriptions" } },
    condition: { regexFilter: "^https?://(www\\.)?youtube\\.com/$", resourceTypes: ["main_frame"] }
  }
];

// TikTok is locked to the Studio (creator) dashboard 24/7: the whole domain is
// blocked in BOTH work hours and off-hours, EXCEPT /tiktokstudio. Unlike the
// work-hours block list, these rules persist off-hours. They respect the user's
// per-site toggle (unchecking TikTok in Options opens the whole domain again).
const ALWAYS_ON_RULE_IDS = [200, 201];
function alwaysOnRules(siteToggles) {
  if (siteToggles["tiktok.com"] === false) return [];
  return [
    {
      id: 200,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: "/blocked/blocked.html?site=tiktok.com" } },
      condition: { urlFilter: "||tiktok.com^", resourceTypes: ["main_frame"] }
    },
    {
      // TikTok Studio (creator dashboard) — always reachable (higher priority wins)
      id: 201,
      priority: 2,
      action: { type: "allow" },
      condition: { urlFilter: "||tiktok.com/tiktokstudio", resourceTypes: ["main_frame"] }
    }
  ];
}

const FULL_BLOCK_DOMAINS = [
  "twitter.com", "x.com", "instagram.com", "threads.net",
  "pinterest.com", "tumblr.com", "discord.com", "reddit.com", "old.reddit.com",
  "9gag.com", "imgur.com", "twitch.tv", "netflix.com", "hulu.com",
  "disneyplus.com", "max.com", "primevideo.com", "peacocktv.com",
  "cnn.com", "foxnews.com", "bbc.com", "nytimes.com", "theguardian.com",
  "huffpost.com", "buzzfeed.com", "pornhub.com", "xvideos.com", "xnxx.com",
  "onlyfans.com", "xhamster.com"
];

function buildRules(domains) {
  return domains.map(domain => ({
    id: FULL_BLOCK_DOMAINS.indexOf(domain) + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: `/blocked/blocked.html?site=${domain}` }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"]
    }
  }));
}

// Every rule ID this extension may ever create. Used as removeRuleIds so each
// update fully clears managed rules before re-adding — race-safe even if two
// updates overlap, and it also sweeps up stray IDs from older versions.
function allManagedRuleIds() {
  return [
    ...FULL_BLOCK_DOMAINS.map((_, i) => i + 1),
    ...PATH_BLOCK_RULES.map(r => r.id),
    ...ALWAYS_ON_RULE_IDS
  ];
}

// Serialize all dynamic-rule updates so two overlapping calls can never race
// and throw "Rule with id N does not have a unique ID."
let ruleQueue = Promise.resolve();
function queueRuleUpdate(task) {
  const run = ruleQueue.then(task, task);
  ruleQueue = run.catch(() => {});
  return run;
}

async function replaceRules(addRules) {
  await queueRuleUpdate(async () => {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = [...new Set([...existing.map(r => r.id), ...allManagedRuleIds()])];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  });
}

// Work hours: full block list + path redirects + always-on TikTok lock.
async function enableBlocking(siteToggles) {
  const enabled = FULL_BLOCK_DOMAINS.filter(d => siteToggles[d] !== false);
  await replaceRules([...buildRules(enabled), ...PATH_BLOCK_RULES, ...alwaysOnRules(siteToggles)]);
  await chrome.storage.sync.set({ blockingActive: true });
}

// Off-hours: only the always-on rules remain (TikTok locked to Studio).
async function applyOffHours(siteToggles) {
  await replaceRules(alwaysOnRules(siteToggles));
  await chrome.storage.sync.set({ blockingActive: false });
}

// Bypass window: clear everything so all sites (including TikTok) are reachable.
async function clearAllRules() {
  await replaceRules([]);
  await chrome.storage.sync.set({ blockingActive: false });
}

function isWorkHours(workStart, workEnd) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = workStart.split(":").map(Number);
  const [eh, em] = workEnd.split(":").map(Number);
  return current >= sh * 60 + sm && current < eh * 60 + em;
}

async function getNextAlarmTimes(workStart, workEnd) {
  const now = new Date();
  const [sh, sm] = workStart.split(":").map(Number);
  const [eh, em] = workEnd.split(":").map(Number);

  const todayStart = new Date(now);
  todayStart.setHours(sh, sm, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(eh, em, 0, 0);

  let nextStartMs = todayStart.getTime();
  if (nextStartMs <= now.getTime()) nextStartMs += 86400000;

  let nextEndMs = todayEnd.getTime();
  if (nextEndMs <= now.getTime()) nextEndMs += 86400000;

  return { nextStartMs, nextEndMs };
}

async function scheduleAlarms(workStart, workEnd) {
  await chrome.alarms.clear("work-start");
  await chrome.alarms.clear("work-end");
  const { nextStartMs, nextEndMs } = await getNextAlarmTimes(workStart, workEnd);
  await chrome.alarms.create("work-start", { when: nextStartMs });
  await chrome.alarms.create("work-end", { when: nextEndMs });
}

async function reconcileState() {
  const data = await chrome.storage.sync.get({
    workStart: "09:00",
    workEnd: "17:00",
    bypassUntil: null,
    siteToggles: {},
    passwordHash: null,
    blockingActive: false
  });

  const bypassActive = data.bypassUntil && Date.now() < data.bypassUntil;

  if (bypassActive) {
    const existing = await chrome.alarms.get("bypass-expiry");
    if (!existing) await chrome.alarms.create("bypass-expiry", { when: data.bypassUntil });
    await clearAllRules();
  } else if (isWorkHours(data.workStart, data.workEnd)) {
    await enableBlocking(data.siteToggles);
  } else {
    await applyOffHours(data.siteToggles);
  }

  await scheduleAlarms(data.workStart, data.workEnd);
}

function notifyContentScripts(message) {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  // Only seed defaults on first install — never wipe the user's password/toggles on reload or update.
  if (details.reason === "install") {
    await chrome.storage.sync.set({
      workStart: "09:00",
      workEnd: "17:00",
      blockingActive: false,
      bypassUntil: null,
      siteToggles: {},
      passwordHash: null,
      passwordSalt: null
    });
  }
  await reconcileState();
});

chrome.runtime.onStartup.addListener(async () => {
  await reconcileState();
});

// Runs on every service-worker cold start (including extension reload) so dynamic
// rules are re-synced to the current mode even if no event listener fires.
reconcileState();

chrome.alarms.onAlarm.addListener(async alarm => {
  const data = await chrome.storage.sync.get({
    workStart: "09:00",
    workEnd: "17:00",
    siteToggles: {},
    bypassUntil: null
  });
  const bypassActive = data.bypassUntil && Date.now() < data.bypassUntil;

  if (alarm.name === "work-start") {
    if (!bypassActive) await enableBlocking(data.siteToggles);
    const { nextStartMs } = await getNextAlarmTimes(data.workStart, data.workEnd);
    await chrome.alarms.create("work-start", { when: nextStartMs });

  } else if (alarm.name === "work-end") {
    if (!bypassActive) await applyOffHours(data.siteToggles);
    const { nextEndMs } = await getNextAlarmTimes(data.workStart, data.workEnd);
    await chrome.alarms.create("work-end", { when: nextEndMs });

  } else if (alarm.name === "bypass-expiry") {
    await chrome.storage.sync.set({ bypassUntil: null });
    await reconcileState();
    notifyContentScripts({ type: "BYPASS_EXPIRED" });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true;
});

async function handleMessage(message) {
  if (message.type === "REQUEST_BYPASS") {
    const { passwordHash } = await chrome.storage.sync.get({ passwordHash: null });
    if (!passwordHash) return { success: false, error: "No password set. Go to Settings to set one." };
    if (passwordHash !== message.hash) return { success: false, error: "Incorrect password." };

    const bypassUntil = Date.now() + 15 * 60 * 1000;
    await chrome.storage.sync.set({ bypassUntil });
    await clearAllRules();
    await chrome.alarms.create("bypass-expiry", { when: bypassUntil });
    notifyContentScripts({ type: "BYPASS_ACTIVE" });
    return { success: true, bypassUntil };
  }

  if (message.type === "RESCHEDULE_ALARMS" || message.type === "SYNC_RULES") {
    await reconcileState();
    return { success: true };
  }

  if (message.type === "GET_STATUS") {
    const data = await chrome.storage.sync.get({
      blockingActive: false,
      bypassUntil: null,
      workStart: "09:00",
      workEnd: "17:00"
    });
    return {
      blockingActive: data.blockingActive,
      bypassUntil: data.bypassUntil,
      workStart: data.workStart,
      workEnd: data.workEnd,
      isWorkHours: isWorkHours(data.workStart, data.workEnd)
    };
  }

  return { success: false, error: "Unknown message type." };
}
