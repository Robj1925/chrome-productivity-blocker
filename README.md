# Productivity Blocker

A Chrome extension (Manifest V3) that keeps you focused during your work hours by blocking and limiting distracting websites. Outside your configured hours, everything behaves normally.

## Features

- **Work-hours scheduling** — blocking turns on and off automatically at your start/end times (default 9 AM–5 PM, local time).
- **Full-site blocking** — distracting domains (social, streaming, news, NSFW, etc.) redirect to a local "blocked" page during work hours.
- **Feed & Shorts hiding** — on YouTube, LinkedIn, and Facebook the feed/recommendations are hidden so direct links still work, but the infinite scroll doesn't.
- **TikTok locked to Studio** — all of TikTok is blocked around the clock (work hours and off-hours) except the TikTok Studio creator dashboard (`/tiktokstudio`).
- **Always-on Twitter/X feed control** — the Twitter/X home feed stays blanked around the clock, even outside work hours. Profiles, direct links, messages, and search remain usable.
- **YouTube → Subscriptions** — the YouTube homepage redirects to your Subscriptions feed instead of the recommendation grid.
- **Password bypass** — a salted, hashed password unlocks blocking for a 15-minute window when you genuinely need it.
- **Configurable** — set your hours, change the password, and toggle individual sites from the options page.

## Install (developer / unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open the extension's **Options** and set a bypass password.

> A Chrome Web Store listing link will be added here once published.

## Permissions

The extension requests only what it needs:

- **declarativeNetRequest** — redirect the specific distracting domains you block to a local page.
- **storage** — save your settings and the salted password hash (locally; nothing is sent anywhere).
- **alarms** — flip blocking on/off at the start and end of your work hours.
- **host access** — limited to the specific sites the extension blocks or modifies (listed in `manifest.json`), not all sites.

See [PRIVACY.md](PRIVACY.md) for the full data policy. Short version: everything stays on your device; no data is collected or transmitted.

## Maintenance note

The feed/Shorts hiding depends on YouTube/LinkedIn/Facebook's page structure, which those sites change from time to time. If a feed stops being hidden after a site update, the CSS selectors in `content-scripts/` may need a refresh. The URL-level blocks (full domains, Shorts, YouTube home) are network-level and far more stable.

## License

[MIT](LICENSE)
