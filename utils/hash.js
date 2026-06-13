function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function generateSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

// Derive a salted PBKDF2-SHA256 hash (100k iterations) and return it as hex.
async function hashPassword(text, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : new Uint8Array(0);
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(text), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}
