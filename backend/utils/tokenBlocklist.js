/**
 * In-memory token blocklist for invalidating JWTs on logout.
 * Tokens are auto-purged once they expire to prevent unbounded memory growth.
 */

// Map<token, expiryTimestamp>
const blocklist = new Map();

/**
 * Add a token to the blocklist until its expiry time.
 * @param {string} token - The raw JWT string
 * @param {number} expiresAt - Unix timestamp (seconds) when the token expires
 */
export const blockToken = (token, expiresAt) => {
  blocklist.set(token, expiresAt * 1000); // convert to ms
  scheduleCleanup();
};

/**
 * Check if a token has been blocklisted.
 * @param {string} token
 * @returns {boolean}
 */
export const isTokenBlocked = (token) => {
  if (!blocklist.has(token)) return false;
  // If it's already expired, clean it up and treat as not blocked
  if (Date.now() > blocklist.get(token)) {
    blocklist.delete(token);
    return false;
  }
  return true;
};

// Purge expired tokens every 15 minutes
let cleanupScheduled = false;
const scheduleCleanup = () => {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of blocklist.entries()) {
      if (now > expiry) blocklist.delete(token);
    }
  }, 15 * 60 * 1000);
};
