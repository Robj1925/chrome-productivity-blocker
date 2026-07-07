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

// Higher-priority "allow" exemptions: paths that must stay reachable even when
// their domain is otherwise fully blocked. priority 2 beats the block rules (1).
const ALLOW_RULES = [
  {
    // TikTok Studio (creator dashboard) — never block it
    id: 104,
    priority: 2,
    action: { type: "allow" },
    condition: { urlFilter: "||tiktok.com/tiktokstudio", resourceTypes: ["main_frame"] }
  }
];

const FULL_BLOCK_DOMAINS = [
  "twitter.com", "x.com", "tiktok.com", "instagram.com", "threads.net",
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
// enable/disable calls overlap (e.g. the startup reconcile and an alarm).
function allManagedRuleIds() {
  return [
    ...FULL_BLOCK_DOMAINS.map((_, i) => i + 1),
    ...PATH_BLOCK_RULES.map(r => r.id),
    ...ALLOW_RULES.map(r => r.id)
  ];
}

// Serialize all dynamic-rule updates. Two overlapping enable/disable calls
// (e.g. the startup reconcile and an alarm firing together) would otherwise
// race and throw "Rule with id N does not have a unique ID."
let ruleQueue = Promise.resolve();
function queueRuleUpdate(task) {
  const run = ruleQueue.then(task, task);
  ruleQueue = run.catch(() => {});
  return run;
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

async function enableBlocking(siteToggles) {
  const enabled = FULL_BLOCK_DOMAINS.filter(d => siteToggles[d] !== false);
  const rules = [...buildRules(enabled), ...PATH_BLOCK_RULES, ...ALLOW_RULES];
  await queueRuleUpdate(async () => {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = [...new Set([...existing.map(r => r.id), ...allManagedRuleIds()])];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: rules });
  });
  await chrome.storage.sync.set({ blockingActive: true });
}

async function disableBlocking() {
  await queueRuleUpdate(async () => {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = [...new Set([...existing.map(r => r.id), ...allManagedRuleIds()])];
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
  });
  await chrome.storage.sync.set({ blockingActive: false });
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
    if (!existing) {
      await chrome.alarms.create("bypass-expiry", { when: data.bypassUntil });
    }
  }

  if (isWorkHours(data.workStart, data.workEnd) && !bypassActive) {
    await enableBlocking(data.siteToggles);
  } else {
    await disableBlocking();
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
// rules are re-synced to the current schedule even if no event listener fires.
reconcileState();

chrome.alarms.onAlarm.addListener(async alarm => {
  const data = await chrome.storage.sync.get({
    workStart: "09:00",
    workEnd: "17:00",
    siteToggles: {},
    bypassUntil: null
  });

  if (alarm.name === "work-start") {
    const bypassActive = data.bypassUntil && Date.now() < data.bypassUntil;
    if (!bypassActive) await enableBlocking(data.siteToggles);
    const { nextStartMs } = await getNextAlarmTimes(data.workStart, data.workEnd);
    await chrome.alarms.create("work-start", { when: nextStartMs });

  } else if (alarm.name === "work-end") {
    await disableBlocking();
    const { nextEndMs } = await getNextAlarmTimes(data.workStart, data.workEnd);
    await chrome.alarms.create("work-end", { when: nextEndMs });

  } else if (alarm.name === "bypass-expiry") {
    await chrome.storage.sync.set({ bypassUntil: null });
    const fresh = await chrome.storage.sync.get({ workStart: "09:00", workEnd: "17:00", siteToggles: {} });
    if (isWorkHours(fresh.workStart, fresh.workEnd)) {
      await enableBlocking(fresh.siteToggles);
    }
    // Always notify: the 24/7 feed scripts (twitter/tiktok) need this even
    // outside work hours. Work-hours scripts re-check blockingActive themselves.
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
    await disableBlocking();
    await chrome.storage.sync.set({ bypassUntil });
    await chrome.alarms.create("bypass-expiry", { when: bypassUntil });
    notifyContentScripts({ type: "BYPASS_ACTIVE" });
    return { success: true, bypassUntil };
  }

  if (message.type === "RESCHEDULE_ALARMS") {
    await reconcileState();
    return { success: true };
  }

  if (message.type === "SYNC_RULES") {
    const { blockingActive, siteToggles = {} } = await chrome.storage.sync.get(["blockingActive", "siteToggles"]);
    if (blockingActive) await enableBlocking(siteToggles);
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
