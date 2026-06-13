function fmt12(h, m) {
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function loadStatus() {
  let status;
  try {
    status = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  } catch {
    return;
  }

  const badge = document.getElementById("statusBadge");
  if (status.blockingActive) {
    badge.textContent = "Blocking ON";
    badge.className = "badge badge-on";
  } else {
    badge.textContent = "Blocking OFF";
    badge.className = "badge badge-off";
  }

  const [sh, sm] = status.workStart.split(":").map(Number);
  const [eh, em] = status.workEnd.split(":").map(Number);
  document.getElementById("workHours").textContent = `${fmt12(sh, sm)} – ${fmt12(eh, em)}`;

  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(eh, em, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(sh, sm, 0, 0);

  if (status.blockingActive) {
    const diff = todayEnd.getTime() - now;
    document.getElementById("nextLabel").textContent = "Unblocks in";
    document.getElementById("nextTime").textContent = diff > 0 ? fmtDuration(diff) : "—";
  } else {
    let nextStart = todayStart.getTime();
    if (nextStart <= now) nextStart += 86400000;
    document.getElementById("nextLabel").textContent = "Blocks in";
    document.getElementById("nextTime").textContent = fmtDuration(nextStart - now);
  }

  if (status.bypassUntil && status.bypassUntil > now) {
    document.getElementById("bypassRow").style.display = "block";
    document.getElementById("bypassCountdown").textContent =
      fmtDuration(status.bypassUntil - now) + " remaining";
    document.getElementById("bypassSection").style.display = "none";
  }
}

loadStatus();

async function attemptBypass() {
  const input = document.getElementById("passwordInput");
  const errorEl = document.getElementById("errorMsg");
  const password = input.value.trim();
  if (!password) { errorEl.textContent = "Enter bypass password."; return; }

  const hash = await hashPassword(password);
  try {
    const res = await chrome.runtime.sendMessage({ type: "REQUEST_BYPASS", hash });
    if (res.success) {
      input.value = "";
      errorEl.textContent = "";
      loadStatus();
    } else {
      errorEl.textContent = res.error || "Incorrect password.";
      input.value = "";
    }
  } catch {
    errorEl.textContent = "Connection error.";
  }
}

document.getElementById("bypassBtn").addEventListener("click", attemptBypass);
document.getElementById("passwordInput").addEventListener("keydown", e => {
  if (e.key === "Enter") attemptBypass();
});
document.getElementById("settingsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
