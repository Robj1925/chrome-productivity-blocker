const params = new URLSearchParams(location.search);
const site = params.get("site") || "this site";

document.getElementById("siteName").textContent = `${site} is blocked`;

function fmt12(h, m) {
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function updateCountdown(workEnd) {
  const [eh, em] = workEnd.split(":").map(Number);
  const now = new Date();
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);

  const el = document.getElementById("countdown");
  if (end <= now) {
    el.textContent = "Blocking is currently off.";
    return;
  }
  const diff = end - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  el.textContent = `${h > 0 ? h + "h " : ""}${m}m until ${fmt12(eh, em)}`;
}

chrome.storage.sync.get({ workStart: "09:00", workEnd: "17:00" }, ({ workStart, workEnd }) => {
  const [sh, sm] = workStart.split(":").map(Number);
  const [eh, em] = workEnd.split(":").map(Number);
  document.getElementById("workHours").textContent =
    `Work hours: ${fmt12(sh, sm)} – ${fmt12(eh, em)}`;
  updateCountdown(workEnd);
  setInterval(() => updateCountdown(workEnd), 60000);
});

async function attemptBypass() {
  const input = document.getElementById("passwordInput");
  const errorEl = document.getElementById("errorMsg");
  const password = input.value.trim();

  if (!password) {
    errorEl.textContent = "Enter your bypass password.";
    return;
  }

  const { passwordSalt } = await chrome.storage.sync.get({ passwordSalt: null });
  const hash = await hashPassword(password, passwordSalt);
  errorEl.textContent = "";

  try {
    const res = await chrome.runtime.sendMessage({ type: "REQUEST_BYPASS", hash });
    if (res.success) {
      window.location.href = `https://${site}`;
    } else {
      errorEl.textContent = res.error || "Incorrect password.";
      input.classList.remove("shake");
      void input.offsetWidth;
      input.classList.add("shake");
      input.value = "";
    }
  } catch {
    errorEl.textContent = "Extension error. Try reloading.";
  }
}

document.getElementById("bypassBtn").addEventListener("click", attemptBypass);
document.getElementById("passwordInput").addEventListener("keydown", e => {
  if (e.key === "Enter") attemptBypass();
});
