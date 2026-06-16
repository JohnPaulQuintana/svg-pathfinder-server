const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "../uploads");

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function cleanupOldFiles() {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      return;
    }

    const files = fs.readdirSync(UPLOAD_DIR);

    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(UPLOAD_DIR, file);

      const stats = fs.statSync(filePath);

      const age = now - stats.mtimeMs;

      if (age > MAX_AGE_MS) {
        fs.unlinkSync(filePath);

        console.log(`[CLEANUP] Deleted: ${file}`);
      }
    });
  } catch (err) {
    console.error("[CLEANUP ERROR]", err);
  }
}

function startCleanupJob() {
  // Run immediately on startup
  cleanupOldFiles();

  // Run every minutes
  setInterval(cleanupOldFiles, 60 * 1000);

  console.log("[CLEANUP] SVG cleanup job started");
}

module.exports = startCleanupJob;