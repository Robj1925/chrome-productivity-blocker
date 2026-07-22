# Locked In

A Chrome extension (Manifest V3) that helps you stay locked in during your work hours by blocking distracting websites and hiding the feeds that pull you in. It follows a schedule you set, and keeps the worst offenders blocked around the clock.

## How it works

Locked In runs in three states:

- **Focus hours** (default 9:00 AM to 5:00 PM local time, fully configurable): full blocking is on.
- **Off hours**: almost everything unblocks. Only Twitter/X stay blocked, and TikTok videos stay hidden.
- **Bypass window**: entering your password unlocks everything for 15 minutes, then blocking restores itself automatically.

## What it blocks

**Blocked around the clock (focus hours and off hours):**

- **Twitter and X** (twitter.com, x.com): the whole site redirects to a calm "can wait" page. Only a bypass opens it.
- **TikTok videos**: every video is hidden and paused everywhere on TikTok, except the TikTok Studio creator dashboard (`/tiktokstudio`), which stays fully usable.

**Blocked during focus hours only** (these behave normally off hours):

- **28 distracting domains** across social, chat, forums, streaming, news, and adult categories redirect to the blocked page.
- **YouTube**: the homepage redirects to your Subscriptions feed, Shorts are blocked, and watch page recommendations plus autoplay are hidden.
- **LinkedIn**: the feed is blanked, while profiles, jobs, and messaging stay usable.
- **Facebook**: the news feed, stories, reels, and suggestions are hidden (Messenger is untouched).

## Bypass

Set a password in Options. When you genuinely need a blocked site, enter the password on the block page or in the popup to unlock everything for 15 minutes. The password is stored as a salted PBKDF2-SHA256 hash, never in plain text.

## Options

- Set your focus hours (start and end time).
- Set or change your bypass password.
- Toggle any of the 30 listed sites on or off. (YouTube, TikTok, LinkedIn, and Facebook are handled by the dedicated logic above and are not in the toggle list.)

## Install (developer / unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open the extension's **Options** and set a bypass password.

## Permissions

The extension requests only what it needs:

- **declarativeNetRequest**: redirect the specific distracting domains you block to a local page.
- **storage**: save your settings and the salted password hash locally. Nothing is sent anywhere.
- **alarms**: flip blocking on and off at the start and end of your focus hours.
- **host access**: limited to the specific sites the extension blocks or modifies (listed in `manifest.json`), not all sites.

See [PRIVACY.md](PRIVACY.md) for the full policy. Short version: everything stays on your device, and no data is collected or transmitted.

## Maintenance note

The feed and video hiding on YouTube, LinkedIn, Facebook, and TikTok depends on those sites' page structure, which they change from time to time. If a feed stops being hidden after a site update, the CSS selectors in `content-scripts/` may need a refresh. The URL level blocks (full domains, Shorts, YouTube home) are network level and far more stable.

## License

[MIT](LICENSE)
