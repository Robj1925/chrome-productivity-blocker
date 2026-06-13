# Chrome Web Store — Listing & Submission Content

Paste-ready content for the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). This file is for your reference — exclude it from the uploaded zip.

---

## Basic listing

- **Name:** Productivity Blocker
- **Category:** Productivity
- **Language:** English (United States)

### Short description (≤132 chars)
> Stay focused during work hours. Blocks distracting sites and hides feeds, recommendations, and Shorts on a schedule you set.

### Detailed description
> Productivity Blocker helps you focus during your work hours and gets out of the way the rest of the day.
>
> During the hours you choose (9 AM–5 PM by default, in your local time), it:
> • Blocks distracting websites — social media, streaming, news, and adult sites — by redirecting them to a simple "blocked" page.
> • Hides the feed and recommendations on YouTube, LinkedIn, and Facebook, so direct links still work but the endless scroll doesn't.
> • Sends the YouTube homepage to your Subscriptions feed instead of the recommendation grid.
> • Hides YouTube Shorts.
>
> Need a quick exception? Set a bypass password and unlock everything for 15 minutes.
>
> Everything is configurable from the options page: your work hours, the bypass password, and which sites to block. Outside your work hours, nothing is blocked.
>
> Privacy: all your settings stay on your device. The extension collects no data, has no trackers, and talks to no servers.

---

## Single-purpose statement
> Blocks and limits distracting websites during user-configured work hours.

## Permission justifications
- **declarativeNetRequest:** Redirects the specific distracting domains the user chooses to block to a local blocked page during work hours.
- **storage:** Saves the user's settings (work hours, site toggles) and a salted hash of their bypass password, locally.
- **alarms:** Turns blocking on and off automatically at the start and end of the user's work hours.
- **Host permissions (listed sites):** Required so the redirect rules can apply on the specific sites the extension blocks or modifies. The extension does not request access to all sites.

## Data-use disclosure (Privacy practices tab)
- **Does this item collect or use user data?** The extension stores settings locally via `chrome.storage.sync`; it does **not** collect, transmit, or sell user data.
- For each data-type category (personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity, website content): **Not collected.**
- **Sold or transferred to third parties?** No.
- **Used for purposes unrelated to the single purpose?** No.
- **Used to determine creditworthiness / lending?** No.
- Check all three certification boxes (no unauthorized use, no sale, complies with policy).
- **Privacy policy URL:** `https://github.com/Robj1925/chrome-productivity-blocker/blob/main/PRIVACY.md`

---

## Graphic assets needed
- **Store icon:** 128×128 (use `icons/icon128.png`).
- **Screenshots:** at least one at **1280×800** (or 640×400). Suggested set:
  1. The popup showing "Blocking ON" with the work-hours countdown.
  2. The options page (work hours + site toggles).
  3. A blocked page (e.g. after navigating to a blocked site).
  4. A blanked YouTube or LinkedIn feed during work hours.
- **(Optional) Small promo tile:** 440×280.

## Pre-submit checklist
1. Reload the extension and run the verification steps in the plan.
2. Set a fresh bypass password (the salting change requires re-setting it once).
3. Zip the project folder **excluding** `.git/` and `STORE_LISTING.md`.
4. Upload the zip, fill in the fields above, attach screenshots, submit for review.
