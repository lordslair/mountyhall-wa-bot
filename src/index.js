const commands = require('./commands');
const logger = require('./logger');
const initBot = require('./bot');
const { removeSingletonLock } = require('./utils/cleanup');


if ( process.env.SCIZ_TOKEN ) {
  SCIZ_TOKEN = process.env.SCIZ_TOKEN
  logger.info("SCIZ_TOKEN ENV var loaded");
}
else {
  logger.error("SCIZ_TOKEN ENV var is not set");
  process.exit(1) 
}

removeSingletonLock(logger)
  .then(() => {
    logger.info('[startup] Cleanup done, proceeding with bot startup.');
    // Start the bot
    initBot(start); // Pass the `start()` function as a callback
  })
  .catch((err) => {
    logger.error(`[startup] Cleanup failed: ${err.message}`);
  });

function start(client) {
  logger.info('Bot is ready');

  client.onMessage(async (msg) => {
    try {
      const command = commands.find(c => c.match(msg));
      if (command) {
        logger.debug(`[match] Command found: ${command.name}`);
        await command.handle({ msg, client, logger });
      } else {
        logger.warning('[message] No matching command');
      }
    } catch (err) {
      logger.error(`[error] ${err.message}`);
    }
  });
}

module.exports = start;