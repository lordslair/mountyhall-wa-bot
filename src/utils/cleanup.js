// utils/cleanup.js
const fs = require('fs/promises');
const path = require('path');

async function removeSingletonLock(logger) {
  const filePath = path.resolve(__dirname, '../tokens/mhSession/SingletonLock');
  try {
    await fs.unlink(filePath);
    logger.info('[startup] SingletonLock removed successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.verbose('[startup] No SingletonLock file to remove (already deleted)');
    } else {
      logger.error(`[startup] Failed to remove SingletonLock: ${error.message}`);
    }
  }
}

module.exports = { removeSingletonLock };
